# ADR 0023 — The engine's surface is the manifest: six operations, one per thing, nothing beside them

Date: 2026-09-17; reframed as a proposal 2026-09-18
Status: proposal, not a ruling. Nothing below has been ruled. It is an AI
agent's suggestion, in the agent's own voice — not the maintainer's words
and not the maintainer's decision — held open for a tentative decision
alongside the other design ADRs of the same week, ADR 0022 (#187) and ADR
0026 (#195), which are expected to be rewritten together, merged or
discarded. It lives under `docs/adr/proposals/` for that reason: an ADR in
`docs/adr/` is a decision the family may rely on, and this is not one yet.
It keeps the number 0023, because other work already cites it by number.

Nothing settled moves with it. `AGENTS.md`, `data/operations.json`, the
schemas under `schema/` and ADR 0011, 0012 and 0014 are untouched and stay
that way until this is ruled — a proposal that edits the record it wants to
change has already decided itself. The changes §"Consequences" describes are
what would follow a ruling, in their own PRs. One row reopens ink already
laid by ADR 0011; that row is the maintainer's call and no agent's, marked
as such in the register.

## Context

colregs-engine's root (`src/index.ts`) grew one verb at a time and reads
like it: five verbs, three `applied*Entries` companions, validators for two
of the five inputs, two error classes of which one is thrown by nothing,
and one verb named for a rule number where every other names a thing. The
manifest (`data/operations.json`, ADR 0014) names four of the five verbs
and nothing else on the root. colregs-engine#111 asks for one shape a
consumer can predict, and #105 is about to build `reduceTraffic` and
`evaluateScene` against whatever that shape is, so it is fixed here first.

### Inventory of the root, colregs-engine 0.1.7

| export | consumers | register line |
|---|---|---|
| `evaluateDisplay`, `DisplayEvaluation`, `Display`, `DisplayLight`, `EvaluationProvenance`, `EvaluateOptions.data` | searoom, colregs-mcp | 0011 row 2, ink |
| `appliedDisplayEntries` | colregs-mcp | 0011 row 2, ink |
| `evaluateEncounter`, `EncounterEvaluation`, `SubjectRole` | colregs-mcp | 0011 §1 ink (one verb per input); the name ✎ |
| `appliedEncounterEntries` | colregs-mcp | 0011 ✎ |
| `Situation`, `Subject`, `Pair`, `FactRecord` | colregs-mcp; searoom (`FactRecord`) | 0011 §2–3 ink |
| `evaluateConduct`, `appliedConductEntries`, `Trace`, `TraceSample`, `ConductEvaluation`, `ConductVerdict`, `ConductPhaseChange` | colregs-mcp | 0012 ✎ |
| `evaluateRule2Departure`, `Rule2DepartureModel`, `Rule2DepartureFinding`, `Rule2DepartureAdvisory`, `Rule2DepartureRegion`, `Rule2DepartureStatus`, `SolverParameters` | colregs-mcp | 0012 ✎; the status alphabet 0005 §5 |
| `reduceTraffic`, `evaluateScene`, `Scene`, `SceneEvaluation`, `SceneConflict`, `TrafficFacts`, `TrafficSector`, `TrafficSectorFacts` | none | colregs-engine `docs/decisions.md` 2026-09-16 (#82); no ADR |
| `validateSituation`, `validateTrace` | none | none |
| `NotImplementedError` | colregs-mcp catches it; no verb throws it | none |
| `DataVersionMismatchError`, `EvaluateOptions.dataVersion` | searoom passes `dataVersion` | 0009 |
| `EvaluateOptions.jurisdiction` | searoom | 0018 |
| `RuleId`, `ParagraphCite`, `EffectRole`, `Modality`, `RuleCategory`, `RepresentedParagraph` | searoom (`Modality`) | 0011 §4 ✎; 0015; 0005 |
| `colregs-engine/schema`: 8 data roots, 8 namespaces, 19 aliases, `ColregsEngine` | searoom reads 15 of them | 0011 consequences; out of scope here |

Three facts the decision rests on, each read in the engine's source: every
companion returns the list its verb's envelope carries as `applied`, from
the same call; no verb throws `NotImplementedError`; and `Situation.traffic`,
which #82 ruled, fails `schema/situation.schema.json`, which admits `self`,
`other` and `pair` only.

## What is proposed

1. **The root is the manifest.** Every runtime export of `colregs-engine`
   is an operation in `data/operations.json`, plus `DataVersionMismatchError`
   and the types the operations' inputs and answers are written in. Nothing
   else: no validator (every operation validates its own input and throws,
   and ADR 0014 §6 keeps what it throws out of the interface), no error
   class nothing throws, no second way to get an answer an envelope already
   carries.

2. **Six operations, one per thing.** Five evaluate a thing colregs names
   and answer an envelope. One derives an input class, the way `facts.json`
   `derived` facts are derived, and is named for what it does.

   | thing | inputs | operation | answer |
   |---|---|---|---|
   | display | `FactRecord` | `evaluateDisplay` | `DisplayEvaluation` |
   | encounter | `Situation` | `evaluateEncounter` | `EncounterEvaluation` |
   | conduct | `Trace` | `evaluateConduct` | `ConductEvaluation` |
   | departure | `Situation`, `DepartureModel` | `evaluateDeparture` | `DepartureFinding` |
   | scene | `Scene` | `evaluateScene` | `SceneEvaluation` |
   | traffic | `Subject`, `Subject[]` | `reduceTraffic` | `TrafficFacts` |

   `departure` is ADR 0005 §5's own word for the Rule 2 region
   (`R1 departure-required-in-model`); the rule number was the one name in
   the table that is not a thing colregs names. `Finding` stays: the verb
   reports what a named grid found, not what the Rules say, which is why
   ADR 0012 §4 chose the word. Every binding takes its options bag last
   (`data`, `dataVersion`, `jurisdiction`), `reduceTraffic` included, since
   the sector boundaries it reads are data.

3. **No companions.** `appliedDisplayEntries`, `appliedEncounterEntries`
   and `appliedConductEntries` go, and the manifest's `companion` slot with
   them. The fixture contract is the envelope's `applied`: a binding names
   the schema of a case's `expect`, and a replay compares `expect` to the
   answer's `applied` unless the fixture file says otherwise. Five verbs had
   three companions, and the two without could not have had one: a
   finding's entries are its `rules.applied`, a scene's are one list per
   pair.

4. **`Scene.self`, not `own`.** ADR 0011 §3 names the subject `self`, and
   colregs renamed `own` to `self` across the situation record on
   2026-09-16 (`docs/decisions.md`). `reduceTraffic(self, others, opts?)`
   follows.

5. **The traffic class enters colregs.** `situation.schema.json` would
   admit `traffic`; `traffic-facts.schema.json` would transcribe
   `TrafficFacts` as #82 shaped it, and `scene.schema.json` and
   `scene-evaluation.schema.json` `Scene` and `SceneEvaluation`. Structure
   only, every field pencil until #105 fills it. `Situation.traffic`, which
   #82 ruled, fails colregs' own situation schema today, so that much is a
   defect whether or not the rest of this is ruled; it is fixed in its own
   PR. Declaring the `traffic:<sector>:<key>` keys in `facts.json`
   §`situation`, with the sector boundaries as constants, is #105's data
   prerequisite and is issued separately.

The surface, in full:

```ts
export { evaluateDisplay, evaluateEncounter, evaluateConduct,
         evaluateDeparture, evaluateScene, reduceTraffic };
export { DataVersionMismatchError };
export type { EvaluateOptions };
export type { FactRecord, Situation, Subject, Pair, Trace, TraceSample,
              DepartureModel, DepartureRegion, SolverParameters, Scene };
export type { DisplayEvaluation, Display, DisplayLight, EvaluationProvenance,
              EncounterEvaluation, SubjectRole,
              ConductEvaluation, ConductVerdict, ConductPhaseChange,
              DepartureFinding, DepartureAdvisory, DepartureStatus,
              SceneEvaluation, SceneConflict,
              TrafficFacts, TrafficSector, TrafficSectorFacts };
export type { RuleId, ParagraphCite, EffectRole, Modality,
              RuleCategory, RepresentedParagraph };
```

## Alternatives

**Keep the verbs, complete the companions.** Add `appliedDepartureEntries`
and `appliedSceneEntries`. The first returns `finding.rules.applied`, the
second has no single list to return, and every future verb inherits the
question. Regular by count, not by meaning.

**Keep the verbs and the three companions, and state the rule** "a
companion exists when the envelope has a top-level `applied`". True today,
and it leaves ADR 0011's ink where it is; but it is a rule about envelope
layout a consumer must learn before the surface is predictable, and it
keeps two functions per verb that are one function by construction. The
fallback if the ink holds.

**One `evaluate(input, opts)` overloaded on the input type.**

```ts
export function evaluate(facts: FactRecord, opts?): DisplayEvaluation;
export function evaluate(situation: Situation, opts?): EncounterEvaluation;
export function evaluate(trace: Trace, opts?): ConductEvaluation;
export function evaluate(situation: Situation, model: DepartureModel, opts?): DepartureFinding;
```

Two operations read a `Situation` and differ by arity, not type; the
runtime would dispatch on the shape of the record, tying the API's dispatch
to `additionalProperties: false` in the input schemas. The manifest is
language-neutral and per-verb, and colregs-mcp is one tool per verb, so
both would have to invent the names this removes. And it names nothing,
against ADR 0011 §1's "a verb is named for the thing it evaluates".

**Rename to `evaluateTrace`.** Names the input, not the thing; `Trace` is
conduct's input.

## Consequences

Each of these follows a ruling; none of it is done here.

- `data/operations.json`: `evaluateRule2Departure` becomes
  `evaluateDeparture`; `companion` is gone; `fixtures[].expect` is
  required; `evaluateScene` and `reduceTraffic` are added, binding no
  fixture yet. `schema/rule2-departure-*.schema.json` become
  `schema/departure-*`, three schemas are added, `situation.schema.json`
  gains `traffic`. `AGENTS.md`'s one-line description of the manifest
  (`verb → input schemas → result schema → companion → fixture file`)
  changes with it, and not before: it describes the file on disk, so it is
  wrong the moment it describes a proposal instead.
- colregs-engine (#111): `src/index.ts` as above; `Rule2Departure*` types
  become `Departure*`; `Scene.own` becomes `self`; `reduceTraffic` takes
  `opts`; `validateSituation`, `validateTrace`, `NotImplementedError` and
  the three companions leave the root. The module-level functions stay for
  the tests and the conformance harness. The pin bump regenerates
  `ColregsEngine`.
- colregs-mcp: the three `applied_*` tools read `evaluateX(...).applied`;
  `withEngine` drops its `NotImplementedError` branch;
  `evaluate_rule2_departure` calls `evaluateDeparture`. Its own PR.
- searoom: unchanged; it reads `evaluateDisplay` and types only.
- ADR 0011 register row 2 and row 7, ADR 0012's verb table and ADR 0014's
  `companion` rows would be superseded, and would say so in place. They are
  left alone until then; a supersession line pointing at an unruled proposal
  would make the register lie about what has been decided.
- **Cost to reverse.** Revert this PR and the engine's: six exports come
  back, two schemas regain their names, `companion` returns to the
  manifest. Nothing outside the family reads any of it.

## Register

Levels are `docs/conventions.md`'s closed set: pencil means unsettled and
changeable by anyone on a better idea. The "proposal, not a ruling" weight
is in the status block above; a level column is a contract, not a mood.

| item | level | what would settle it |
|---|---|---|
| The root is the manifest: no validators, no unthrown error class, nothing an envelope already answers | ✎ | a consumer that needs validation without evaluation |
| `appliedDisplayEntries` removed — reopens ADR 0011 register row 2 | ink, the maintainer's | a yes or no; the fallback is the second alternative |
| `appliedEncounterEntries` and `appliedConductEntries` removed; `companion` leaves the manifest; `fixtures[].expect` required | ✎ | the first fixture whose `expect` is not `applied` |
| `evaluateDeparture`, `DepartureModel`, `DepartureFinding`, `Departure*`; schema stems `departure-*` | ✎ | colregs renaming the Rule 2 region |
| `evaluateScene` and `reduceTraffic` in the manifest; `reduceTraffic` named for the derivation, the one non-`evaluate` operation | ✎ | #105 built; a second derivation |
| `Scene.self` | ✎ | — |
| `traffic` on `situation.schema.json`; `traffic-facts`, `scene` and `scene-evaluation` schemas, every field pencil | ✎ | #105; the `traffic` class declared in `facts.json` |
