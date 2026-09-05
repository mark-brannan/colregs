# ADR 0006 — JSON Schema for structural validation, identifier diff for version discipline

Date: 2026-09-04
Status: accepted

## Context

`test/data.test.mjs` is the entire verification surface. It enforces
referential integrity exhaustively — every cite resolves to `rules.json`,
every light id to `lights.json`, every fact key to `facts.json`, every
cross-reference to an entry — and it runs the fixture replay and drift
test (REQ-VERIFY-1/2). What it does not check is *shape*: a misspelled
key (`modaltiy`), a `count` given as a string, an unexpected top-level
field, or a malformed `{gte, lt}` predicate all pass silently until some
consumer trips on them.

The package exists to be consumed without a JavaScript runtime
(REQ-PKG-2). A consumer in Python or Rust cannot run the Node suite. It
has no machine-readable statement of what a well-formed entry looks like;
today that lives in prose in README.md and in the tests.

A third question was raised at the same time: whether semantic versioning
could be derived from a schema, so that a breaking change is detected
mechanically rather than by the committer choosing a conventional-commit
prefix.

Alternatives considered and declined:

- **CUE, TypeSpec, JSON-LD/SHACL.** Each can express more than JSON Schema
  (CUE in particular can state cross-file constraints). None has a
  validator a consumer of this package already runs, and each adds a
  toolchain to a repo whose contract is "plain JSON, nothing else". The
  extra expressiveness would only re-encode checks the test suite already
  performs.
- **Schema-derived semver** (`json-schema-diff` or equivalent in CI).
  REQ-PKG-4 defines a breaking change as removal of an entry id, a fact
  vocabulary value, or a change in relation semantics. All three are data
  changes that leave the schema untouched. A schema diff would therefore
  miss nearly every real break and flag only the rare structural one.
- **Generating enums from data into the schema at test time.** Keeps the
  schema "complete" but makes it a build product rather than a document,
  and duplicates checks the suite already does. Declined; the schema
  stays static and hand-written.

## Decision

**Ship hand-written JSON Schema 2020-12**, one schema per data file plus
one for `fixtures/applicability-fixtures.json`, under `schema/`, listed in
`package.json` `files` so consumers get it with the data.

The schema covers **structure only**: required keys, types,
`additionalProperties: false` at every object level, the id patterns from
`docs/identifiers.md`, the closed enums for `modality` and the five
relation verbs, the shape of predicate operators (`gte`/`gt`/`lte`/`lt`,
list membership, equality), and the shape of a light reference
(`light`/`position`/`count`).

The schema does **not** attempt cross-file references. Cite-to-rule,
light-to-definition, fact-to-vocabulary and entry-to-entry resolution
stay in `test/data.test.mjs`. JSON Schema has no cross-document
reference mechanism; a partial imitation would be a second, weaker copy
of checks that already exist.

**Validate in the suite with Ajv as a devDependency.** REQ-PKG-1 (zero
runtime dependencies) governs what ships, not what tests. The published
package stays dependency-free.

**Version discipline comes from an identifier diff, not the schema.** A
test extracts every published identifier — entry ids, fact axis values,
light ids, relation verbs — from the last release tag (or the published
npm tarball) and compares them with HEAD. Any removal not accompanied by
a deprecation marker fails the build. This mechanises REQ-MODEL-10 and
the "removal is major" clause of REQ-PKG-4. release-please still owns
the version number; the test only refuses to let a silent removal reach
it.

## Consequences

- A new file under `data/` needs a schema before it can merge, and the
  schema needs a test that loads it. Schema and data change together.
- `additionalProperties: false` means an experimental key in an entry
  fails the build until the schema admits it. That is intended: the
  schema is the record of what the shape is, and a key nobody wrote down
  is a key nobody will maintain.
- Consumers in other languages can validate a vendored copy of the data
  against `schema/` with any 2020-12 validator. The schema is now part of
  the public contract and is subject to REQ-PKG-4: removing a property or
  narrowing a type is a major version.
- The identifier-diff test needs the previous release available at test
  time. In CI that is a `git fetch --tags`; locally it is whatever tag is
  present. A missing baseline must fail loudly, not skip.
- If a future jurisdiction or Part D landing needs a constraint that
  spans files — "every `us/inland` entry overrides an `intl` id that
  exists" — it goes in the test suite, not the schema. This ADR is the
  answer to the next "should we use CUE" question.
