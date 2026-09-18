# Part D signals are entries; the trigger is an act class, not an event dimension

Date: 2026-09-17; reframed as a proposal 2026-09-18
Status: proposal, not a ruling — an agent's suggestion, held open with ADR
0023 (#191) and ADR 0026 (#195), to be rewritten together, merged or
discarded. It claims no ADR number. Nothing below is built on until ruled.
Answers Q-1 in pencil.

## Context

`REQ-PART-3` says Part D SHOULD fit the entry model, and that if it does not
— signals are event-triggered rather than state-derived — the divergence is
recorded as an ADR before any Part D data is written. `Q-1` asks whether
the signals need an event dimension; ADR 0005 §1 left Part D uncategorised
on the same question.

Two consumers wait on it: searoom's sound mode is a stub signposted on Q-1
(searoom#89), and the encounter work (ADR 0016) produces the manoeuvres Rule
34 announces, so a Rule 34 signal is the third panel of an encounter.

The question turns on what a signal's *trigger* is, paragraph by paragraph,
read against the International text (USCG Navigation Rules Handbook, the
2016 corpus in `data/text/intl/2016`):

- **Rule 35** is state. Every paragraph is a conjunction over facts the
  record already carries — `fact:visibility` (ADR 0021), the three axes,
  `fact:making_way`, `fact:length_m`, `fact:composite_unit` — and the
  paragraph is in force for as long as the state holds. "At intervals of not
  more than 2 minutes" is a property of the signal, not of the predicate.
- **Rule 34(a)–(d)** is not state. "When manoeuvring as authorized or
  required by these Rules" fires on what the vessel *is doing*: altering
  course to starboard or port, operating astern propulsion, intending to
  overtake, agreeing to be overtaken, being in doubt. None of these is a fact
  of the record or of the situation as declared today. `kin:rot_deg_min` is
  the nearest and is wrong twice: a one-degree wander is not an alteration,
  and astern propulsion has no kinematic signature.
- **Rule 34(e)** is state again, a place like `fact:near_channel`; Rules
  32, 33, 34(f) and 36 prescribe no signal at all.

So the divergence REQ-PART-3 anticipates is real, and smaller than an event
dimension: five paragraphs need to read the manoeuvre self is making. The
package's founding constraint settles what that is: nothing here decides
what a vessel is doing; the consumer supplies it. The helm knows the wheel
is over the way it knows `fact:making_way`, which is why `actuable_subset`
says to ask for that rather than derive it. A manoeuvre is the same kind
of fact: stated by the vessel, about now.

## What is proposed

1. **Part D signals are applicability entries.** Same `when` → output →
   `modality` → `cite` → `jurisdiction` shape, same six relations, same
   fixtures and drift test, same jurisdiction delta (ADR 0018). The output
   key is `signal`, a sibling of `lights` and `shapes`, and REQ-PART-2's
   rule holds for it: the parts differ only in the vocabulary they emit.

2. **`act`, a sixth class of the situation record**, beside `fact`, `kin`,
   `geo`, `hist` and `env`: what a subject is doing or intending at this
   instant. `self` and `other`; the other's acts are what self hears, decoded
   by the consumer as the other's lights already are into `other:fact:`.
   Every `act` key is `actuable: true`, boolean or a short enumeration, and
   absent unless the consumer states it. Absence fires nothing (`Q-33`), so
   a signal is never demanded because a field was left out. The first data
   reads only `self:act:`.

   | key | values | read by |
   |---|---|---|
   | `act:alter_course` | `alter_course:starboard`, `alter_course:port` | 34(a), 34(b) |
   | `act:astern_propulsion` | boolean | 34(a), 34(b) |
   | `act:overtake_intent` | `overtake_intent:starboard`, `overtake_intent:port` | 34(c)(i) |
   | `act:overtaking_agreement` | boolean | 34(c)(ii) |
   | `act:doubt` | boolean | 34(d) |

   `act` is a class of the *situation*, not the fact record: every paragraph
   reading it also reads `pair:geo:in_sight`, so a lights-only consumer never needs it.

3. **`data/sounds.json`** is to Part D what `lights.json` is to Part C: the
   elements — `sound:short_blast`, `sound:prolonged_blast`,
   `sound:bell_rapid`, `sound:bell_stroke`, `sound:gong_rapid`, and
   `flash:manoeuvring` for 34(b), which reads `light:flashing` — each with
   its Rule 32 or Annex III duration and appliance. Rule 33's carriage
   thresholds live there as a standard, as Rule 22's ranges do in
   `lights.json`.

4. **A `signal` is a sequence with a repeat.** `{"sequence": [<element
   id>…], "repeat": {"max_interval_s": 120}}`, with `gap_s` where a
   paragraph states one (35(b), 34(b)(ii)) and `placement` where one does
   (35(g)). Two sequences are two entries; 35(g)'s "may in addition" whistle
   is its own `modality:may` entry.

5. **Category and subjects.** Every Part D entry is `category:display`: the
   category names what an entry *produces* — a signal and a modality — and
   `subjects` already names what it reads. Rule 35 entries are one-subject;
   Rule 34(a)–(d) entries are `subjects: 2`, and are the first display
   entries to read a situation. `evaluateEncounter` gains a `signals` field
   carrying them, in the shape `DisplayEvaluation` gives lights.

6. **Two per-vessel booleans.** `fact:nearing_obscured_bend` for 34(e), a
   place fact in the family of `fact:near_channel`; `fact:manned` for 35(e).

7. **Represented, not entries.** Rule 32 (`category:definition`), Rule 33
   and 34(f) (`category:standard`), and Rule 36 (`category:display`, with
   no closed output: "signals that cannot be mistaken" is a constraint on
   the vocabulary, not a member of it) go to `represented_paragraphs`.
   Rule 37 points at Annex IV and is not decided here.

## The paragraphs

Every row fits either candidate model without a special case; they differ only in where the row lives.

| cite | subjects | trigger | reads | output | modality |
|---|---|---|---|---|---|
| 34(a) | 2 | act | `pair:geo:in_sight`, `self:fact:propulsion: power`, `self:fact:position: underway`, `self:act:alter_course` or `self:act:astern_propulsion` | 1, 2 or 3 short blasts | shall |
| 34(b) | 2 | act | as 34(a), any vessel | 1, 2 or 3 flashes of `light:flashing` | may |
| 34(c)(i) | 2 | act | `pair:geo:in_sight`, `pair:env:narrow_channel`, `self:act:overtake_intent` | 2 prolonged + 1 or 2 short | shall |
| 34(c)(ii) | 2 | act | `pair:geo:in_sight`, `pair:env:narrow_channel`, `self:act:overtaking_agreement` | prolonged, short, prolonged, short | shall |
| 34(d) | 2 | act | `pair:geo:in_sight`, `self:act:doubt` | ≥5 short rapid blasts; flashes may supplement | shall |
| 34(e) | 1 | state | `fact:nearing_obscured_bend` | 1 prolonged | shall |
| 35(a) | 1 | state | `fact:visibility: restricted`, power, underway, `fact:making_way: true` | 1 prolonged, ≤2 min | shall |
| 35(b) | 1 | state | as (a), `fact:making_way: false` | 2 prolonged, 2 s apart | shall |
| 35(c) | 1 | state | restricted; activity in {nuc, ram, cbd, fishing, towing, pushing} or sail; underway | prolonged + 2 short; `rel:in_lieu_of` 35(a)/(b) | shall |
| 35(d) | 1 | state | restricted; fishing or ram; `fact:position: anchored` | as 35(c); `rel:in_lieu_of` 35(g) | shall |
| 35(e) | 1 | state | restricted; `activity:being_towed`; `fact:manned` | prolonged + 3 short | shall |
| 35(f) | 1 | state | restricted; `fact:composite_unit` | `rel:includes` 35(a)/(b) | shall |
| 35(g) | 1 | state | restricted; anchored; split at 100 m | bell 5 s, ≤1 min; +gong aft ≥100 m | shall |
| 35(g) warning | 1 | state | as 35(g) | short, prolonged, short | may |
| 35(h) | 1 | state | restricted; `position:aground` | 3 strokes, bell (and gong), 3 strokes | shall |
| 35(i), (j) | 1 | state | restricted; length bands 12–20 m and <12 m | `rel:exempts` the bell/gong entries; "some other efficient signal", ≤2 min | shall |
| 35(k) | 1 | state | restricted; `activity:pilot` | 4 short, in addition | may |
| 36 | — | — | represented | none closed | may |

Three things the table does not carry, left visibly open: 34(e)'s *answer*
is the same signal from the same entry, fired from the other vessel's own
record, with the answering *timing* unmodelled, nor is 35(e)'s "immediately
after the towing vessel's signal"; 34(a)'s "as authorized or required by
these Rules" is not read, and whether every alteration in sight is within
it is doctrine with no source here yet; 35's "in or near" reads
`visibility:restricted`, stated by the consumer when near, and a
`near_restricted` value would settle it if one needs more.

**On 34(d) and Q-41.** 13(c) and 14(c) are omissions because they make the
*absence* of a fact assert something, and a `doubt` boolean was named as
the alternative cost. 34(d) is the other shape: doubt triggers an act, and
the act — five short blasts — *is* the report of the doubt, already made
on the whistle. Absence stays silent. Q-41 is not decided here: 13(c) and
14(c) stay in `known_omissions`, and whether their "in doubt" is
`act:doubt` is for that question.

## Alternatives

- **A separate signal table keyed by (paragraph, trigger).** The same
  predicates appear, one per row, in a second file with its own predicate
  walker, its own `in_lieu_of` (35(c), 35(d)), its own `includes` (35(f)),
  its own `exempts` (35(i), (j)), its own fixtures and drift test, and its
  own jurisdiction delta the day `us/inland` Rule 34 lands — where 34(a) is
  intent rather than action, 34(c) is short blasts, 34(g) and 34(h) exist
  and 35 renumbers. Everything the table would need already exists once,
  keyed by entry id. The one thing it adds, a closed sound vocabulary with
  durations, is `data/sounds.json` under either model.
- **An event dimension.** A timestamped stream beside the situation, with
  Rule 34 entries reading "an alteration began". That is ADR 0012's trace,
  which `evaluateConduct` already reads. But a signal is due at the instant
  the manoeuvre is made, from the vessel making it, and she needs no window
  to know that. The trace judges whether the manoeuvre was right; the
  signal reads the act.
- **Deriving the act from kinematics.** `kin:rot_deg_min` past a threshold
  invents a number no paragraph states, misses astern propulsion, and puts
  the package in the business of deciding what a vessel is doing.

## Consequences

- `Q-1` is answered in pencil: Part D fits the entry model with one fact
  class, not a dimension. `REQ-CAT-6`'s class list gains `act`; ADR 0005
  §1 gives Part D `category:display`, logged in its pencil register.
- The data — `sounds.json`, the `act` class in `facts.json`, the two
  booleans, the Rule 34 and 35 entries, fixtures on both sides of every
  gate, situation fixtures for Rule 34, `signal` in the schemas and
  `light:flashing`'s Annex I §12 manoeuvring-light use — is a follow-up
  issue, not this PR.
- `colregs-engine`: `evaluateDisplay` emits Rule 35 unchanged in shape;
  `evaluateEncounter` gains `signals`. searoom then needs nothing beyond
  the data: elements with durations to synthesize, entries to quiz forward
  (facts → signal) and reverse (signal → `when`), and the encounter panel's
  Rule 34 row from `signals`.
- **Cost to reverse.** Nothing shipped: delete this file, restore Q-1 and REQ-CAT-6, close the data issue.

## Register

| item | level | what would settle it |
|---|---|---|
| Entries, not a second table; no event dimension | ✎ | the first Rule 34 entry landing against `evaluateEncounter` |
| `act` as a situation class, self and other | ✎ | a consumer needing `act` without a situation, or `other:act` read by an entry |
| The five `act` keys and their values | ✎ | the data issue; a paragraph they cannot express |
| Part D is `category:display`, `subjects` carries the rest | ✎ | a Part D entry needing an `effect` |
| `signal` as sequence + repeat; `sounds.json` elements | ✎ | searoom synthesizing from it |
| 34(a)'s "authorized or required" unread | ✎ | a doctrine source |
| 34(d) reads `act:doubt`; Q-41 untouched | ✎ | Q-41's ruling |
