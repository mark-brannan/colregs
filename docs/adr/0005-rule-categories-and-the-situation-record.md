# ADR 0005 — Rule categories, the situation record, and the Rule 2 region

Date: 2026-09-04
Status: accepted, **all of it in pencil**

Everything this ADR records is `✎` **pencil** under
[`docs/conventions.md`](../conventions.md): any session may change any of it
for a better idea, logging the change and what would settle the item. That is
the decision — proceed on this shape — not a claim that the shape is right.
The house default for an ADR is ink; this one inverts it deliberately and
says so once here rather than marking every paragraph.

## Context

Part C (lights and shapes) was modelled first because it is the easy half:
one vessel's facts in, a set of lights out. `REQ-PART-4` then declared Part B
— the steering and sailing rules — out of scope and possibly permanent:
"they govern conduct between two vessels, not the appearance of one, and the
fact record is single-vessel by construction."

The second clause is the real one, and it is a statement about the *input*,
not about whether Part B can be modelled. Proposal
`2026-09-04-rule-categories-v4.md` in `colregs-engine`
(`docs/proposals/`) works out what input Part B actually needs, and what
happens to the rest of the model once the answer is "a pair of vessels, with
kinematics". It went through seven outside reviews across four drafts (three
Claude subagents, codex, Gemini 3.1 Pro); the reviews are in that repo. Mark
approved it on 2026-09-04 with everything in pencil, API breaks allowed
while the package is 0.x.

This ADR records that approval and amends `REQ-PART-4`. It does not
re-argue the proposal; the proposal is the reasoning, this is the decision.

## Decision

### 1. Every rule paragraph carries exactly one category

Nine values, a closed set:

| category | reads | produces | who evaluates it |
|---|---|---|---|
| `definition` | — | vocabulary | n/a |
| `standard` | — | technical values (ranges, heights) | n/a |
| `scope` | visibility, in-sight, jurisdiction | which sections apply | engine |
| `display` | one vessel's facts | signals + modality | engine |
| `classification` | relative geometry, history | encounter type, risk of collision | engine |
| `precedence` | two vessels' facts + encounter type | give-way / stand-on / shall-not-impede / none | engine |
| `conduct` | encounter + role + phase + kinematics + observations | obligated or prohibited action | monitored over a trace, not evaluated at a point |
| `care` | anything | residual responsibility | represented, never independently evaluated |
| `meta` | the region state (§4 below) | banner + advisories | computed by a solver, reviewed by humans |

The unit is the **paragraph**, as everywhere else in this package
(ADR 0001). `care` is Rule 2(a) alone; `meta` is Rule 2(b) alone. Part D
(Rules 32–37) has no category yet and stays blocked on `REQ-PART-3`'s ADR.

One category per paragraph holds because dual roles are *relations*, not
second categories: 13(a) is `classification`, and its effect on Rule 18 is
`rel:overrides` from 13 to 18. The proposal's first-cut membership table is
pencil paragraph by paragraph; the nine names are pencil as a set.

`display` is the default, so every entry in `data/applicability.json` today
is already correctly categorised without being touched.

### 2. Part B reads a situation; the fact record does not change

The per-vessel fact record — `data/facts.json`, the three axes, the
scalars — is unchanged, and nothing in this ADR renames or repoints an
identifier in it (`REQ-MODEL-10`).

A **situation record** wraps it: two fact records, a kinematic state per
vessel, relative geometry, and history. **Kinematic state is a new fact
class** — position, heading, speed, rate of turn, and a dynamics class
(tanker, ferry, yacht, …) — not an extension of the existing one. A
consumer that only shows lights never constructs a situation and never
reads a kinematic fact.

The fixture format cannot carry a situation, so a fixture-schema step
precedes any two-subject data. Existing fixtures are untouched and stay
valid.

### 3. `care` and `meta` are not entries

Rules 2(a) and 2(b) do not produce lights, and evaluating them is precisely
what this package must not do. They go in a **sibling registry beside
`known_omissions`** in `data/applicability.json` — recorded, addressable,
citable, and deliberately not evaluable. A registry entry is the machine-
visible statement "this paragraph exists, this package represents it, and
nothing here computes it".

### 4. Two new modalities, and a sixth relation

`shall-not` and `shall-not-impede` join `shall`, `may`,
`shall-if-practicable`, `conditional` and `exempt`. Both are needed by
Part B and neither is expressible as a negated `shall`: `shall-not-impede`
is a distinct duty in the rules' own vocabulary (18(d), 8(f)), and 8(f)(iii)
restores full Section II duties once risk of collision exists.

`rel:overrides` joins the five relations of `REQ-MODEL-7` as a sixth. It is
the superiority relation — "this paragraph's requirement prevails over
that one's" — carrying Rule 18's "except where Rules 9, 10 and 13 otherwise
require". It is checkable: a solver looks for cycles, and for two `shall`
norms in conflict with no override between them.

### 5. The status alphabet, and the R0/R1/R2 ontology as the research goal

The engine's output carries one of four statuses, fixed as a closed
alphabet: `not-flagged`, `model-rule-conflict`, `no-robust-policy-in-model`,
`inconclusive-in-model`. Each says what the *model* knows and nothing about
what the law concludes; `not-flagged` means "not flagged by this model",
never "the rules suffice".

The alphabet is the surface of an ontology this project states as its
**research goal**, not as an implemented feature. With `Safe(s, σown,
σother)` meaning no invariant violation within a horizon *T*, and *A* a
declared set of admissible other-vessel strategies:

| region | definition |
|---|---|
| **R0** rules-suffice | ∃ compliant σown ∀ σother ∈ A: Safe |
| **R1** departure-required-in-model | ¬R0 ∧ ∃ σown ∀ σother ∈ A: Safe |
| **R2** unwinnable-in-model | ¬∃ σown ∀ σother ∈ A: Safe |

R1 is a model finding bearing on Rule 2(b), not a legal classification.
Rule 2 is not evaluated at runtime as a predicate; it names a *region* of
situation space that a game solver computes offline, and Rule 2 is
deliberately absent from the compliance predicate or the definition is
circular.

None of this lands in `colregs`. The solver, the region grid and the output
envelope live in `colregs-engine`; what this package owes them is the
category field, the registry, the modalities and `rel:overrides`. The
ontology is recorded here so the data decisions above have a stated purpose
and so a later reader can see what they were shaped for.

### 6. `REQ-PART-4` is superseded, not deleted

`REQ-PART-4` said Part B is out of v1 scope and may never be modelled. The
scope half stands: Part B is out of v1, Part C for `intl` completes first
(`REQ-PART-1`), and nothing in this ADR ships data. The "may never" half
does not: the obstacle it named — a single-vessel fact record — is
addressed by the situation record without changing that record. The
requirement is struck through in place and replaced by `REQ-CAT-1..5`, per
the ID-stability rule in the requirements preamble. No requirement ID is
reused.

## Pencil changed since

Logged here rather than left to a commit message, as `docs/conventions.md`
requires of a pencil change.

- **2026-09-04, PR #24 — 13(a) is `precedence`, not `classification`.** §1
  above gives 13(a) to `classification` and says its effect on Rule 18 is a
  relation. The relation part held: entry `13a` carries `rel:overrides`
  against every Rule 18 entry. The category did not. 13(a) is the one
  paragraph of Rule 13 that assigns a role — the overtaking vessel keeps out
  of the way — and a `classification` entry produces an encounter type, with
  nowhere to put a role. 13(b) is the classification: it is the sector test
  that sets the `hist:was_overtaking` latch, and it is not yet written.
  Tracked as `Q-37`; it does not disturb the one-category-per-paragraph rule,
  which is what §1 was really defending.
- **2026-09-04, PR #24 — a fifth fact class, `env`, `pair`-only.** §2 names
  four classes. Rules 9 and 10 are scoped to *places*, and a narrow channel is
  neither a vessel's fact nor the pair's geometry. `pair:env:narrow_channel`
  and `pair:env:traffic_lane` are the addition; `fixtures/situation-fixtures.json`
  had already recorded the gap before the class existed.
- **2026-09-04, PR #24 — `effect` is the fourth new field.** §4 widens
  `modality` and adds `rel:overrides`; it does not say what a norm that
  produces no lights produces instead. `effect` is that, written up in
  `docs/identifiers.md` §"Effects" and required by `REQ-CAT-8`.

- **2026-09-04, PR #25 — the predicate language grows `not` and `any_of`.**
  `Q-33`. ADR 0005 says nothing about the predicate language because it did not
  expect to need to; the first two-subject data found that a conjunction of
  equalities cannot say "any vessel other than …" (18(d)(i)) or "under 20 m or
  a sailing vessel" (9(b), 10(j)). Both constructs live in `satisfies` and one
  shared walker, so both evaluators get them. The absent-fact rule is extended
  rather than excepted: `not` over an absent fact is unsatisfied, so a
  predicate never fires on silence. `9b-small`/`9b-sail` and
  `10j-small`/`10j-sail` collapse to `9b` and `10j`; the four suffixed ids are
  retired and recorded in `retired_entry_ids`, and never reused
  (`REQ-MODEL-10`). Nothing has shipped a Part B entry, so retirement is free
  once and will not be again.
- **2026-09-04, PR #25 — a fact may be derived.** `Q-32`. §2 says the
  per-vessel fact record does not change, and it does not: `fact:rule18_class`
  is a new key in a new `derived` section, computed by this package from the
  record rather than supplied with it, with a decode table as its definition in
  the style `signalk_navigation_state` already set. It is the answer to the
  largest strain the first two-subject data found — that `fact:activity` is a
  display axis and Rule 18's rank is not the same thing — and it is what lets a
  `precedence` entry stop enumerating activity values it must be edited to keep
  correct. One new boolean, `fact:tow_restricts_deviation` (27(c)), because the
  rank genuinely needs a fact the record did not carry.

Seven things the model could not express are recorded as `Q-31`–`Q-39` in
`docs/requirements.md` §11 rather than bent into the data. The largest is
`Q-32`: `fact:activity` is a display axis, and a vessel's rank under Rule 18
is not the same thing as the lights she shows.

## What is unchanged

Stated plainly, because the value of the design above is mostly in what it
does not disturb:

- **The light rules.** Every entry in `data/applicability.json`, every
  light, every relation, every predicate: unchanged.
- **Every fixture.** `fixtures/applicability-fixtures.json` is untouched;
  the cross-implementation contract (`REQ-VERIFY-1`) still holds exactly.
- **Every test.** `npm test` passes on this PR with no data change at all.
- **The fact record.** Kinematics are a new class beside it, not a change
  to it.
- **Identifiers.** Nothing renamed, nothing repointed (`REQ-MODEL-10`).

This PR is documentation only. The data changes it authorises land later,
additively, in the sequence the proposal sets out.

## v0.x compatibility

Concretely, for this package: `category` and `subjects` have defaults
(`display`, `1`), so adding them is additive and no existing entry needs
editing. The two new modality values and `rel:overrides` widen closed
vocabularies, which is additive for a consumer that reads them and a
breaking change only for one that exhaustively switches on the old set.

Beyond that, while the package is `0.x`: **an API break is allowed if the
design is wrong.** Field names, the situation record's shape, the registry's
file and schema, and the fixture schema for situations are all pencil, and
correcting one of them is worth a version bump rather than a compatibility
shim. `REQ-PKG-4`'s major-version rule and `REQ-MODEL-10`'s immutability
both continue to apply on their own terms — additive is still additive, and
no identifier is ever repointed — but nothing here is a stability promise to
consumers, and the README should not read as one until 1.0.

## Consequences

- `docs/requirements.md` gains `REQ-CAT-1..5` (§4.1) and `REQ-PART-4` is
  struck through citing this ADR.
- Eighteen pencilled items from the proposal are recorded as open questions
  `Q-13`–`Q-30`, each with what settles it. Most are `colregs-engine`'s to
  settle; they are listed here because this ADR is what makes them live.
- `docs/conventions.md` is copied into this repo so the ink/pencil marker
  read above is resolvable from inside it, and `CLAUDE.md` points at it.
- No gate opens or closes. The category field, the registry and
  `rel:overrides` are additive; none of them declines a design that gets
  more expensive to adopt later, which is what `REQ-GATE-1` records.
  `Q-10`'s `rel:conditional_includes` question gains a sixth verb to weigh
  against, and is still decided in the second-jurisdiction bundle.
- The proposal's step 1 is this ADR. Steps 2–4 (rule text for Rules 1–19,
  the `care`/`meta` registry with the kinematic fact class, the engine
  output envelope) can run in parallel once this lands.
