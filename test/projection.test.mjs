import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import YAML from 'yaml';
import { canonical, fromXml, fromYaml, project, root, sourceFiles, toXml, toYaml, XPF } from '../scripts/project.mjs';

// The YAML and XML views are generated from the JSON, never authored. The
// gate is the inverse: reading a view back must give the source document.

const files = sourceFiles();
const read = (f) => JSON.parse(readFileSync(join(root, f), 'utf8'));

test('projection: the sources are found (data, fixtures, schema)', () => {
  for (const d of ['data/', 'fixtures/', 'schema/'])
    assert.ok(
      files.some((f) => f.startsWith(d)),
      `no JSON under ${d}`,
    );
});

for (const f of files) {
  test(`projection: YAML of ${f} reads back to the source`, () => {
    const v = read(f);
    const y = toYaml(v);
    assert.equal(canonical(fromYaml(y)), canonical(v));
    assert.equal(JSON.stringify(fromYaml(y)), JSON.stringify(v), 'key order');
    assert.equal(canonical(YAML.parse(y, { version: '1.1' })), canonical(v), 'a YAML 1.1 reader');
  });
  test(`projection: XML of ${f} reads back to the source`, () => {
    const v = read(f);
    const x = toXml(v);
    assert.equal(canonical(fromXml(x)), canonical(v));
    assert.equal(JSON.stringify(fromXml(x)), JSON.stringify(v), 'key order');
  });
}

test('projection: XML matches the F&O 3.1 section 17.4.2 shape', () => {
  const x = toXml({ a: 'x', n: 322, b: true, z: null, l: [{ to: 'Paris' }], e: {}, s: [] });
  const flat = x.replace(/>\s+</g, '><');
  assert.equal(
    flat,
    `<?xml version="1.0" encoding="UTF-8"?><map xmlns="${XPF}"><string key="a">x</string><number key="n">322</number><boolean key="b">true</boolean><null key="z"/><array key="l"><map><string key="to">Paris</string></map></array><map key="e"/><array key="s"/></map>\n`,
  );
});

test('projection: awkward strings and keys survive both views', () => {
  const v = {
    'k\ney\t"q"': 'line\r\nbreak\ttab & <tag> "quote"',
    '': '',
    'ctl\u0001': 'a\u0001b\\n',
    lone: 'x\uD800y',
    '27(a)(i)': ['yes', 'on', '2026-09-16', '0x1F', '1e3', '~', 'null', 'y'],
    ['__proto__']: { a: 1 },
    big: [1e21, -0.5, 1e-7, 0],
  };
  assert.equal(canonical(fromXml(toXml(v))), canonical(v));
  assert.equal(canonical(fromYaml(toYaml(v))), canonical(v));
  assert.equal(canonical(YAML.parse(toYaml(v), { version: '1.1' })), canonical(v));
});

test('projection: project() writes a YAML and an XML file per source, plus the XSD', () => {
  const out = mkdtempSync(join(tmpdir(), 'colregs-projection-'));
  try {
    const written = project(out);
    assert.equal(written.length, 2 * files.length + 1);
    assert.ok(written.includes(join(out, 'xml', 'json.xsd')));
    assert.ok(written.includes(join(out, 'yaml', 'data', 'rules.yaml')));
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('projection: dist/ is gitignored, never committed', () => {
  assert.match(readFileSync(join(root, '.gitignore'), 'utf8'), /^dist\/?$/m);
});
