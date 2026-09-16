# ADR 0014 — The engine interface is colregs' to own: an operations manifest and result schemas

Date: 2026-09-16
Status: proposed. Solace ordered options 2 and 3 built on 2026-09-16; the
register marks what settles each row.

## Context

ADR 0011 and ADR 0012 fix the engine's verbs and result envelopes, in prose
and TypeScript blocks, in this repository. The only machine-readable copy
lives in colregs-engine's `src/types.ts`, so the interface is de facto
colregs-owned and de jure the engine's: a second engine, in any language,
would transcribe the ADRs by hand and drift the way the engine's own
generator was written to stop.

colregs already owns *shapes* in production: the engine compiles every
`schema/*.schema.json` into generated types and derives `FactRecord` and
`Situation` from `data/facts.json`. What it does not own is the *operations*
— which verb reads which input and answers which envelope — and the fixture
files bind to verbs only by convention.

Ten routes were surveyed on 2026-09-16 for making the interface a colregs
artefact, the Java sense of interface against implementation:

| # | route | what it gives, what it costs |
|---|---|---|
| 1 | result schemas only, verbs stay prose | shapes checkable, operations still hand-read |
| 2 | **operations manifest**: verb → inputs → result → companion, in JSON | language-neutral; any engine derives its own binding |
| 3 | **fixtures bound to verbs** in the manifest | the conformance replay becomes the behavioural contract |
| 4 | hand-written `.d.ts` in colregs | TypeScript-only; the transcription the engine's generator exists to avoid |
| 5 | `x-operation` keywords inside the existing schemas | option 2 spread over eleven files |
| 6 | OpenAPI / AsyncAPI | a projection generable *from* 2, not a source |
| 7 | Protobuf / Smithy | model operations natively; a toolchain a data-only package does not have |
| 8 | TypeSpec | one source projecting JSON Schema and OpenAPI; same toolchain cost |
| 9 | a separate `colregs-api` package | a third release train for two files |
| 10 | status quo | the drift above |

## Decision

1. **`data/operations.json` is the interface.** One operation per verb ADR
   0011 and ADR 0012 name, each with positional `inputs` (name and schema),
   an `output` schema, the entry-id `companion` verb where one exists, and
   the `fixtures` that exercise it. `schema/operations.schema.json` checks
   its shape; `test/data.test.mjs` checks that every reference resolves.
2. **Result envelopes are schemas under `schema/`:** `display-evaluation`,
   `encounter-evaluation`, `conduct-evaluation`, `rule2-departure-finding`,
   transcribed from the engine's `src/types.ts` at colregs-engine 0.1.5.
   JSON-Schema-expressible only: `Record<EntryId, Modality>` becomes
   `patternProperties`, the `EntryId` and `ParagraphCite` aliases become
   `$defs`, the two deprecated camelCase aliases are marked `deprecated` and
   optional. From here the direction reverses: an envelope changes in colregs
   first and the engine follows.
3. **Inputs get schemas too:** `fact-record`, `situation`, `trace`,
   `rule2-departure-model`. The first two state the case shape the fixture
   schemas already carry; the fixture schemas keep their inline copy, and the
   tests validate every bound fixture case against the verb's input schema,
   so the copies cannot disagree unnoticed.
4. **Schema files compose by `$ref`,** relative to their `$id`
   (`applicability.schema.json#/$defs/entryId`). ADR 0006's "no cross-file
   references" is about data references — cite to `rules.json` — which stay in
   the tests; a `$ref` between two schema files is one shape reused, not a
   data reference. The suite registers every schema by `$id` before compiling.
5. **A fixture file is bound to a verb** by `fixtures[].file` and
   `case_input`: the case's input under that key, the companion's answer under
   `expect`. Every file under `fixtures/` must be bound; `evaluateConduct` and
   `evaluateRule2Departure` bind nothing yet, and say so with an empty list.
6. **Not in the manifest:** trailing options a binding accepts (`opts.data`),
   which verbs are built, and what a verb throws. Build status is ADR 0011's
   and ADR 0012's tables; errors are the binding's.

## Consequences

- Nine new files under `schema/`. The engine's `generate-schema-types.ts`
  throws on any schema its `ROOT_NAMES` does not list, so the next colregs
  bump fails its build until the follow-up lands: emit
  `interface ColregsEngine` from `operations.json`, `satisfies ColregsEngine`
  at the engine's root, and settle the `fact-record.ts` / `situation.ts`
  collision with the types it derives from `facts.json` today.
- A YAML rendering of the manifest is lossless; XML is a generated view (JSON
  Schema to XSD). Authoring the interface in TypeScript first is the one route
  that forecloses both.
- The 2026-09-16 hand-off named the finding's schema `rule2-departure`; it
  lands as `rule2-departure-finding` beside `rule2-departure-model`, since
  the verb has two shapes to name.

## Register

| item | level | what would settle it |
|---|---|---|
| Options 2 and 3, not 1 or 4–10 | ✎ | this ADR accepted |
| Manifest shape: positional `inputs`, `output`, `companion`, `fixtures[].case_input` | ✎ | the engine generator consuming it |
| Envelope schemas transcribed from `types.ts`, envelope changes land here first | ✎ | the first envelope change after the follow-up |
| Cross-file `$ref` between schema files | ✎ | a consumer whose validator cannot register a schema set |
| Deprecated aliases optional in the schema, required in the engine | ✎ | the engine dropping them |
| `opts` and thrown errors stay out of the manifest | ✎ | a second binding needing either |
