# YAML and XML projections of the JSON

colregs#131 rules that JSON stays the single source of truth for `data/`,
`fixtures/` and `schema/`, and that YAML and XML are generated views for
engines in other languages. This is the research pass and the build.
`scripts/project.mjs` writes both views into `dist/` (gitignored);
`test/projection.test.mjs` is the gate. Nothing under `data/` or `schema/`
changed.

## Recommendation

| Question | Answer |
|---|---|
| YAML emitter | `yaml` (eemeli), `version: '1.1'` quoting, no line folding. |
| XML mapping | W3C XPath 3.1 `fn:json-to-xml`, written by `toXml` (about 40 lines). |
| XML schema | The generic `dist/xml/json.xsd`; validate content by reading the XML back to JSON and running the JSON Schema. |
| Per-schema XSD | Not generated until a consumer asks. |
| Packaging | A sibling artefact, a tarball of `dist/` attached to each release by `publish.yml`; not inside the npm package. |

Packaging is a recommendation; its ADR is a separate change. Reasons for the
sibling artefact: a `prepack` step would give a package with no build one;
XML-native consumers are not npm consumers, and a release asset is a URL
pinned to the same tag; the cost of the package is not size (`dist/` is 257 KB
gzipped against a 9.9 MB tarball), it is a second pinned surface. `dist/` stays
out of `package.json` `files`.

## YAML

Run over all 45 source files (`data/` including `data/text/` and `data/i18n/`,
`fixtures/`, `schema/`), emit time for the whole tree:

| emitter | emit | size | JSON-equal read by a 1.2 reader | by a 1.1 reader | key order kept |
|---|---|---|---|---|---|
| `yaml` 2.9.1, 1.2 quoting | 376 ms | 632 KB | 45 | 36 | 45 |
| `yaml` 2.9.1, 1.1 quoting | 134 ms | 632 KB | 45 | 45 | 45 |
| `js-yaml` 4.1.0 | 343 ms | 632 KB | 45 | 45 | 45 |

Nine files hold strings a YAML 1.1 reader turns into booleans or dates
(`yes`, `on`, `y`, `2026-09-16`) when the emitter quotes by the 1.2 rules.
Quoting by the 1.1 rules fixes it and costs no bytes. PyYAML 6.0.3 (1.1)
`safe_load` of the emitted tree equals `json.load` of the source for 45 of 45.
`yaml` has no dependencies and takes a `version` option that sets the quoting;
`js-yaml` 4.1.0 depends on `argparse` and has no such option. PyYAML dump, ruamel.yaml,
go-yaml and `yq` were not run.

The YAML reads back to values identical to the JSON, so a JSON Schema validator
given the parsed YAML returns the verdict it returns for the JSON.

## XML

The mapping is `<map>`, `<array>`, `<string>`, `<number>`, `<boolean>`,
`<null/>` in the `http://www.w3.org/2005/xpath-functions` namespace, a map
member named by its `key` attribute, backslash-escaped text flagged by
`escaped` and `escaped-key` (F&O 3.1 section 17.4.2). The emitter writes
tab, newline and carriage return in attributes as character references so
attribute-value normalisation cannot change a key.

Result for colregs#122, measured on the real tree:

| check | result |
|---|---|
| `fromXml(toXml(x))` equals the source, canonicalised, with key order | 45 of 45 |
| well-formed and valid against the W3C schema (F&O 3.1 C.2, XSD 1.0), libxml2 via `xmllint-wasm` | 45 of 45 |
| valid against `dist/xml/json.xsd` | 45 of 45 |
| size | 1.2 MB, 257 KB gzipped with the YAML |
| awkward input (control characters, lone surrogate, `__proto__` key, CR, tab, empty key) | survives, in the test |

The mapping is lossless on these files. It reads badly, which is the cost the
issue names. `fn:xml-to-json` is the inverse for XSLT and XQuery consumers.

A domain-shaped mapping (an object becomes an element named for its key) does
not work generically here: of 832 distinct object keys in `data/` and
`fixtures/`, 463 are not legal XML element names (`rel:includes`,
`rel:in_lieu_of`, `27(a)(i)`, `light:masthead`). Any such mapping needs the
`key` attribute for those, which is the `fn:json-to-xml` shape.

## What JSON Schema says that XSD cannot

`node scripts/project.mjs --loss` classifies every keyword in the 25 schemas
by its fate in XSD. The classification is a table in the script, written from
the XSD 1.0 and 1.1 specifications; no converter produced it.

| fate | meaning | uses | keywords (uses, schemas holding them) |
|---|---|---|---|
| maps | has an XSD form | 1880 | `type`, `$ref`, `properties`, `required`, `items`, `enum`, `minLength`, `minimum`, `exclusiveMinimum`, `minItems`, `const`, and the annotations |
| degrades | an XSD form that says less | 311 | `additionalProperties: false` (195, 25), `pattern` (78, 19), `additionalProperties` with a schema (15, 4), `oneOf` (14, 11), `allOf` (5, 4), `anyOf` (3, 1), `uniqueItems` (1, 1) |
| assert-1.1 | only an XSD 1.1 XPath assertion | 32 | `minProperties` (17, 7), `not` (5, 2), `if`/`then`/`else` (4+4+2, 2) |
| lost | no XSD form | 50 | `patternProperties` (41, 14), `propertyNames` (8, 2), `unevaluatedProperties` (1, 1) |

Why each degrades:

- `oneOf` and `anyOf` become `xs:choice`, which picks among element names. A
  choice between two shapes under one name violates Unique Particle
  Attribution. Under `fn:json-to-xml` every member is `<map key=...>`, so the
  branches cannot be told apart by element name at all.
- `additionalProperties: false` closes a content model only when the
  properties are element names. Under `fn:json-to-xml` the keys are attribute
  values, which XSD 1.0 cannot constrain by context.
- `pattern` is ECMA-262 in JSON Schema and an implicitly anchored, smaller
  dialect in XSD (no lookaround, no backreferences).
- `patternProperties` and `propertyNames` constrain key names; an XSD element
  name is fixed.

So a per-schema XSD over the `fn:json-to-xml` shape checks structure and
scalar types, and drops the constraints that carry the model: closed objects,
variants, key patterns. The check that holds is the one the round trip makes
possible: convert the XML back to JSON, then validate with the schema in
`schema/`.

## Converters surveyed

None was run; this is the catalogue from their documentation and from npm.

| tool | form | note |
|---|---|---|
| ethlo/jsons2xsd | Java, command line, open source | options include `--wrapArrays`, `--validate`, root element |
| Altova RaptorXML `jsonschema2xsd` | commercial command line | targets XSD 1.0 and 1.1 |
| Liquid Studio, JSON Schema to XSD wizard | commercial GUI | |
| npm | none | a search for JSON Schema to XSD finds validators and the reverse direction only |

Whether any of them maps `oneOf` or `additionalProperties` better than the
table above is open until one is run over `schema/`. The recommendation does
not depend on it: the XML view carries data, and JSON Schema validates it.

## Reproduce

```
npm ci
node scripts/project.mjs          # dist/yaml, dist/xml, dist/xml/json.xsd
node scripts/project.mjs --loss   # the keyword table and the key-name count
node --test test/projection.test.mjs
```

Validation against the W3C schema and the PyYAML read used `xmllint-wasm` and
PyYAML outside the repository; neither is a dependency.
