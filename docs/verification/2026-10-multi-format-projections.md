# YAML and XML projections of the JSON

colregs#131: JSON stays the source; YAML and XML are generated views.
`scripts/project.mjs` writes `dist/` (gitignored); `test/projection.test.mjs` gates it.

## Recommendation

| Question | Answer |
|---|---|
| YAML emitter | `yaml` (eemeli), `version: '1.1'` quoting, no line folding. |
| XML mapping | W3C XPath 3.1 `fn:json-to-xml`, written by `toXml`. |
| XML schema | Generic `dist/xml/json.xsd`; validate content by reading the XML back to JSON and running the JSON Schema. |
| Per-schema XSD | Not generated until a consumer asks. |
| Packaging | A tarball of `dist/` attached to each release by `publish.yml`; not in the npm package (its ADR is a separate change). |

## YAML

All 45 source files, whole tree:

| emitter | emit | size | JSON-equal, 1.2 reader | 1.1 reader | key order kept |
|---|---|---|---|---|---|
| `yaml` 2.9.1, 1.2 quoting | 376 ms | 632 KB | 45 | 36 | 45 |
| `yaml` 2.9.1, 1.1 quoting | 134 ms | 632 KB | 45 | 45 | 45 |
| `js-yaml` 4.1.0 | 343 ms | 632 KB | 45 | 45 | 45 |

PyYAML 6.0.3 `safe_load` of the 1.1-quoted tree equals the source for 45 of 45.
`yaml` has no dependencies; `js-yaml` needs `argparse`.

## XML

Result for colregs#122, measured on the real tree:

| check | result |
|---|---|
| `fromXml(toXml(x))` equals the source, with key order | 45 of 45 |
| valid against the W3C C.2 schema (libxml2) | 45 of 45 |
| valid against `dist/xml/json.xsd` | 45 of 45 |
| size | 1.2 MB, 257 KB gzipped with the YAML |
| awkward input (control, surrogate, `__proto__`, CR, tab, empty key) | survives, in the test |

Of 832 distinct object keys, 463 are not legal element names (`rel:includes`, `27(a)(i)`), so a key-named mapping needs the `key` attribute anyway.

## JSON Schema against XSD

`node scripts/project.mjs --loss` classifies every keyword in the 25 schemas.

| fate | uses | keywords |
|---|---|---|
| maps | 1880 | `type`, `$ref`, `properties`, `required`, `items`, `enum` |
| degrades | 311 | `additionalProperties`, `pattern`, `oneOf`, `allOf`, `anyOf` |
| assert-1.1 | 32 | `minProperties`, `not`, `if`/`then`/`else` |
| lost | 50 | `patternProperties`, `propertyNames`, `unevaluatedProperties` |

An XSD would drop closed objects, variants and key patterns.

## Converters (catalogue, none run)

| tool | form |
|---|---|
| ethlo/jsons2xsd | Java, open source |
| Altova RaptorXML `jsonschema2xsd` | commercial |
| Liquid Studio | commercial GUI |
| npm | none |

## Reproduce

```
npm ci
node scripts/project.mjs          # dist/yaml, dist/xml, dist/xml/json.xsd
node scripts/project.mjs --loss   # keyword table and key-name count
node --test test/projection.test.mjs
```

The W3C-schema and PyYAML checks used `xmllint-wasm` and PyYAML outside the repository.
