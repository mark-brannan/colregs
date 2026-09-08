# ADR 0007 — Rule 26 overrides Rule 30, and neither reaches a vessel aground

Date: 2026-09-08
Status: accepted

## Context

colregs-engine's conformance register recorded two findings against this
package's data. FIND-01/02: `26b-id` and `26c-id` are `shall`, carry
`rel:excludes: ["30a","30b"]`, and `30a` is `shall` too — two obligations
excluding each other. `rel:excludes` (REQ-MODEL-7) is symmetric and
untimed: it says two things must not be shown together, the way 25(c) and
the tricolor are alternatives under 25(b), never that one obligation
displaces another. Rule 26(a) is directional — "a vessel engaged in fishing
... shall exhibit only the lights prescribed in this Rule" — one paragraph
stating what prevails, not a mutual veto. REQ-MODEL-13 and ADR 0005 §4
already drew this line for Rule 18 over Rules 12 and 15; Rule 26 over Rule
30 is the same shape and had not yet been moved.

colregs-engine#32 found the consequence: a fishing vessel aground evaluated
to `26c-id`'s red-over-white plus `30d-red`'s two reds and no anchor light
at all, because `26c-id` carried no position gate — it applied whether the
vessel was underway, anchored or aground — and its exclusion of `30a`/`30b`
stripped the anchor lights `30d-anchor` imports from them, leaving nothing
in their place. Rule 26(a)'s own words are "whether underway or at anchor";
aground is neither state (Rule 3(i) defines "underway" as not made fast to
the shore, at anchor, or aground). Rule 26 has no jurisdiction over a vessel
aground; Rule 30(d) alone does.

## Decision

1. **`rel:excludes` is pick-one between alternatives; two obligations never
   exclude each other.** Where two `shall` entries were related by
   `rel:excludes`, that was always a superiority relation misfiled — REQ-
   MODEL-7's mutual-exclusion semantics never fit two unconditional duties.

2. **`rel:overrides` carries Rule 26(a).** `26b-id` and `26c-id` now carry
   `rel:overrides: ["30a","30b"]` in place of `rel:excludes`. On a `display`
   entry, "prevails" means: while the overriding entry applies, the
   overridden entry's lights are not shown, even though its own predicate
   is satisfied. A consumer resolving `rel:overrides` (as colregs-engine
   does) drops `30a`/`30b`'s lights whenever `26b-id`/`26c-id` fires; a
   consumer that does not resolve it sees both, which is `rel:excludes`'
   old, wrong behaviour restored — the reason to resolve it.

3. **Aground is neither underway nor at anchor, so a vessel aground shows
   Rule 30(d) alone.** `26b-id`, `26b-mast`, `26c-id` and `26c-gear` — the
   four Rule 26 lights entries with no position gate — now read
   `"fact:position": {"not": "position:aground"}`. `26b-mw`/`26c-mw` needed
   no change: they already read `fact:making_way`, which refines underway
   and is never true aground. Gating all four, not only the two FIND-01/02
   named, is what "Rule 30(d) alone, full stop" requires: leaving the mast
   or gear light ungated would still show a Rule 26 light beside 30(d)'s.

## Consequences

- A consumer must resolve `rel:overrides` on `display` entries to get the
  right light set at anchor; colregs-engine already does, in a PR landing
  alongside this one, and will bump its `colregs` pin once this releases.
- `fact:position` is now a required read for Rule 26's lights entries. A
  predicate never fires on an absent fact (`satisfies`, `test/data.test.mjs`),
  so a fact record that omits `fact:position` no longer shows any Rule 26
  light — same rule as `not` elsewhere in this package, applied for the
  first time to a Rule 26 entry.
- Trawling while anchored remains a pair the data cannot rule out at the
  facts level — `fact:activity` and `fact:position` are orthogonal axes —
  pending its own declaration; this ADR does not add one.
- colregs-engine's FIND-01 and FIND-02 close on this ADR.
