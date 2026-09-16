# ADR 0018 — A jurisdiction delta is an RFC 7396 merge patch, and a tombstone is its `null`

Date: 2026-09-16
Status: proposed — merging this PR is the ruling; a revert undoes it

## Context

REQ-SCOPE-3 says a jurisdiction is a delta over `intl`: entries it does not
mention are inherited. Q-11 found that unsafe as stated. 33 CFR 83 leaves
Rule 28 "[Reserved]" and has no counterpart to 23(d)(ii), so a `us/inland`
delta that was merely silent there would inherit `rule:28` and assert an
international obligation the Inland Rules deliberately do not carry. Both
absences are verified against the primary source (Cornell LII's copy of
33 CFR 83: "§ 83.28 [Reserved] (Rule 28)"; 83.23(d) is a single paragraph
with no subparagraphs). Q-11 asked for tombstones — "this entry deliberately
does not exist here", distinguishable from "not yet transcribed" — and held
every non-`intl` jurisdiction until the mechanism existed. Issue #45 asked,
separately, which standard encoding the delta should follow.

Both questions have been waiting on a second jurisdiction to force them.
Issue #137 records that nothing was proposing one. `us/inland` already exists
with two add-only entries under ADR 0008's carve-out, and the two absences
above are the counterexample that carve-out was left open for: a delta that
must suppress, not only add.

## Decision

1. **The delta semantics are RFC 7396, JSON Merge Patch.** A jurisdiction's
   delta over `intl` is, in meaning, a merge-patch document keyed by entry
   id: present keys are that jurisdiction's own entries, `null` keys are its
   tombstones, and every key the patch does not mention is inherited. Any
   conformant merge-patch implementation applied to the `intl` entries by
   id reproduces the jurisdiction's resolved rule set. RFC 6902 is not
   adopted: an operation script with JSON Pointer paths would duplicate the
   id addressing `docs/identifiers.md` already provides.

2. **Storage stays columnar; the patch is derived.** Entries keep their
   `jurisdiction` field in the one `entries[]` table, as ADR 0008 laid them
   down. Tombstones are a second top-level table, `suppressions[]`, one
   record per (jurisdiction, entry): `jurisdiction`, `suppresses` (the
   `intl` entry id), `cite` (the paragraph that has no counterpart) and
   `why` (one sentence and the source). `test/data.test.mjs` builds the
   merge patch from those two tables, applies it with a literal RFC 7396
   implementation, and asserts the result equals the evaluator's
   jurisdiction filter. That test is the statement that storage and
   semantics agree; if they ever diverge, the test names which.

3. **Replace is suppress plus add.** A jurisdiction that reads a paragraph
   differently tombstones the `intl` entry and adds its own, under its own
   id (ADR 0015 — the ids are distinct because the norms are). There is no
   third operation and no in-place edit of an `intl` entry: REQ-SCOPE-4
   holds.

4. **The array caveat is accepted and irrelevant here.** Merge Patch
   replaces an array wholesale. The patch is keyed at entry granularity, so
   the only arrays it ever touches are inside a whole entry being added, and
   an entry is small. A jurisdiction never patches one element of an
   inherited entry's `lights`; it replaces the entry (point 3).

5. **Only an inherited entry can be tombstoned.** A tombstone naming a
   jurisdiction's own entry, or another jurisdiction's, is rejected by test:
   the first is a deletion, the second was never in force.

6. **A tombstone is verified the way an entry is.** Each needs one fixture
   under its jurisdiction whose facts match the suppressed entry's predicate
   and whose expectation omits it, and one `intl` fixture showing the entry
   in force at the base (REQ-VERIFY-3, both sides).

7. **Two tombstones land with this ADR**, both verified: `us/inland`
   suppresses `rule:28` (Rule 28 "[Reserved]") and `rule:23d_ii` (no
   counterpart to the under-7 m, 7 kn exception). They are enough to
   exercise inherit and delete; no verified replace case exists in Part C
   yet, so that branch of point 3 is stated, schema-ready and unexercised.

## Consequences

- **Q-11 is answered and its hold is lifted.** REQ-SCOPE-3's "no non-`intl`
  jurisdiction lands before an explicit suppression mechanism exists" is
  discharged by this mechanism; a jurisdiction lands with its tombstones or
  it does not land. ADR 0008's add-only carve-out survives as the trivial
  case: a delta with no tombstones is a merge patch with no `null`s.
- **Issue #45 is closed by this ADR.** README names the RFC beside the
  jurisdiction paragraph so a consumer knows which library semantics
  reproduce the inheritance.
- **A suppressed entry can leave a record out of vocabulary.** Under
  `us/inland` a record carrying `activity:cbd` now selects nothing:
  `rule:28` is gone and the Rule 23(a) entries it imported read
  `activity:none`. That is the honest answer — "constrained by her draft" is
  not an Inland status — and the package does not pick a reading. It is
  recorded in `known_omissions` and pinned by a fixture. Whether the fact
  vocabulary should carry per-jurisdiction membership so a consumer's
  decode can be checked is a new question, not decided here.
- **`rule:23d_i` cites a path Inland does not spell.** 33 CFR 83.23(d) has
  no `(i)`; the content sits at bare `83.23(d)`. The entry is inherited
  correctly — the norm is the same — and the citation-spelling question is
  GATE-1's, untouched here.
- **GATE-1, Q-10 and Q-8 are not taken.** Q-11 named a "second-jurisdiction
  bundle"; this ADR takes only the item that gated data. The others stay
  open on their own triggers.
- **Cost to reverse.** Delete `suppressions[]` from data, schema and the
  three tests; the two fixtures fail and are deleted with them. No consumer
  reads the table yet. Pre-1.0, a revert.
