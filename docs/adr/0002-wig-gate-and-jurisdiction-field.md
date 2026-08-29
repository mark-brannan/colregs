# ADR 0002 — WIG operating-condition gate, and dropping the file-level `jurisdiction` field

Date: 2026-08-29
Status: accepted

## Context

Two findings came out of PR #2 review (CodeRabbit and a human/agent pass),
both about predicates not saying what they mean.

### WIG gate

The `23c` entry gated on `wig: true` alone. Rule 23(c) only applies "when
taking off, landing and in flight near the surface" — a WIG craft cruising
above the surface is still `wig: true` but not subject to 23(c). The
condition lived in the entry's prose `notes`, not in `when`, so the predicate
accepted a case the rule doesn't cover. This is the same failure mode as the
30(d) fixture bug: the 30(d) entry hung the unconditional 30(a)/(b)
anchor-light obligation off a `length_m >= 12` gate that only 30(f)'s
red-light exemption actually carries. In both cases a real-world condition
was demoted to a `notes` comment instead of encoded in the predicate,
contradicting the README's own design principle: "a predicate cannot omit a
case it was never asked about."

### `jurisdiction` field duplication

`data/applicability.json` and `data/rules.json` each carry a *file-level*
`jurisdiction` field and, separately, every one of their ~140 records repeats
`"jurisdiction": "intl"` on itself. Nothing tested that the two agreed.
`data/lights.json` and `data/geometry.json` only have the file-level field —
no per-record duplication there, because those files aren't record-per-rule
in the same way.

REQ-MODEL-1 already requires the per-record field: "Where a jurisdiction's
text differs, both MUST be stored, keyed by jurisdiction" — i.e. two
paragraph records can share a path and differ only in jurisdiction, which
only works if the field lives on the record. REQ-MODEL-4 lists `jurisdiction`
as part of the applicability entry's own tuple, same reason. Nothing in
`docs/requirements.md` specifies a role for the file-level field; it was
added as a summary/header, and today it's true only because every record
still says `intl`.

## Decision

**WIG:** split the single `wig` boolean into two facts in `data/facts.json`:
`wig` (the vessel is a WIG craft — a permanent characteristic) and
`wig_near_surface` (the vessel is taking off, landing, or in flight near the
surface — an operating phase). `23c`'s `when` now requires both. Same
pattern the data already used for `non_displacement` on 23(b) — a phase
condition gets its own boolean, not a note.

**`jurisdiction` duplication:** the per-record field is the one REQ-MODEL-1/4
actually specify and the one that has to hold once `us/inland` entries start
landing in the same files as `intl` ones (a delta "hangs off" the base per
ADR 0001, which means mixed jurisdictions in one file is the expected shape,
not a one-file-per-jurisdiction split). The file-level field can't stay true
once that happens, so it was dropped from `data/rules.json` and
`data/applicability.json` rather than kept as a second thing to keep in sync.
`data/lights.json` and `data/geometry.json` keep their file-level field —
they have no per-record duplication to drift against, and splitting them
per-jurisdiction is a decision for whenever a jurisdiction actually changes
light geometry, not now.

## Consequences

- `fixtures/applicability-fixtures.json` gained a negative WIG fixture
  (cruising, not near the surface — no 23c) alongside the existing positive
  one.
- `data/applicability.json` and `data/rules.json` no longer have a top-level
  `jurisdiction` key. A reader wanting "what jurisdictions does this file
  cover" reads the per-record values (currently: `intl`, uniformly) or the
  README's Coverage table, not a header field that would go stale the moment
  a delta lands.
- Same disease, not yet swept: `docs/adr/0002` doesn't do a full audit of
  every other entry for a note-instead-of-predicate condition. That's a
  reasonable follow-up if there's evidence of more, not something to
  speculatively fix here.
