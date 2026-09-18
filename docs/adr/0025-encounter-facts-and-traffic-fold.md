# ADR 0025 — The encounter record carries facts, not vessels; traffic is a fold over encounters

Date: 2026-09-17
Status: proposed — merging this PR is the ruling; a revert undoes it. It
reopens one line of colregs-engine#82 (Solace, 2026-09-16) and reconfirms
it; the `pair` row in the register is Solace's alone.

## Context

ADR 0023 fixed six operations. Two of them, `evaluateScene` and
`reduceTraffic`, took their shape from colregs-engine#82's ruling — other
vessels enter the departure verb as reduced facts, never as a list of
vessels — and have no ADR of their own. Both are stubs that throw;
colregs-engine#105 is about to fill them and colregs#192 to declare the
facts they produce.

On 2026-09-17 Solace ruled a vocabulary pass (`Subject` → `Vessel`,
`Situation` → `Encounter`, `reduce` → `derive`, traffic as the collection
noun) and asked three questions this ADR answers: does `Pair` belong in the
API, and under what name; is the pairwise encounter a branch of evaluating
traffic; what are `deriveTrafficFacts` and `evaluateTraffic` each for. The
sketch offered put `others?: Vessel[]` on the encounter record with the
engine deriving traffic facts from it, which is the line of #82 reopened.

What the data says, counted in `data/applicability.json`:

| read | predicates |
|---|---|
| `pair:geo:in_sight` | 22 |
| `pair:geo:risk_of_collision`, `pair:geo:tcpa_s`, `pair:geo:bearing_change_deg_min` | 7, 3, 1 |
| `pair:env:narrow_channel`, `pair:env:traffic_lane` | 2, 2 |
| `self:geo:rel_bearing_deg`, `other:geo:rel_bearing_deg` | 6, 7 |
| `self:hist:was_overtaking`, `other:hist:was_overtaking` | 5, 17 |
| `traffic:*` | 0 |

What #82's research settled: role assignment is pairwise — Rules 12, 13,
15 and 18 by their text, *Nordlake* and *Burgan* apportioning pair by pair —
and action existence is not, the NTSB's *Fitzgerald* finding being the
instance ("room to pass ahead of *Wan Hai 266*, not prudent given *ACX
Crystal*"). Rule 8's "shall not result in another close-quarters situation"
is the Rules' own multi-vessel constraint, on an action, not a role.

What the Rules call the two-vessel relation: nothing. They speak from one
vessel — "other vessel" (26 body hits), "an approaching vessel"
(7(d)(i)), "in sight of one another" (3(k)). `pair` has no row in the
vocabulary table because there is no Rules' noun to align it with.

## Decision

### 1. The encounter record carries facts, not vessels

```ts
interface Encounter { self: Vessel; other?: Vessel; pair?: Pair; traffic?: TrafficFacts; }
interface Vessel    { fact: FactRecord; kin?: Kinematics; geo?: DirectionalGeometry; hist?: History; }
interface Pair      { geo?: PairGeometry; env?: Environment; }
```

No `others`. #82's reasons stand — a verb handed vessels it does not read
is lying or acquiring semantics; "the same two vessels throughout" cannot
survive a per-sample list — and three are added:

- **A `Vessel` requires a fact record.** A radar contact is a range and a
  bearing with no `fact:` record. A list of vessels demands facts the
  reduction never reads; a record of facts asks only what the entries read.
- **Facts are checked, not derived** (`docs/identifiers.md`, on pair
  geometry: an ARPA solution is supplied, and checked where kinematics are
  also stated). A fixture states `traffic: { starboard: { nearest_nm: 0.8 } }`;
  one that must place three vessels so a reduction yields that fact is a
  test of the reduction wearing a fixture's clothes.
- **The convenience the sketch buys is real and belongs elsewhere.** Hand
  the engine every vessel once and get everything back: that is the traffic
  operation (§3), whose input is a list of vessels because it evaluates
  every one of them as a vessel.

### 2. `pair` keeps its name

`Pair` exists as data: range is one number, of neither vessel
(`docs/identifiers.md` §"The three subjects"), and a radar contact is
exactly a `pair` range and a `self` bearing. It stays in the API as the
third subject and the type its facts are written in.

It keeps its name because the Rules offer none. The vocabulary method keeps
a model word where the Rules have no word — `Display`, `Finding`, `self` —
and `pair` is exact: two, symmetric, of neither. It is a subject segment
fixed by REQ-CAT-6 and read by 37 predicates, the identifier layer, where a
change should buy alignment with the Rules and no candidate does.

`between` is the runner-up and the fallback if Solace holds for a rename:
Rule 18's title, "Responsibilities between vessels", is the one Rules
anchor, and `encounter.between` reads as English. The rename is
`pair` → `between` in the type, the field, the subject segment, the 37
predicates, the fixtures, `docs/identifiers.md` and REQ-CAT-6, in one churn
PR like `Subject` → `Vessel`. `approach` fails on `in_sight`, mutual and
not an approach quantity; `relative` collides with the `rel:` prefix.

Keeping `pair` decides nothing about `Pair.env` and `circumstances` (the
question in #193); `between:env:narrow_channel` would have.

### 3. The encounter is the unit; traffic is a fold over encounters

`evaluateEncounter(Encounter): EncounterEvaluation` stays.
`evaluateTraffic(Traffic): TrafficEvaluation` evaluates every encounter in
the record, each under the traffic facts derived from the rest, and reports
the conflicts between them:

```ts
interface Traffic           { encounters: Encounter[]; }
interface TrafficEvaluation { colregs: {...}; encounters: EncounterEvaluation[];
                              conflicts: TrafficConflict[]; provenance: EvaluationProvenance; }
```

The encounter is not the one-vessel branch of traffic. Three operations read
an `Encounter` — encounter and departure whole, conduct one per sample of its
window (#193 §5's `at`) — and one takes a `Traffic`. Roles are pairwise by the Rules'
text and by the case law; what is not pairwise is whether a compliant action
exists — Rule 8's close-quarters clause — and that is the conflict report
and the departure finding, neither of which is a role.

The relation is a law, and a conformance test:

> For every `i`, `evaluateTraffic(t).encounters[i]` equals
> `evaluateEncounter({ ...t.encounters[i], traffic: deriveTrafficFacts(without(t, i)) })`.
> A `Traffic` of one encounter returns that envelope and no conflicts.

### 4. `Traffic` is a list of encounters, not one `self` and many `others`

`self:geo:rel_bearing_deg` is the bearing of *that* other from self;
`self:hist:was_overtaking` is that self was overtaking *that* other. They
are self's facts toward one vessel, not self's facts. A shared `self` has
one bearing; n others need n. So each element of `Traffic` is a complete
two-vessel record with `other` present, `self.fact` and `self.kin` equal
across elements — the validator checks the equality, which is checkable
where identity is not (ADR 0012 §2) — and `encounters[i].traffic` rejected,
because the operation derives it. `Vessel` mixes intrinsic classes (`fact`,
`kin`) with relational ones (`geo`, `hist`); this is the shape in which
that costs nothing for n, as it costs nothing for two.

### 5. `deriveTrafficFacts` stays public, and derives geometry only

```ts
deriveTrafficFacts(traffic: Traffic, opts?): TrafficFacts   // traffic:<sector>:<key>
```

The one non-`evaluate` operation, kept public for the reason §1 makes it
necessary: the encounter record carries facts, so someone derives them; the
sector boundaries are colregs constants (#192); and the derivation must be
the one `evaluateTraffic` and the reference evaluator use, or §3's law is
unverifiable from outside. Its callers are the two that want traffic facts
without every pair evaluated — `evaluateDeparture` under traffic, #82's
whole occasion, and a Plot under traffic, one derivation per sample. The
Rules' verb for the docs is 7(b), "systematic observation of detected
objects".

It derives per sector what the record's geometry gives: `count` and
`nearest_nm`, from each encounter's `self` bearing and `pair` range. It
reads no role. `foreclosed` is not derived: whether traffic forecloses a
helm action is a judgement against a separation, and the separation is the
departure model's (`SolverParameters.separation_m`). The grid reads
`nearest_nm` against its own parameter, or a caller states `foreclosed` as
it states `hist:was_overtaking`. Pencil, #105's to settle.

### 6. Names

| ADR 0023 | here | by |
|---|---|---|
| `Scene`, `evaluateScene`, `SceneEvaluation`, `SceneConflict` | `Traffic`, `evaluateTraffic`, `TrafficEvaluation`, `TrafficConflict` | Solace, 2026-09-17 (traffic the collection noun) |
| `reduceTraffic(self, others, opts?)` | `deriveTrafficFacts(traffic, opts?)` | Solace, 2026-09-17 (`reduce` → `derive`); the signature §4 |
| `Subject`, `Situation` | `Vessel`, `Encounter` | Solace, 2026-09-17; its own churn PR |

`traffic` joins `self`, `other` and `pair` as a reserved head segment of
the flat namespace and is not a subject: `traffic:<sector>:<key>`, the
sector where a subject form has its class. `TrafficEvaluation` carries no
record-level `traffic`: each encounter read a different one.

## Alternatives

Each not taken here; Solace rules by merging or by editing the row.

**`others?: Vessel[]` on the encounter record, the engine deriving.** The
sketch. Fails §1's three reasons, and would need a threshold for
`foreclosed` inside `evaluateEncounter`, which has no model.

**Drop `evaluateEncounter`; the encounter is `evaluateTraffic` with one
element.** Regular by count. Conduct and departure would take a one-element
`Traffic`, `colregs-mcp` would read `encounters[0]`, and the fixture format
would describe a wrapper.

**`deriveTrafficFacts` internal.** Then `evaluateDeparture` under traffic
has no engine producer for its own input, every consumer re-sectors against
colregs' constants, and §3's law is the engine's private claim. The
fallback if a consumer never appears: remove it, one export.

**`Traffic { self: Vessel; others: Vessel[]; pairs?: Pair[] }`** (ADR 0023's
`Scene`). Loses self's directional geometry and history per other (§4), or
invents a per-element shape carrying them that nothing else reuses.

**`deriveTrafficFacts(self, others, opts?)`.** Same loss: `others: Vessel[]`
carries each other's aspect and none of self's bearings.

## Consequences

- **ADR 0023** (#191): the `evaluateScene`, `reduceTraffic` and `Scene`
  rows take §6's names — edited in place if #191 is open, superseded in
  place if merged. Schema stems `scene` → `traffic`, `scene-evaluation` →
  `traffic-evaluation`; `situation` → `encounter` is the churn PR's.
- **colregs-engine#105** builds `deriveTrafficFacts(traffic)` and
  `evaluateTraffic` with §3's law as a test; **#133** takes §6's names.
- **colregs#192**: `traffic` as a reserved head segment; the sector
  constants; `foreclosed` declared caller-stated or dropped (§5).
- **REQ-CAT-4** gains the traffic class; **REQ-CAT-6** reserves `traffic`
  beside the three subjects. `docs/identifiers.md` §"The three subjects"
  records why `pair` keeps its name.
- **#193** (the conduct input) nests §1's `Encounter` as `vessels`, `fix`
  and `conditions`, with `Vessel` the invariant half. Nothing here depends
  on the nesting: `Traffic { encounters }`, §4's equality check and §3's law
  hold with `vessels.self` shared and `fix.between` for `pair`. Which
  nesting stands is #193's PR.
- **Cost to reverse.** Revert this PR. The two operations are stubs that
  throw, no fixture binds them, and nothing outside the family reads a
  `traffic:` key.

## Register

| item | level | what would settle it |
|---|---|---|
| The encounter record carries `traffic` facts, never a vessel list | ink | Solace, #82, 2026-09-16; reconfirmed by merging this ADR |
| `pair` keeps its name; `between` the fallback | ✎ | Solace, by merging or editing this row |
| `evaluateEncounter` stays; `evaluateTraffic` is a fold plus conflicts; the law in §3 | ✎ | the conformance test in colregs-engine#105 |
| `Traffic { encounters: Encounter[] }`, `self.fact`/`self.kin` equal across elements, `traffic` rejected on elements | ✎ | #105's three-vessel fixture |
| `deriveTrafficFacts(traffic, opts?)` public, the one non-`evaluate` operation | ✎ | a consumer calling `evaluateDeparture` under traffic; or none by 1.0, then remove it |
| Derived traffic facts are geometric (`count`, `nearest_nm`); `foreclosed` is not derived | ✎ | #105; the first grid that reads a traffic key |
| `traffic` a reserved head segment, not a subject | ✎ | colregs#192 |
| `Vessel`, `Encounter`, `derive` | ink | Solace, 2026-09-17, the vocabulary rulings |
| `Traffic`, `evaluateTraffic`, `deriveTrafficFacts` | ✎ | follow from "traffic the collection noun" (Solace, 2026-09-17); Solace, by merging |
| `TrafficEvaluation`; `TrafficConflict` as #82 shaped it, indices into `encounters`; no record-level `traffic` | ✎ | #105's three-vessel fixture |
