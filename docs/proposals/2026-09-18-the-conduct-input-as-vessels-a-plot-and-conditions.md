# The conduct input as vessels, a plot and conditions

Date: 2026-09-17
Author: Claude (Opus 5), in a session on the colregs domain vocabulary.
Level: `?` (open, `docs/conventions.md`). This is a proposal, not an ADR.
It adopts nothing and supersedes nothing, and it claims no ADR number.
Nothing in it has been ruled. Merging the PR that adds this file records a
suggestion in the repository — ADR 0012 §2's `Trace` stands as written
until an ADR says otherwise, and this write-up is not that ADR.

Read it as an argument, not a boundary. Everything below is one author's
recommendation, reached by reading the Rules' vocabulary against the shapes
already in the repository — including the parts written in the flat
indicative, which is a habit of the form and not a claim of authority.
Where a sentence sounds like a ruling, that is the author over-reaching;
the register at the foot is the honest summary, and every row of it is
open.

This is also one of a batch of write-ups produced in quick succession by
agent sessions on adjacent questions. The batch is raw material. Expect it
to be rewritten from scratch, or dropped, rather than adopted a section at
a time, and do not build on it or cite it as precedent in the meantime.
When it becomes a decision, the decision will be stated by whoever rules,
in their own words, and this file's content is not that.

The subject is colregs-engine's public API and the MCP tool contract;
colregs owns the ADR and the schema (ADR 0014).

## Context

ADR 0012 §2 made the conduct input a sequence of whole point inputs:
`Trace = { samples: { t_s, situation }[] }`. That is one shape repeated, and
the argument of this file is that it is wrong about what a plot is. A plot is positional facts in time, for
one or more vessels. It carries neither the non-transient facts of the
vessels nor the facts external to them — visibility, place, obstacles. A
vessel moves through time and space; she does not mutate through it, and
neither does the land.

What `Trace` lets a caller write today, and no validator can refuse:

- a trawler who stops trawling at sample 3, with no action in between;
- a vessel 30 m long at `t_s: 0` and 60 m long at `t_s: 12`;
- fog that lifts between two samples of one window;
- `hist:was_overtaking` true at sample 2, false at 4, true at 5;
- a different pair of vessels in each half of the window — ADR 0012 admits
  this one outright, because a `Situation` names no vessel.

The first four are the same error: a fact that is fixed for the window is
authored per sample. The fifth follows from it. A shape in which they cannot
be written is worth more, I think, than a validator that catches some of
them.

SignalK splits its vessel model on exactly the axis that separates them —
`design` (what the vessel is), `navigation` (where she is and how she is
moving), `environment` (the conditions around her). Our namespaces are one
projection short of that split, not at odds with it: `fact:` is design,
`kin:` and `geo:` are navigation, `env:` is environment, and `fact:visibility`
and `fact:time` are environment authored as per-vessel facts because
`evaluateDisplay` reads one record and has nowhere else to put them
(ADR 0021; the `fact:visibility` note in `facts.json` says so).

Not settled here: `course` vs `heading`. The Rules keep them apart — "keep
her course and speed" is not a heading — as SignalK does
(`navigation.courseOverGroundTrue` vs `navigation.headingTrue`) and as
`kin:sog_kn`/`kin:heading_deg` do not yet. It is a gap in the `kin:`
namespace, noted and not addressed here.

## The suggestion

### 1. A three-part split

| part | field | SignalK | our namespaces | varies |
|---|---|---|---|---|
| the vessels | `vessels` | `design` | `fact:`, `hist:` | fixed for the window |
| the plot | `plot` | `navigation` | `kin:`, `geo:` | per sample |
| the conditions | `conditions` | `environment` | `env:`, `fact:visibility`, `fact:time` | fixed for the window |

The split is the substance of the suggestion; the three names below are
proposed to follow from it.

### 2. `Circumstances` — a name for the input `evaluateConduct` reads

```ts
/** One vessel, invariant over the window: what she is, and what was
 *  already true of her when the window opened. */
interface Vessel {
  fact: FactRecord;
  /** State latched before the window: `hist:was_overtaking`,
   *  `hist:latched_at_s`. Fixed at the opening, because a window cannot
   *  see a latch set before it (ADR 0012 §2); what latches inside the
   *  window the engine derives from the plot. */
  hist?: History;
}

/** Where the encounter is happening — a property of the water and the day,
 *  not of either vessel. Rule 6's factors, less the vessel's own. */
interface Conditions {
  env?: Environment;
  visibility?: FactValues['fact:visibility'];
  time?: FactValues['fact:time'];
}

/** The circumstances of the case: the window `evaluateConduct` judges
 *  conduct in. */
interface Circumstances {
  vessels: { self: Vessel; other?: Vessel };
  plot: Plot;
  conditions?: Conditions;
}

declare function evaluateConduct(
  circumstances: Circumstances,
  opts?: EvaluateOptions,
): ConductEvaluation;
declare function appliedConductEntries(
  circumstances: Circumstances,
  opts?: EvaluateOptions,
): RuleId[];
```

`Circumstances` is the Rules' noun for the whole case, 16 body hits: "if the
circumstances of the case admit" (8(a)), "the ordinary practice of seamen or
by the special circumstances of the case" (2(a)). `evaluateConduct(circumstances)`
is the sentence Rule 8(a) writes. `Conditions` is the narrower half of Rule
5's couplet — "the prevailing circumstances and conditions" — and Rule 6
enumerates it: state of visibility, traffic density, state of wind, sea and
current, proximity of navigational hazards. 2(b)'s "special circumstances"
is not a subtype of the input: it is a finding about circumstances, and
`Departure` looks like the better home for it.

`conditions.visibility` and `conditions.time` would be the only home for
those two facts in this input: the same key inside `vessels.*.fact` refused,
not overridden. The data keeps them on the record, where `evaluateDisplay`
needs them; the projection in §5 writes them into both vessels' records.
"Self in fog, other in sunshine" would stop being expressible.

### 3. `Plot` — positional facts in time

```ts
/** One vessel's transient state at one sample. */
interface Fix {
  kin?: Kinematics;
  geo?: DirectionalGeometry;
}

/** What is true between the two vessels at one sample: range, bearing
 *  change, CPA, TCPA, in-sight, risk of collision. Was `Pair`, less `env`,
 *  which is now `Conditions`. Named in the traffic item; pencil here. */
interface Between {
  geo?: PairGeometry;
}

interface PlotSample {
  t_s: number;
  self: Fix;
  other?: Fix;
  between?: Between;
  /** Reserved. Traffic facts are derived and transient, so the sample is
   *  their home rather than the window; the traffic item rules the shape. */
  traffic?: TrafficFacts;
}

/** Rule 7(b)'s "radar plotting": the positions of the vessels in time, and
 *  nothing else. Non-empty, `t_s` strictly increasing, seconds on the
 *  caller's clock, read as differences only. */
interface Plot {
  samples: PlotSample[];
}
```

The validator would keep ADR 0012's non-empty and strictly-increasing
checks and gain one: `other` is present in every sample if and only if it is present
in `vessels`. It would lose the pair-identity check it could never
make, because a window would have one `vessels` and the pair could not
change inside it.

### 4. Suggested: a change in conditions ends the window

If conditions are fixed for the window, the window is a span over which
they hold. A vessel entering an area of restricted visibility (Rule 19) is two
windows, and so is a sunset. The caller splits; nothing in the engine
stitches, and `ConductEvaluation.window` continues to say what it saw. That
is a narrower window than `Trace` allows, and I think a more truthful one: `Trace`
accepted fog lifting mid-window and evaluated Section II and Section III
samples into one set of verdicts with nothing marking the boundary.

### 5. The point input as one sample of the window

```ts
/** The point input (ADR 0011 §3), under a rename to `Encounter`:
 *  the same three parts, one fix instead of a plot. */
interface Encounter {
  vessels: { self: Vessel; other?: Vessel };
  fix: { self: Fix; other?: Fix; between?: Between; traffic?: TrafficFacts };
  conditions?: Conditions;
}

/** Total: every sample of a well-formed window projects to a well-formed
 *  point input. */
declare function at(circumstances: Circumstances, i: number): Encounter;
```

Taken together, the split would land in both inputs, and `Vessel` would
have one meaning — the invariant half, `{ fact, hist }` — rather than one
meaning per input. A rename of `Situation` to `Encounter`, which is under
discussion separately, would be where the `Encounter` half of this landed.

Inside the engine the change is one line deep: `flattenSituation(s.situation)`
becomes `flattenSituation(at(circumstances, i))`. The predicate language,
the flat `self:fact:activity` form and every conduct entry would be
untouched. Conduct would buy the split without buying a second walker.

### 6. What a `Trace` → `Plot` rename would touch

| where | from | to |
|---|---|---|
| colregs | `schema/trace.schema.json` | `schema/circumstances.schema.json`, `$defs/plot`; new `$id` |
| colregs | `data/operations.json` `evaluateConduct.inputs[0]` | `{ name: 'circumstances', schema: 'schema/circumstances.schema.json' }` |
| colregs | `test/data.test.mjs` sample instance | the three-part instance |
| engine | `src/types.ts` `Trace`, `TraceSample` | `Circumstances`, `Plot`, `PlotSample`, `Fix`, `Conditions` |
| engine | `src/types.ts` `Subject`, `Pair` | `Vessel` (`{fact, hist}`), `Between` (`env` out) |
| engine | `src/facts.ts` `validateTrace` | `validateCircumstances` (§3's check set) |
| engine | `src/conduct.ts` `evaluateConduct(trace)`, `appliedConductEntries(trace)` | `(circumstances)`; `isManoeuvring`/`phaseAt` read `PlotSample` and `vessels.*.hist` |
| engine | `src/generated/trace.ts`, `TraceSchema` | `circumstances.ts`, `CircumstancesSchema` |
| engine | `scripts/generate-operations-interface.ts` schema→name map | the new row; `src/generated/colregs-engine.ts` regenerates |
| engine | `src/index.ts` exports, `test/conduct.test.ts` | follow |
| MCP | `src/server.ts` `TraceSchema` (zod) | `circumstancesSchema()`; `situationSchema()` splits into `vesselsSchema`/`plotSchema`/`conditionsSchema`, shared by both inputs |
| MCP | tool input key `{ trace }` on `applied_conduct_entries`, `evaluate_conduct` | `{ circumstances }` |
| MCP | those tools' descriptions and `README.md`'s tool table | "a plot window" |

The two MCP tool *names* would not change: they name the verb, not the
input.
Renaming the input key is still a breaking change to the tool contract for
any saved call, and pre-1.0 that costs nothing.

`Trace` would keep the one place it was always right: `research/`, the STL
monitors, a model checker's counterexample. A trace is what the projection
in §5 *produces* — the sequence of per-sample encounters a monitor reads —
not what a caller hands in. ADR 0012 §5's layer table would be
unaffected; its §3 aside that `robustness` is runtime-verification vocabulary "like
`Trace`" now points at the monitor, not at an exported type.

## If it were adopted

- Breaking for every caller of `evaluateConduct` and `appliedConductEntries`
  (colregs-engine's `@alpha` exports, the two MCP tools; no fixture yet).
- Order of work, each step shipping something callable:
  1. colregs: `schema/circumstances.schema.json`, `operations.json`, and the
     first conduct fixture authored in the three-part shape — the fixture is
     what settles most of the register below.
  2. engine: the types and `validateCircumstances`, then `at` and the two
     verbs over it. The `Encounter` half arrives with the `Situation` rename.
  3. MCP: the split zod schemas, once the engine types land.
- ADR 0012 §2 would be superseded and its `Trace` register rows retired.
  Nothing here does that: ADR 0012 stands as written until an ADR replaces
  it.
- Rule 19 becomes representable in the shape before it is representable in
  the data: a window under `visibility:restricted` is a window whose
  conditions say so, and the Section III gate stops depending on which
  vessel's record was authored with the fact.

## Register — every row open (`?`)

Nothing here is pencil, so no row names a session that may change it and no
row names an owner. The right-hand column is the evidence that would let
someone decide, which is the only useful thing this file has to say about
its own confidence.

| item | what would settle it |
|---|---|---|
| **All of it.** No part of this file has been ruled on | an ADR, written by whoever rules |
| The three-part split, on SignalK's `design`/`navigation`/`environment` axis | the first conduct fixture authored in it |
| `Circumstances` for the window, `Conditions` for the third part; the alternative is `ConductInput` for the window and `Circumstances` for the third part (the draft's pencil), which trades the Rules' register for two names a reader cannot confuse | a reader who confuses the two names, or does not |
| `Plot` carries positional facts only; `hist:` rides on `vessels` as the window's opening state | the first conduct monitor that derives a latch inside a window |
| `conditions.visibility`/`conditions.time` are the only home in this input; the same key inside `vessels.*.fact` is refused | Q-56 (19(a)'s second conjunct and which subject reads it) |
| A change in conditions ends the window; the caller splits and the engine does not stitch | the first Rule 19 fixture that crosses the boundary |
| `at(circumstances, i)` total, and the walker's only contact with the new shape | `validateCircumstances` and the first replayed fixture |
| `Vessel` means `{ fact, hist }` in both inputs; `Encounter` takes `fix` where `Circumstances` takes `plot` | the `Situation`→`Encounter` rename PR |
| `Between` for the symmetric half, `env` moved out of it | the traffic item, which owns the name |
| `PlotSample.traffic` reserved, not specified | the traffic item |
| MCP tool names unchanged, input key renamed | — |
| `course` vs `heading` in `kin:` is a recorded gap, not decided here | a card; the Rules' "course and speed" against SignalK's COG |
