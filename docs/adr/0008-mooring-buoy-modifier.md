# ADR 0008 — `position:moored` stays one value; a mooring buoy is a modifier

Date: 2026-09-08
Status: accepted

## Context

Rule 3(i) defines "underway" as "not at anchor, or made fast to the shore,
or aground". A vessel made fast to a mooring buoy is none of those three:
she is not at anchor, and a buoy is not the shore. Read strictly she is
therefore *underway*, and would owe Rule 23 or Rule 25 running lights while
lying still on a buoy all night — which nobody does and no authority
expects. Read the way every pilot book reads it, she is moored, and the
Convention prescribes her no lights at all: no paragraph of Part C reaches
`position:moored`.

The United States closed the gap by legislation, not by interpretation.
33 CFR 90.5 provides that a vessel made fast to a mooring buoy is deemed to
be a vessel at anchor, which brings Inland Rule 30(a) — and for a vessel
under 50 m, 30(b) — to bear on her. That is a national deeming provision.
It has no counterpart in the Convention.

The modelling question was whether "moored to a buoy" is a fourth value of
`fact:position`, beside `position:moored`. It is not. Splitting the axis
would make every existing predicate that reads `position:moored` silently
wrong for the buoy case, and would encode a US rule in the shape of the
international vocabulary — every consumer, in every jurisdiction, paying
for a distinction only one jurisdiction draws.

## Decision

1. **`position:moored` stays one value.** The axis is not split, and no
   existing identifier is renamed.

2. **`fact:on_mooring_buoy` is a boolean modifier refining
   `fact:position=position:moored`,** shaped exactly like `fact:making_way`
   refines `position:underway`. A modifier is the established way this
   package says "one state, two legally distinct sub-cases": the axis value
   stays the coarse fact everyone agrees on, and the modifier carries the
   refinement only the rules that need it read.

3. **Alongside prescribes no lights, and that is the Convention's answer,
   not a gap.** Rule 3(i)'s "made fast to the shore" is a moored vessel; no
   Part C paragraph gives her lights. A fixture asserts the empty set, so
   the silence is tested rather than assumed.

4. **The buoy case gets the 30(a)/30(b) anchor lights only under a
   jurisdiction that says so.** Two entries, `30a-buoy` and `30b-buoy`,
   carry `jurisdiction: us/inland` and cite 30(a) and 30(b); `30b-buoy` is
   `may`, `rel:in_lieu_of` `30a-buoy`, on the same under-50 m gate 30(b)
   uses. Under `intl` the same fact record selects nothing. This is the
   jurisdiction dimension of ADR 0001 doing the job it was built for: a
   national departure is a delta on the base, never an edit to it.

5. **The fixture corpus gains a per-case `jurisdiction`.** The corpus-level
   value is now the default; a case may name its own and is evaluated
   against `intl` plus that jurisdiction's deltas (REQ-SCOPE-3). Without it
   the evaluator has no way to say which body of rules a fact record is
   being read under, and a national entry would leak into every
   international answer.

6. **`fact:on_mooring_buoy` is actuable and is not derivable from SignalK.**
   `navigation.state: "moored"` covers alongside and buoy alike and no
   SignalK path separates them, so the fact is recorded in the decode
   table's `lossy` list and must be asked of the consumer. SignalK is an
   integration point, not a constraint on the model: a fact the rules turn
   on stays in the vocabulary whether or not a sensor can report it.

## Consequences

- This is the first non-`intl` applicability entry in the package, and it
  arrives before Part C is complete for `intl` (REQ-PART-1) and before the
  explicit suppression mechanism REQ-SCOPE-3 requires. Both are amended
  with a narrow carve-out: a delta that only *adds* entries suppresses
  nothing, so silence-means-inherit — the hazard Q-11 records, where a
  jurisdiction deliberately has no rule and inherits one anyway — cannot
  arise from it. A delta that suppresses or replaces an `intl` entry still
  waits on that mechanism.
- The evaluator in `test/data.test.mjs` now filters by jurisdiction in both
  directions, forward and drift. An entry from another jurisdiction is not
  a drift candidate: it was never in force for that record.
- A consumer that ignores jurisdiction will show anchor lights to a
  buoy-moored vessel in the English Channel. The filter is three lines and
  the fixtures pin both answers.
- `us/inland` is now a jurisdiction with exactly two entries in it. It is
  not a claim to model the Inland Rules; README's coverage statement
  (REQ-SCOPE-6) says so explicitly.
