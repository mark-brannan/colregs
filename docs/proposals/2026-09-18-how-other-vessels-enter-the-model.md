# How other vessels enter the model

Date: 2026-09-17; reframed as a proposal 2026-09-18
Level: `?` (open, `docs/conventions.md`). This is a proposal, not an ADR.
It adopts nothing and supersedes nothing, and it claims no ADR number.
Nothing in it has been ruled. It records the suggestions of two design
sessions, one per proposal below, and is held open for a tentative
decision alongside the other design write-ups of the same week, which are
expected to be rewritten together, merged or discarded. Merging this PR
settles nothing. colregs-engine#82 and ADR 0023 are earlier proposals on
the same ground and are treated the same way.

## The question

The Rules bind vessels in pairs ("two vessels", "the other vessel") and
bring the rest in as "prevailing circumstances" and traffic. Four things
are open:

1. whether a pair is a thing in the model at all, or only a bucket for
   relative geometry;
2. whether a two-vessel encounter is its own operation or a branch of
   evaluating traffic;
3. whether the reduction of other vessels to sector facts is something a
   caller ever needs on its own;
4. where environment (channel, lane, visibility) lives, since it is a place
   and not a property of a pair.

## What the Rules say

Measured over the body text of `data/text/intl/2016/en-US.uscg.json`,
212 paragraphs, Rules 1–31.

| term | hits | where |
|---|---|---|
| pair, encounter, relative, each other, both vessels, mutual | 0 | no noun for the relation |
| "two vessels"; "one another" | 3; 5 | 8(f)(iii), 13(d), 17(a)(i); 3(k), 11, 12(a), 19(a) |
| "the other vessel"; "another vessel"; "other vessels" | 6; 14; 5 | singular is the pair; plural is 6(a)(ii) density, 9(f) obscured, 26(d) proximity, 30(e) where they navigate |
| "traffic" | 24 | 20 name a Rule 10 place (scheme, lane, flow); one is 6(a)(ii) "traffic density" |
| "prevailing circumstances and conditions"; "circumstances of the case" | 5; 5 | 5, 6, 7(a), 19(b), 19(c); 8(b), 8(f)(i), 15(a), 17(c), 18(d)(i) |
| "environment" | 0 | SignalK's word, not the Rules' |
| narrow channel; fairway; traffic lane | 8; 9; 6 | always a vessel proceeding along, navigating within, crossing, following |
| observed visually; detects by radar; hears | 3(k), 8(b); 7(b), 19(d); 19(e) | Rule 5 "by sight and hearing" |

Every relational fact the Rules use is stated from one vessel: 13(b) "in
such a position with reference to the vessel she is overtaking ... she
would be able to see only the sternlight", 14(b) "a vessel sees the other
ahead", 15(a) "the vessel which has the other on her own starboard side",
7(d)(i) "the compass bearing of an approaching vessel", 19(d) "detects by
radar alone the presence of another vessel". Range is attributed to an
observer both times it is measured, 6(b)(vi) and 7(d)(ii). The one mutual
relation is 3(k), in sight of one another; 19(a) keeps it apart from
restricted visibility by requiring both. The doubt provisions, 12(a)(iii),
13(c) and 14(c), are one-sided.

Multi-vessel reasoning is per vessel, not aggregate: 8(c) "another
close-quarters situation", 19(d)(i) "a vessel forward of the beam", 19(e)
"a close-quarters situation with another vessel". The one aggregate is
6(a)(ii) "traffic density", a factor in safe speed. 2(b) says "the vessels
involved".

What the data reads, counted in `data/applicability.json`:
`pair:geo:in_sight` 22 predicates; `pair:geo:risk_of_collision`, `tcpa_s`,
`bearing_change_deg_min` 7, 3, 1; `pair:env:narrow_channel`, `traffic_lane`
2, 2; `self:geo:rel_bearing_deg`, `other:geo:rel_bearing_deg` 6, 7;
`self:hist:was_overtaking`, `other:hist:was_overtaking` 5, 17;
`traffic:*` 0.

What colregs-engine#82 gathered: role assignment is pairwise by text (12,
13, 15, 18) and in the case law (*Nordlake*, *Burgan*); whether a
compliant action exists is not (the NTSB *Fitzgerald* finding). Both
proposals accept that split and differ on what follows from it.

## Proposal A: the encounter record carries facts; traffic is a fold over encounters

Suggested 2026-09-17. It keeps the current shape and adds a traffic
operation beside it.

```ts
interface Encounter { self: Vessel; other?: Vessel; pair?: Pair; traffic?: TrafficFacts; }
interface Pair      { geo?: PairGeometry; env?: Environment; }
interface Traffic   { encounters: Encounter[]; }
evaluateEncounter(e: Encounter): EncounterEvaluation;
evaluateTraffic(t: Traffic): TrafficEvaluation;          // every encounter, plus conflicts
deriveTrafficFacts(t: Traffic, opts?): TrafficFacts;     // traffic:<sector>:<key>
```

- **The record carries facts, never a list of vessels.** A verb handed
  vessels it does not read is lying or acquiring semantics; a `Vessel`
  requires a fact record and a radar contact has none; facts are checked,
  not derived (`docs/identifiers.md`), so a fixture states
  `traffic: { starboard: { nearest_nm: 0.8 } }` rather than placing three
  vessels so a reduction yields it.
- **`pair` stays as the third subject, under that name.** Range is one
  number, of neither vessel; a radar contact is a `pair` range and a `self`
  bearing. The Rules offer no noun, and the vocabulary method keeps a model
  word where the Rules have none (`Display`, `Finding`, `self`). It is a
  subject segment read by 37 predicates, where a rename should buy
  alignment and none does. `between` is the runner-up (Rule 18's title);
  `approach` fails on `in_sight`; `relative` collides with `rel:`.
- **The encounter is the unit; traffic is a fold.** `evaluateTraffic`
  evaluates each encounter under the traffic facts derived from the rest
  and reports conflicts. Stated as a law for a conformance test: for every
  `i`, `evaluateTraffic(t).encounters[i]` equals
  `evaluateEncounter({ ...t.encounters[i], traffic: deriveTrafficFacts(without(t, i)) })`.
- **`Traffic` is a list of encounters, not one `self` and many `others`,**
  because `self:geo:rel_bearing_deg` and `self:hist:was_overtaking` are
  self's facts toward *that* other; a shared `self` has one bearing and n
  others need n. `self.fact` and `self.kin` are checked equal across
  elements.
- **`deriveTrafficFacts` is public** so that a caller of the departure
  operation, and a conduct evaluation per sample, can derive the same
  sector facts the engine does. It derives `count` and `nearest_nm` per
  sector and no judgement; `foreclosed` is a judgement against the
  departure model's separation and is caller-stated or dropped.
- **Environment stays on `pair` for now**; where it goes is left to the
  conduct-input proposal (#193).

Alternatives it rejected: `others?: Vessel[]` on the record with the engine
deriving (the three reasons above); dropping `evaluateEncounter` for a
one-element `Traffic` (callers read `encounters[0]`); `deriveTrafficFacts`
internal (no engine producer for the departure input); `Traffic { self,
others[] }` (loses self's per-other geometry).

## Proposal B: contacts carry the relation; there is no pair

Suggested 2026-09-18, after the measurements above. The Rules speak from
one vessel about another, and every relational fact they use is
directional; the mariner's noun for the other vessel as known from own
ship is a *contact*.

```
Encounter                   the case as appraised from own vessel (Rule 5)
├─ self: Vessel             her facts, kinematics, and what she is doing in the
│                           waters: 9(a) "proceeding along", 9(d) "cross",
│                           10(b) "using", 10(i) "following"
├─ contacts: Contact[]      every other vessel as known from self
│    ├─ observed            sight | radar | hearing         3(k), 19(d), 19(e)
│    ├─ bearing, range, bearing change                     7(d), 6(b)(vi)
│    ├─ aspect              which of her lights self sees  13(b), 14(b)
│    ├─ cpa, tcpa           if plotted                     7(b)
│    ├─ risk of collision   determined | deemed            7(a), 7(d)(i)
│    └─ vessel: Vessel      as far as known; may be empty  12(a)(iii)
└─ circumstances            "prevailing circumstances and conditions"
     ├─ visibility          3(l), 19(a) "area of restricted visibility"
     ├─ waters              open | narrow channel or fairway | separation scheme
     ├─ traffic density     6(a)(ii)
     └─ wind, sea, current, hazards, depth, background lights   6(a)
```

Two questions read the record, distinguished by what they ask, not by how
many vessels are present:

| question | Rules | reads | answer |
|---|---|---|---|
| responsibilities toward her | 11–18, 19 | self, one contact, circumstances | situation and responsibilities, per contact |
| action | 8, 16, 17, 19(d)(e), 2(b) | self, all contacts, circumstances | compliant, conflicts, departure necessary |

Lights, safe speed and look-out read self and circumstances, no contacts.

- **No pair.** The symmetric quantities (range, CPA, in sight) lose
  nothing stored on the contact, since the encounter is appraised from self
  as the Rules are written, and the other vessel's frame (ADR 0016's
  pooling) is derivable from bearing and aspect. A symmetric record cannot
  hold what the Rules say most about the relation, which is knowledge and
  doubt; a contact can, and it makes the radar-only case of Rule 19 the
  ordinary case of an empty `vessel` rather than an exemption from needing
  a fact record. This answers Proposal A's first reason for facts over
  vessels, and removes the bucket `env` was dropped into.
- **Neither an own operation nor a branch.** Responsibilities are pairwise
  by text, so n contacts are n answers, and a map is not a concept. What is
  n-ary is action, 8(c), 19(e) and 2(b), and that is where a conflict
  report belongs. No Rule makes a role depend on a third vessel, which
  matches the zero predicates reading `traffic:*`.
- **No sector reduction.** The Rules' only aggregate is 6(a)(ii), a
  circumstance the caller states; their multi-vessel reasoning is per
  contact. Quadrant counts are at most a solver internal.
- **Environment splits by what the Rules attach it to.** Conditions of the
  area are `circumstances`, the Rules' own word, with Rule 6(a) as a
  ready-made field list. A vessel's relation to the place is a vessel fact:
  9(b) "can safely navigate only within", 9(d) crossing versus "that
  channel", 10(i) "following a traffic lane". In sight is a contact fact.
- **`traffic` names what the Rules name with it:** a Rule 10 place and a
  Rule 6 density. The collection is `contacts`; `others` is the alternative
  that echoes "other vessels".

Open inside B: the enumeration under `waters` and a vessel's relation to
it; whether `encounter` survives as the record noun once the record can
hold several vessels; whether the responsibilities and action questions
share one record type or two.

## The two proposals side by side

| question | A | B |
|---|---|---|
| is a pair a thing | yes, the third subject, name kept | no; the relation lives on the contact |
| the two-vessel encounter | its own operation; traffic folds over it | one record; responsibilities per contact, action over all |
| sector reduction on its own | public, `deriveTrafficFacts` | none; density is a stated circumstance |
| where environment lives | on `pair` until #193 decides | `circumstances` for the area; a vessel fact for her relation to it; the contact for in sight |
| the word `traffic` | the collection and its operation | Rule 10 places and Rule 6 density only |
| what a radar-only contact is | a `pair` range and a `self` bearing, no fact record | a contact with `observed: radar` and an empty `vessel` |
| both agree | roles pairwise, action existence not; conflicts are about action; `foreclosed` is a judgement, not geometry |

## What would settle each

Every row is `?`. The column says what evidence would move it; the
decision is deferred to the joint rewrite of this week's design write-ups.

| item | level | evidence that would settle it |
|---|---|---|
| pair as a subject, or the relation on the contact | `?` | a fixture the other shape cannot express without loss: a one-sided doubt (12(a)(iii)) for B, a genuinely symmetric fact neither vessel owns for A |
| encounter as its own operation, or per-contact answers from one record | `?` | whether any grid entry ever reads a third vessel to assign a role; today none does |
| sector facts as a public derivation | `?` | a consumer that needs them without an evaluation; today none exists |
| environment on the pair, on the case, or on the vessel | `?` | the first grid entry that must distinguish a vessel following a lane from one crossing it (9(d), 10(c)) |
| `traffic` as a collection noun | `?` | the vocabulary pass's other rulings on collection nouns, taken together |
| `between`, `contact`, `contacts`, `others`, `circumstances`, `waters` | `?` | the same rewrite; none is settled |
