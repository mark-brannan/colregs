# ADR 0021 — Rule 20(c) is a modality shift, not a gate on the lights

Date: 2026-09-16
Status: proposed — merging this PR is the ruling; a revert undoes it

## Context

Rule 20 says when the Part C signals are shown. 20(b): the light rules are
complied with from sunset to sunrise. 20(d): the shape rules are complied
with by day. 20(c) sits between them — "The lights prescribed by these Rules
shall, if carried, also be exhibited from sunrise to sunset in restricted
visibility and may be exhibited in all other circumstances when it is deemed
necessary."

The table has always read as night for the lights: a light entry states no
time fact, so it is in force for every record, and the day shapes added with
Part C read `fact:time: time:day`. `known_omissions` recorded 20(b) and 20(c)
as unmodelled for want of a time fact and a visibility fact. `fact:time`
landed with the shapes; the omission record stayed.

Gating the lights on `time:night` would be wrong twice over.

- **Q-33.** Every constraint over an absent fact is unsatisfied, so that a
  duty is never laid on a vessel because a consumer left a field out. A
  `time:night` gate would silence every light for every record that omits
  time: at the time of writing, 76 of the 111 published fixture cases, every
  `colregs-engine` fixture, and every consumer record in `searoom` and
  `nav-wright`, no file in either of which mentions `fact:time`.
  `{"not": "time:day"}` fails the same way — `not` over an absent fact is
  unsatisfied too.
- **The paragraph.** Even with time on every record, exclusion is not what
  20(c) says. By day the prescribed lights are *required* in restricted
  visibility and *permitted* otherwise. They are never excluded.

So the data was the right reading for the facts that existed, and the
faithful model of 20(b)/(c) is not a gate at all: it is a change of modality
on a signal that stays in force (Solace, colregs#182).

## Decision

1. **`fact:visibility`**, an enumerated fact of the vessel's own record:
   `visibility:good`, `visibility:restricted`, cited to 3(l), which defines
   restricted visibility by its causes rather than by a distance.

   It sits in the fact record, beside `fact:time`, because a display
   consumer reads one vessel and never builds a situation. A two-subject
   rule reads the same fact through REQ-CAT-6's namespace, as
   `self:fact:visibility` and `other:fact:visibility`; there is no
   `pair:env:` twin, because the `env` class is symmetric by construction —
   both vessels are in the same channel — and a fog bank is not: one vessel
   can be in it while the other is not yet. Whether 19(a)'s second conjunct
   reads this fact, and from which subject, is `Q-56` and is open.

2. **A `modality_shifts` array in `data/applicability.json`**, a sibling of
   `suppressions`: the table of paragraphs that change the modality of
   signals other entries prescribe, rather than prescribing signals of their
   own. A record carries `id`, `jurisdiction`, `cite`, `applies_to`, `when`,
   `map` and a `note`. It is inherited by a jurisdiction the way an entry is.

   ```json
   { "id": "shift:20c", "jurisdiction": "intl", "cite": "20(c)",
     "applies_to": "lights",
     "when": { "fact:time": "time:day", "fact:visibility": "visibility:good" },
     "map": { "modality:shall": "modality:may",
              "modality:shall-if-practicable": "modality:may" } }
   ```

3. **Resolution order.** An entry's modality resolves first — its own value,
   or the `modality_by` branch whose predicate holds. Then every shift whose
   `when` holds is applied to the result. A modality that is not a key of
   `map` is left alone, which is how `modality:may` and `modality:exempt`
   stay out of it.

4. **A shift reaches signals, not entries.** `applies_to` names a signal
   kind, and the shift reaches an entry whose signals are all of that kind —
   its own, or the ones it imports under `rel:includes` and
   `rel:conditional_includes`. So 20(c) reaches `rule:26b_iii`, which shows
   no light of its own and imports 23(a)(iii)/(iv), and never reaches a day
   shape: 20(d) is unqualified and the shapes stay `modality:shall`.

5. **Absence keeps the duty.** Both facts must be stated for the shift to
   fire. A record that omits either keeps `modality:shall` — a permission is
   never granted by a missing field, the mirror of Q-33's rule for duties.

6. **20(b) and 20(c) move from `known_omissions` to
   `represented_paragraphs`.** 20(b) is the night default the table already
   is; 20(c) is the shift. The registry, which held `category:care` and
   `category:meta` under REQ-CAT-2, now also admits `category:scope`: what it
   states is that a paragraph is in the model and is no entry, and that is
   true of all three categories.

The tail of 20(c), "when it is deemed necessary", is the mariner's
judgement, and no fact in this package carries it. Nothing is dropped by
leaving it out of the predicate: `modality:may` lays no duty either way, so
the permission is stated at exactly the strength the paragraph gives it.

## Alternatives

- **Sixty `modality_by` copies.** Every light entry gains the same two-branch
  table over facts its own paragraph never mentions, 20(c) appears nowhere as
  a norm, and every light entry written afterwards has to remember to copy
  it. Drift by construction.
- **A seventh relation verb.** The six verbs act on displays (ADR 0019) —
  which signals are shown, and which of two applicable paragraphs prevails.
  None changes another entry's modality, and a new verb for one paragraph is
  a large change to a vocabulary that is otherwise settled.
- **An entry citing 20(c).** It prescribes no signal, so it would be an entry
  with an empty output whose whole content is a side effect on other entries.
- **The engine.** A special case in `evaluateDisplay` would put the reading
  in code and leave the data saying nothing, when ADR 0014 puts the interface
  *and* the model here, and every other implementation would have to
  rediscover it.

## Consequences

- No published fixture or consumer record changes its output: the shift needs
  two facts and no published record states `fact:visibility`.
- `fixtures/applicability-fixtures.json` gains Q-5's `{entry, modality}`
  expect form, until now carried only by the situation fixtures. The three
  boundary fixtures Q-5 asks for — `rule:23a_ii`, `rule:26b_ii`, `rule:30c` —
  are still to write.
- `colregs-engine` applies the shift in `evaluateDisplay`. The per-light
  `modality` already exists in the display envelope, so no schema changes
  there.
- `suppressions` keys on entry ids, so no jurisdiction can tombstone a shift
  today. None needs to: 20(c) is inherited unchanged under `us/inland`.
- **Cost to reverse.** Delete `modality_shifts` from the data and the schema,
  the resolver and five tests, three fixtures, `fact:visibility` and its two
  labels, and the two registry records; restore the `known_omissions` entry.
  No consumer reads any of it yet. Pre-1.0, a revert.
