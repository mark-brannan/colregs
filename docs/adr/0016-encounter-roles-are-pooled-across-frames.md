# ADR 0016 — An encounter's roles are read from both frames, pooled, then resolved

Date: 2026-09-16
Status: accepted — Solace's ruling on #141, 2026-09-16.

## Context

Every `precedence` entry in `data/applicability.json` is written from the
duty-holder's seat: `effect.own` is one of `give-way`, `shall-not-impede`,
`keep-clear`, `none`, and `effect.other` is `stand-on` or `none`. No entry
names own stand-on. That is faithful to the text — a paragraph addresses the
vessel it binds, and the other vessel's stand-on is Rule 17's inference —
and it is why entry `rule:15a:keep_out_of_the_way` gates own's bearing on the
starboard half only.

ADR 0011 §4 defines `EncounterEvaluation.roles` as a role set for *both*
subjects: what everyone is to do. Nothing between the two said how an engine
gets from a one-seat table to a two-seat answer. colregs-engine read the
situation once, from own's seat, and passed every fixture doing it, because
`fixtures/situation-fixtures.json` expects one-seat entry ids.

Measured on 2026-09-16 (#141), with colregs' own matcher, one-seat against
pooled:

| encounter | one seat tells own | pooled says own is |
|---|---|---|
| crossing, other on own's port bow | nothing | stand-on |
| own not under command, ordinary power vessel to starboard | give-way (15(a)) | stand-on (18(a)(i)) |
| own power-driven, a sailing vessel overtaking her | give-way (18(a)(iv)) | stand-on (13(a)) |

The second and third are not gaps but wrong answers: both vessels give-way
at once. The cause is that every `rel:overrides` edge of the Q-40 family —
`rule:18a_i` → `rule:15a:keep_out_of_the_way`, `rule:13a` → `rule:18a_iv`,
`rule:9c` → `rule:18a_iii` and the rest — has its source in one vessel's
seat and its target in the other's. A one-seat reader never sees the source,
so the target stands. The suite has pooled both seats since ADR 0005 §4
(`pooledRoles` in `test/data.test.mjs`); with the swap removed it fails.

Two repairs were on the table: reciprocal entries (own stand-on, other
give-way, gates mirrored), or the pooled read stated as the contract.

## Decision

1. **`evaluateEncounter` reads two frames.** The situation as given, and its
   swap (`own` and `other` exchanged, `pair` unchanged), are both matched
   against every non-`display` entry. Derived facts are computed per frame.
2. **Precedence entries are pooled, then resolved.** The precedence entries
   that apply in either frame form one pool, keyed by which vessel each fired
   for. `rel:overrides` is resolved over the pool, so an override may reach
   an entry that fired in the other frame. Only then are roles read.
3. **`roles.own` and `roles.other` come from the pool.** A vessel's roles are
   every non-`none` role a surviving forceful entry lays on her, from
   `effect.own` where she was the frame's own and from `effect.other` where
   she was the frame's other; `by` names the entry either way.
4. **`applied`, `scope`, `encounter`, `risk_of_collision`, `modalities` and
   `categories` stay own-frame.** They answer the fixture's entry-id `expect`
   as they do today, and a classification is the pair's already.
5. **A situation fixture may state `roles`.** `roles: {own: [{role, by}],
   other: [{role, by}]}` is the pooled, resolved answer for both subjects and
   binds an engine to it; `expect` stays the own-frame entry ids.
6. **No reciprocal entries.** They would double the table and every override
   edge, make `effect.other` redundant, and still need the override to reach
   across the pair.

## Consequences

- Four binding cases in `fixtures/situation-fixtures.json` carry `roles`:
  the crossing as written and the three encounters in the table above.
- `INV-PB-roles-exclusive` and `INV-PB-one-role-source` are stated over the
  pooled read, as the suite already asserts them.
- colregs-engine's `evaluateEncounter` changes to match; colregs-engine#85
  (the 13(d) latch ordering) is independent of this.
- 8(f)(iii)'s `none`/`none` and Q-35 are untouched: pooling adds no role,
  it only lets every entry see the entries it was written to override.

## Register

| item | level | what would settle it |
|---|---|---|
| Two frames, pooled, resolved, then roles — not reciprocal entries | ink | Solace, 2026-09-16 |
| Own-frame `applied`; pooled `roles` only | ✎ | a consumer needing the other frame's applied ids |
| Fixture `roles` as `{role, by}` per subject | ✎ | the engine's conformance replay consuming it |
