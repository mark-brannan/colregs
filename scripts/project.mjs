#!/usr/bin/env node
// Generated projections of the JSON source of truth: YAML and XML views of
// data/, fixtures/ and schema/. JSON is authored; these are never edited and
// never committed (dist/ is gitignored). Argued in
// docs/verification/2026-10-multi-format-projections.md.
//
//   node scripts/project.mjs            write dist/yaml and dist/xml
//   node scripts/project.mjs --out DIR  write them under DIR instead
//   node scripts/project.mjs --loss     print what XSD cannot express of schema/

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const here = fileURLToPath(import.meta.url);
export const root = fileURLToPath(new URL('../', import.meta.url));
export const SOURCES = ['data', 'fixtures', 'schema'];
export const XPF = 'http://www.w3.org/2005/xpath-functions';

export function sourceFiles(base = root) {
  const out = [];
  const walk = (rel) => {
    for (const e of readdirSync(join(base, rel), { withFileTypes: true })) {
      const p = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.json')) out.push(p);
    }
  };
  for (const d of SOURCES) walk(d);
  return out.sort();
}

// Canonical form: object keys sorted, then JSON.stringify. Two values are the
// same document exactly when their canonical strings are equal.
const sorted = (v) =>
  Array.isArray(v)
    ? v.map(sorted)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, sorted(v[k])]),
        )
      : v;
export const canonical = (v) => JSON.stringify(sorted(v));

// YAML. Quoting follows the 1.1 rules, which are a superset of the 1.2 ones, so
// `yes`, `on`, `y` and date-shaped strings stay strings for a 1.1 reader too.
export const toYaml = (v) => YAML.stringify(v, { lineWidth: 0, version: '1.1' });
export const fromYaml = (s) => YAML.parse(s);

// XML: the W3C XPath 3.1 fn:json-to-xml mapping (F&O 3.1 section 17.4).
const BAD =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#13;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;').replace(/\t/g, '&#9;').replace(/\n/g, '&#10;');
const backslash = (s) =>
  JSON.stringify(s)
    .slice(1, -1)
    .replace(/[￾￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16)}`);

function node(v, key, depth) {
  const pad = '\n' + '  '.repeat(depth);
  let a = '';
  if (key !== undefined) {
    const bad = BAD.test(key);
    a = ` key="${escAttr(bad ? backslash(key) : key)}"${bad ? ' escaped-key="true"' : ''}`;
  }
  if (v === null) return `<null${a}/>`;
  if (typeof v === 'boolean') return `<boolean${a}>${v}</boolean>`;
  if (typeof v === 'number') return `<number${a}>${JSON.stringify(v)}</number>`;
  if (typeof v === 'string') {
    const bad = BAD.test(v);
    return `<string${a}${bad ? ' escaped="true"' : ''}>${esc(bad ? backslash(v) : v)}</string>`;
  }
  const inner = Array.isArray(v)
    ? v.map((x) => pad + '  ' + node(x, undefined, depth + 1))
    : Object.entries(v).map(([k, x]) => pad + '  ' + node(x, k, depth + 1));
  const name = Array.isArray(v) ? 'array' : 'map';
  return inner.length ? `<${name}${a}>${inner.join('')}${pad}</${name}>` : `<${name}${a}/>`;
}
export const toXml = (v) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n${node(v, undefined, 0).replace(/^<(\w+)/, `<$1 xmlns="${XPF}"`)}\n`;

const TOKEN = /<(\/?)([a-z]+)((?:\s+[a-z-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;
const ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unesc = (s) =>
  s.replace(
    /&(#x[0-9a-fA-F]+|#\d+|\w+);/g,
    (_, e) => ENTITY[e] ?? String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))),
  );
const unbackslash = (s) => JSON.parse(`"${s}"`);

// The inverse, for the subset toXml writes (fn:xml-to-json on our own output).
export function fromXml(xml) {
  const stack = [];
  let result;
  const close = (f) => {
    const text = f.text;
    let v;
    if (f.name === 'null') v = null;
    else if (f.name === 'boolean') v = text === 'true';
    else if (f.name === 'number') v = Number(text);
    else if (f.name === 'string') v = f.escaped ? unbackslash(unesc(text)) : unesc(text);
    else if (f.name === 'array') v = f.items;
    else if (f.name === 'map') v = Object.fromEntries(f.items);
    else throw new Error(`unexpected element <${f.name}>`);
    const parent = stack[stack.length - 1];
    if (!parent) result = v;
    else if (parent.name === 'map') parent.items.push([f.key, v]);
    else parent.items.push(v);
  };
  for (const m of xml.replace(/^<\?xml[^>]*\?>/, '').matchAll(TOKEN)) {
    const [, closing, name, attrs, selfClosing, text] = m;
    if (text !== undefined) {
      const top = stack[stack.length - 1];
      if (top && top.name !== 'map' && top.name !== 'array') top.text += text;
      else if (text.trim()) throw new Error(`text outside a string: ${text.trim().slice(0, 20)}`);
    } else if (closing) close(stack.pop());
    else {
      const at = Object.fromEntries([...attrs.matchAll(/([a-z-]+)="([^"]*)"/g)].map(([, k, x]) => [k, unesc(x)]));
      const key = at.key === undefined ? undefined : at['escaped-key'] === 'true' ? unbackslash(at.key) : at.key;
      const f = { name, key, escaped: at.escaped === 'true', text: '', items: [] };
      if (selfClosing) {
        stack.push(f);
        close(stack.pop());
      } else stack.push(f);
    }
  }
  return result;
}

// A schema for the vocabulary toXml writes: structure only. What a JSON Schema
// adds beyond structure does not come across (see the report).
export const XSD = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:j="${XPF}" targetNamespace="${XPF}" elementFormDefault="qualified">
  <xs:group name="value">
    <xs:choice>
      <xs:element ref="j:map"/><xs:element ref="j:array"/><xs:element ref="j:string"/>
      <xs:element ref="j:number"/><xs:element ref="j:boolean"/><xs:element ref="j:null"/>
    </xs:choice>
  </xs:group>
  <xs:attributeGroup name="member">
    <xs:attribute name="key" type="xs:string"/>
    <xs:attribute name="escaped-key" type="xs:boolean" default="false"/>
  </xs:attributeGroup>
  <xs:element name="map">
    <xs:complexType><xs:group ref="j:value" minOccurs="0" maxOccurs="unbounded"/><xs:attributeGroup ref="j:member"/></xs:complexType>
  </xs:element>
  <xs:element name="array">
    <xs:complexType><xs:group ref="j:value" minOccurs="0" maxOccurs="unbounded"/><xs:attributeGroup ref="j:member"/></xs:complexType>
  </xs:element>
  <xs:element name="string">
    <xs:complexType><xs:simpleContent><xs:extension base="xs:string">
      <xs:attribute name="escaped" type="xs:boolean" default="false"/><xs:attributeGroup ref="j:member"/>
    </xs:extension></xs:simpleContent></xs:complexType>
  </xs:element>
  <xs:element name="number">
    <xs:complexType><xs:simpleContent><xs:extension base="xs:double"><xs:attributeGroup ref="j:member"/></xs:extension></xs:simpleContent></xs:complexType>
  </xs:element>
  <xs:element name="boolean">
    <xs:complexType><xs:simpleContent><xs:extension base="xs:boolean"><xs:attributeGroup ref="j:member"/></xs:extension></xs:simpleContent></xs:complexType>
  </xs:element>
  <xs:element name="null">
    <xs:complexType><xs:attributeGroup ref="j:member"/></xs:complexType>
  </xs:element>
</xs:schema>
`;

export function project(out = join(root, 'dist'), base = root) {
  const written = [];
  const put = (path, text) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
    written.push(path);
  };
  rmSync(join(out, 'yaml'), { recursive: true, force: true });
  rmSync(join(out, 'xml'), { recursive: true, force: true });
  for (const f of sourceFiles(base)) {
    const v = JSON.parse(readFileSync(join(base, f), 'utf8'));
    put(join(out, 'yaml', f.replace(/\.json$/, '.yaml')), toYaml(v));
    put(join(out, 'xml', f.replace(/\.json$/, '.xml')), toXml(v));
  }
  put(join(out, 'xml', 'json.xsd'), XSD);
  return written;
}

// What XSD does to each JSON Schema keyword. maps: has an XSD form. degrades:
// an XSD form exists but it says less or says it differently. assert-1.1: only
// an XSD 1.1 xs:assert (XPath) says it. lost: no XSD form.
const FATE = {
  maps: 'type properties required items enum const minimum maximum exclusiveMinimum exclusiveMaximum minLength maxLength minItems maxItems $ref $defs definitions description title $comment default examples deprecated $schema $id',
  degrades:
    'oneOf anyOf allOf pattern format uniqueItems additionalProperties:false additionalProperties:true additionalProperties:schema',
  'assert-1.1': 'if then else dependentRequired dependentSchemas not contains minProperties maxProperties',
  lost: 'patternProperties propertyNames prefixItems unevaluatedProperties unevaluatedItems',
};
const fateOf = Object.fromEntries(Object.entries(FATE).flatMap(([f, ks]) => ks.split(' ').map((k) => [k, f])));
const NAMED = new Set(['properties', '$defs', 'definitions', 'patternProperties', 'dependentSchemas']);
const DATA = new Set(['enum', 'const', 'examples', 'default', 'required', 'dependentRequired']);

function keywords(schema, hit) {
  if (!schema || typeof schema !== 'object') return;
  if (Array.isArray(schema)) return schema.forEach((s) => keywords(s, hit));
  for (const [k, v] of Object.entries(schema)) {
    if (k === 'additionalProperties') hit(`additionalProperties:${typeof v === 'boolean' ? v : 'schema'}`);
    else hit(k);
    if (DATA.has(k)) continue;
    if (NAMED.has(k)) Object.values(v).forEach((s) => keywords(s, hit));
    else keywords(v, hit);
  }
}

export function loss(base = root) {
  const uses = {};
  const files = sourceFiles(base).filter((f) => f.startsWith('schema/'));
  for (const f of files) {
    keywords(JSON.parse(readFileSync(join(base, f), 'utf8')), (k) => {
      (uses[k] ??= {})[f] = (uses[k][f] ?? 0) + 1;
    });
  }
  const rows = Object.entries(uses)
    .map(([k, by]) => ({
      k,
      fate: fateOf[k] ?? 'unclassified',
      n: Object.values(by).reduce((a, b) => a + b, 0),
      files: Object.keys(by).length,
    }))
    .sort((a, b) => a.fate.localeCompare(b.fate) || b.n - a.n);
  const lines = [`${files.length} schemas`, '', '| keyword | fate under XSD | uses | schemas |', '|---|---|---|---|'];
  for (const r of rows) lines.push(`| ${r.k} | ${r.fate} | ${r.n} | ${r.files} |`);
  const totals = {};
  for (const r of rows) totals[r.fate] = (totals[r.fate] ?? 0) + r.n;
  lines.push(
    '',
    `uses by fate: ${Object.entries(totals)
      .map(([f, n]) => `${f} ${n}`)
      .join(', ')}`,
  );
  const keys = new Set();
  const collect = (v) => {
    if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object')
      for (const [k, x] of Object.entries(v)) {
        keys.add(k);
        collect(x);
      }
  };
  for (const f of sourceFiles(base).filter((x) => !x.startsWith('schema/')))
    collect(JSON.parse(readFileSync(join(base, f), 'utf8')));
  const bad = [...keys].filter((k) => !/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(k));
  lines.push(
    `object keys in data/ and fixtures/: ${keys.size} distinct, ${bad.length} not legal XML element names (ASCII NCName); e.g. ${bad
      .slice(0, 6)
      .map((k) => JSON.stringify(k))
      .join(' ')}`,
  );
  return lines.join('\n');
}

if (process.argv[1] === here) {
  const arg = process.argv.slice(2);
  if (arg.includes('--loss')) console.log(loss());
  else {
    const i = arg.indexOf('--out');
    const written = project(i >= 0 ? arg[i + 1] : join(root, 'dist'));
    console.log(`wrote ${written.length} files`);
  }
}
