# YAML and XML projections of the JSON

colregs#131: JSON stays the source; YAML and XML are generated views.

## Recommendation

| Question | Answer |
|---|---|
| YAML emitter | `yaml` (eemeli), `version: '1.1'` quoting, no line folding. |
| XML mapping | W3C XPath 3.1 `fn:json-to-xml`, written by `toXml`. |
| XML schema | Generic `dist/xml/json.xsd`; validate content by reading the XML back to JSON and running the JSON Schema. |
| Per-schema XSD | Not generated until a consumer asks. |
| Packaging | A tarball of `dist/` attached to each release by `publish.yml`; not in the npm package (its ADR is a separate change). |

## YAML


| emitter | emit | size | JSON-equal, 1.2 reader | 1.1 reader | key order kept |
|---|---|---|---|---|---|
| `yaml` 2.9.1, 1.2 quoting | 376 ms | 632 KB | 45 | 36 | 45 |
| `yaml` 2.9.1, 1.1 quoting | 134 ms | 632 KB | 45 | 45 | 45 |
| `js-yaml` 4.1.0 | 343 ms | 632 KB | 45 | 45 | 45 |


## XML


| check | result |
|---|---|
| `fromXml(toXml(x))` equals the source, with key order | 45 of 45 |
| valid against the W3C C.2 schema (libxml2) | 45 of 45 |
| valid against `dist/xml/json.xsd` | 45 of 45 |
| size | 1.2 MB, 257 KB gzipped with the YAML |
| awkward input (control, surrogate, `__proto__`, CR, tab, empty key) | survives, in the test |


## JSON Schema against XSD


| fate | uses | keywords |
|---|---|---|
| maps | 1880 | `type`, `$ref`, `properties`, `required`, `items`, `enum` |
| degrades | 311 | `additionalProperties`, `pattern`, `oneOf`, `allOf`, `anyOf` |
| assert-1.1 | 32 | `minProperties`, `not`, `if`/`then`/`else` |
| lost | 50 | `patternProperties`, `propertyNames`, `unevaluatedProperties` |


## Converters (none run)

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

