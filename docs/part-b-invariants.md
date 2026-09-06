# Part B invariants — Rules 13–19

Status: **sketch**, seeded 2026-09-06 (P4.1 of the formal-methods epic,
[colregs-engine#1](https://github.com/mark-brannan/colregs-engine/issues/1)).
Bound by `REQ-INV-1`–`REQ-INV-6` in `docs/requirements.md` §4.2.

Everything in this file is `✎` **pencil** under `docs/conventions.md` unless a
block says otherwise — it is a first statement of Part B's steering and sailing
rules as invariants, written so a TLA+ or Rocq formalisation can be built from
it without going back to the rule text. Each block names what would settle it.

**What this file is.** Prose invariants over the *situation record* of
`REQ-CAT-4`, extended to a trace. Each has a stable identifier, cites the
paragraph it comes from, and — where the rule is temporal — says what must be
remembered and over what window. The temporal notes are the part P4.2 (TLA+
two-vessel protocol) and P4.3 (three-vessel) build on directly.

**What this file is not.** It is not `data/applicability.json`. An entry says
which norms a *state* selects; an invariant says what must hold of a *trace*,
including the things no predicate at a point can express. Where an entry
already exists the block names it, so the two can be checked against each other
rather than drifting. It is also not a restatement of the rules: a paragraph
whose content this file declines to formalise is listed in
[Not formalised here](#not-formalised-here) with the reason, so that Goal 4's
coverage claim — every paragraph covered or explicitly excluded — is auditable
rather than assumed.

**It states no maritime doctrine.** Every proposition here is either the rule
text, arithmetic over the rule text, or a decision recorded as such. Where the
text admits two readings, both are written down and the choice is deferred to
an open question in `docs/requirements.md` §11 rather than taken here.

---

## The identifier scheme `✎`

An invariant id is `INV-` followed by the entry-id derivation of the paragraph
path it cites — lowercased, parentheses dropped, roman sub-paragraph numerals
as arabic digits, exactly as `docs/identifiers.md` §"Entry ids" derives an
entry id — and, where one paragraph yields more than one invariant, a
hyphenated suffix naming what distinguishes them.

| paragraph | invariant id |
|---|---|
| `13(d)` | `INV-13d` |
| `17(a)(ii)` | `INV-17a2-trigger`, `INV-17a2-permission` |
| `16` | `INV-16` |

Three properties, in the order they matter:

- **Insertion is free.** A new invariant on a paragraph appends a suffix; it
  never renumbers a neighbour. A sequential scheme (`INV-1`, `INV-2`) would
  also append, but only at the end of the file, which puts new material as far
  as possible from the material it belongs with.
- **The suffix names something, and is not an ordinal.** This is
  `docs/identifiers.md`'s decision about entry-id suffixes applied again, for
  its own reason: `INV-17a2-1` and `INV-17a2-2` are self-consistent and tell a
  reader with the rule text in front of them nothing, in exchange for no gain
  to a machine, which only compares ids for equality.
- **The paragraph is the unit**, as it is everywhere else in this package
  (ADR 0001). An invariant that reads more than one paragraph takes the id of
  the paragraph stating its operative content and cites the rest — the same
  move entry `14b` makes in citing 14(b), the deeming paragraph, while reading
  14(a)'s risk-of-collision condition.

The cost, recorded rather than hidden: a paragraph path that keeps its spelling
and changes its text across a jurisdiction breaks the id's meaning, and `Q-8`
verified that this is not hypothetical — fifteen Part C paths mutate that way
between COLREGS and 33 CFR 83. Invariant ids inherit the mitigation entry ids
already use: jurisdiction is a dimension (`REQ-SCOPE-2`), so a `us/inland`
invariant on the same path is a different record, not a redefinition of this
one. Nothing here is `intl`-only by accident; only `intl` is populated.

`INV-` is a type prefix on a citation-derived name, which is the one place this
scheme departs from `docs/identifiers.md`'s "citation-derived identifiers are
bare". It is deliberate: `13a` is already an entry id, and an invariant on
13(a) is a different object. The prefix keeps the two namespaces from
colliding, the same way `REQ-` does.

**Settled by** P4.2 citing these ids from a TLA+ module. Until something cites
them they are cheap to change; after that they are the most expensive thing in
this file, which is why the scheme is stated before the content.

---

## The model these invariants are stated over `✎`

A **situation** is the record of `REQ-CAT-4` and `REQ-CAT-6`: two per-vessel
fact records, a kinematic state each, relative geometry, history, and the
environment, addressed as `<subject>:<class>:<key>` with subject from
`own`/`other`/`pair`.

A **trace** is a sequence of situations for one ordered pair of vessels,
sampled at times *t*₀ < *t*₁ < … . Every invariant below is either a property of
a single situation in a trace (written "at every state") or a property relating
two or more states (written "at every state after", "from the first state at
which", and so on). The distinction is the whole content of §4.1's `conduct`
category, and it is why an entry cannot carry these: an entry is evaluated at a
point.

An **encounter** is a maximal segment of a trace in which the two vessels are
in a relationship the Rules reach. This file does not fix the segmentation —
where an encounter begins and ends is `Q-47`'s question and is unsettled — but
several invariants are scoped to "the same encounter", and for those the
segmentation is load-bearing. It is named here so that a formalisation must
choose one explicitly rather than assume one.

**Roles** are the closed set of `data/applicability.json`'s `effects.roles`:
`give-way`, `stand-on`, `shall-not-impede`, `keep-clear`, `none`. **Encounter
types** are `head-on`, `crossing`, `overtaking`, `none`.

**Sections.** Part B Section I is Rules 4–10, Section II is Rules 11–18,
Section III is Rule 19. Which of them governs a pair is `INV-19a-scope`.

---

# Rule 13 — Overtaking

Rule 13 is the temporally hardest rule in Section II, and the reason `hist` is
a fact class rather than a note. Its four paragraphs do four different things:
13(a) assigns a role, 13(b) deems the encounter, 13(c) resolves doubt, and
13(d) latches the result against the geometry that follows.

### INV-13b — the overtaking deeming test

- **Cites** 13(b), read under 11.
- **Kind** classification; a property of a single state.
- **Status** `✎` pencil.

**Invariant.** At any state at which the two vessels are in sight of one
another and both are underway, own is deemed to be overtaking other exactly
when own is coming up with other and own bears, from other, more than 22.5°
abaft other's beam — that is, `other:geo:rel_bearing_deg` strictly inside
(112.5°, 247.5°). The sector is open at both ends: 13(b) says *more than* 22.5°
abaft the beam, so a vessel exactly on the edge is not overtaking. The sector's
two edges are the forward edges of the sternlight arc of Rule 21(c), which is
what 13(b)'s second limb — at night she would see only the sternlight and
neither sidelight — states in light terms.

**Undetermined term.** "Coming up with" is a comparison of the two vessels'
speeds and the model has no fact-to-fact comparison (`Q-46`). `13b-overtaking`
substitutes `pair:geo:tcpa_s > 0` — the pair is closing — which excludes the
vessel drawing away astern and admits a pair closing because the vessel ahead
has stopped. A formalisation with two speeds available should compare them and
say so; this invariant states the rule, not the substitute.

**Not stated by 13(b).** The paragraph says nothing about risk of collision.
See `Q-49`.

**Data today.** Entries `13b-overtaking` and `13b-overtaken`;
`situation.constants.overtaking_sector_from_deg` / `_to_deg`, both ink.

**Settled by** the Alloy sector model of P2.2, which will either show the
sector and its complement partition the bearing circle or produce the bearing
that falls in both.

### INV-13b-pair — overtaking is a property of the pair

- **Cites** 13(b).
- **Kind** classification, derived; a property of a single state.
- **Status** `✎` pencil.

**Invariant.** Where `INV-13b` holds of own with respect to other, the
encounter type of the pair is `overtaking` read from *either* subject. The
vessel being overtaken is in an overtaking, not in a crossing, even though the
overtaking vessel bears forward of her beam.

**Why it is separate.** Reading only one subject's relative bearing classifies
the overtaken vessel's side of the same encounter as a crossing, which put two
encounter types on one pair. The data needed two entries for this and this file
needs a named invariant, because a formalisation that carries encounter type
per vessel rather than per pair will reproduce the bug.

**Data today.** The pairing of `13b-overtaking` and `13b-overtaken`, whose
`when` clauses are each other with the subjects swapped.

**Settled by** P4.2 carrying encounter type on the pair and TLC finding no
state where the two subjects disagree.

### INV-13a — the overtaking vessel keeps out of the way

- **Cites** 13(a).
- **Kind** precedence; a property of a single state.
- **Status** `✎` pencil.

**Invariant.** At every state at which the encounter type is `overtaking`, the
overtaking vessel holds `give-way` and the overtaken vessel holds `stand-on`,
and these roles displace any role that Rules 4–18 would otherwise assign to
either vessel. 13(a) opens "notwithstanding anything contained in the Rules
4-18", and Rules 4–18 are exactly Part B Sections I and II, so the displacement
reaches Rule 12 and Rule 18 as well as Rules 14 and 15.

**Note on the text.** The source `data/rules.json` uses is the USCG
amalgamated page, which renders the international "the Rules of part B,
sections I and II" as "the Rules 4-18". The two name the same span; nothing
here turns on the difference.

**Not stated by 13(a).** No risk-of-collision condition; see `Q-49`.

**Data today.** Entry `13a`, whose `rel:overrides` names all eleven Rule 18
entries and all three Rule 12 entries.

**Settled by** P4.2's role assignment, where the override either is or is not
needed to keep "never both give-way" true.

### INV-13d — the latch: the classification survives the geometry

- **Cites** 13(d).
- **Kind** classification, **temporal**; relates a state to every later state
  of the same encounter.
- **Status** `✎` pencil.

**Invariant.** Let *s* be the first state of an encounter at which own is
deemed to be overtaking other. Then at every state of that encounter after *s*,
and until own is finally past and clear of other, the encounter type of the
pair is `overtaking`, whatever the relative bearings are at that later state.
In particular it is not `crossing`, and the head-on and crossing tests of
Rules 14 and 15 do not apply to the pair.

**State remembered.** One directional boolean per subject per encounter — own
was, at some earlier state of this encounter, the overtaking vessel — plus, for
a monitor that needs to say when the duty attached, the time of *s*. The window
is from *s* to the state at which own is finally past and clear. An invariant
that reads only the state it is evaluated at is wrong here, and wrong in the
specific direction the paragraph exists to forbid: the instantaneous geometry
of an overtaking that has drawn out on the bow says *crossing*, and hands the
give-way duty to the wrong vessel.

**Undetermined term.** "Finally past and clear" has no fact behind it and no
threshold in the Rules. In the data the latch is set and cleared by the
consumer and never clears itself (`Q-47`); in a trace model it is the encounter
segmentation the model chose. Not approximated with a range or a bearing here,
because a number for it would be invented rather than cited.

**Readings in doubt.** Two, both handed to Mark:

- What arms the latch — 13(b)'s deeming, or 13(a)'s duty actually attaching?
  They differ where the geometry holds but some condition on 13(a) does not.
  `Q-50`.
- What the latch forbids — reclassification to *crossing* only, which is what
  13(d) says in terms, or reclassification at all, which is what "or relieve
  her of the duty of keeping clear" achieves for the duty and leaves open for
  the encounter type. `Q-51`.

**Data today.** Entry `13d`, reading `own:hist:was_overtaking` and
`other:hist:was_overtaking` and no geometry at all; the counterpart
`hist:was_overtaking: false` gates on `14b`, `15a-crossing` and
`15a-give-way`. Note the current data implements the *broad* reading of
`Q-51`: `13d` produces `encounter: overtaking`, and the false-gates keep
head-on and crossing off the pair as well.

**Settled by** `Q-50` and `Q-51`, and then by TLC: a three-state trace in which
an overtaking draws out onto the bow is the smallest counterexample generator
for either reading.

### INV-13d-duty — the duty survives the geometry

- **Cites** 13(d).
- **Kind** precedence, **temporal**; the second limb of the same paragraph.
- **Status** `✎` pencil.

**Invariant.** With *s* as in `INV-13d`, at every state of the encounter after
*s* and until own is finally past and clear, own holds `give-way` and other
holds `stand-on`, whatever the relative bearings are at that later state. This
is stated separately from `INV-13d` because the paragraph has two limbs and
they can come apart: a reading on which 13(d) forbids only the *crossing*
reclassification still preserves the duty, by 13(d)'s own second clause. A
formalisation that derives the role solely from the encounter type will
conflate them and cannot distinguish the readings of `Q-51`.

**State remembered.** As `INV-13d`.

**Data today.** Entry `13a`'s `any_of`, whose second limb is
`own:hist:was_overtaking: true` — the role is asserted from the latch directly
and not only through the encounter type, which is what keeps the two limbs
separable.

**Settled by** `Q-51`.

---

# Rule 14 — Head-on situation

### INV-14b — the head-on deeming test

- **Cites** 14(b), reading 14(a)'s conditions.
- **Kind** classification; a property of a single state.
- **Status** `✎` pencil.

**Invariant.** At any state at which two power-driven vessels are in sight of
one another, both underway, with risk of collision between them, and neither
latched as overtaking under `INV-13d`, a head-on situation is deemed to exist
exactly when each sees the other ahead or nearly ahead — both relative bearings
within the head-on half-angle of dead ahead, `own:geo:rel_bearing_deg` and
`other:geo:rel_bearing_deg` each in [0°, 11.25°] ∪ [348.75°, 360°).

**Both bearings, not one.** A vessel with the other fine on her bow is not in a
head-on situation unless she is also fine on the other's bow. 14(b) is a
statement about aspect as well as bearing — "the masthead lights of the other
in a line or nearly in a line and/or both sidelights" is a statement about
what the *other* vessel's heading presents — and reading one bearing alone
swallows part of the crossing sector.

**Undetermined term.** "Ahead or nearly ahead" has no angle in the Rules.
`situation.constants.head_on_half_angle_deg` fixes it at 11.25° — one point of
the compass, the angular unit the Rules themselves use, 13(b)'s 22.5° being two
points — in pencil, and deliberately wider than the 5° or 6° figures in common
circulation, because 14(c) directs a vessel in doubt to assume the situation
exists and a wider cone errs the way the paragraph errs.

**Not formalised.** 14(b)'s two observational limbs — the night limb (masthead
lights in line and/or both sidelights) and the day limb (the corresponding
aspect) — are stated here as the geometry those observations encode, not as
observations. A vessel that cannot see the lights has 14(c), which this file
does not formalise.

**Data today.** Entry `14b`.

**Settled by** the same partition sweep as `INV-13b`, plus a decision on the
half-angle constant.

### INV-14a — both vessels alter to starboard

- **Cites** 14(a).
- **Kind** conduct, **temporal**; a property of a trace segment.
- **Status** `✎` pencil.

**Invariant.** From the first state at which a head-on situation is deemed to
exist under `INV-14b`, each of the two vessels shall alter her course to
starboard, so that each passes on the port side of the other. Neither vessel
is directed to keep out of the way of the other; both are directed to act, and
the duty is symmetric.

**State remembered.** The heading each vessel held at the state where the
head-on situation was first deemed, against which a later heading is an
alteration; and the sign of the alteration, which is only observable across
states. Rule 8(b)'s "large enough to be readily apparent" is the same shape and
gives no threshold, so the *magnitude* of a compliant alteration is not fixed
here. What is fixed is the sign and the outcome: to starboard, port-to-port.

**Why this matters formally.** The head-on case is the one encounter type in
Section II with no `stand-on` vessel, and the reason `INV-17a1-scope` has
content. A formalisation that assigns a role in every encounter will invent one
here.

**Data today.** None. 14(a) is `conduct`, is in `known_omissions`, and no
conduct entry shape exists (`Q-45`). Entry `14a` was retired and is in
`data/deprecated-identifiers.json`.

**Settled by** the first conduct monitor.

---

# Rule 15 — Crossing situation

### INV-15a-crossing — the crossing classification is the residual

- **Cites** 15(a).
- **Kind** classification; a property of a single state.
- **Status** `✎` pencil.

**Invariant.** At any state at which two power-driven vessels are in sight of
one another, both underway, with risk of collision between them, and neither
latched as overtaking under `INV-13d`, the encounter type is `crossing`
exactly when it is neither `overtaking` under `INV-13b` nor `head-on` under
`INV-14b`.

**Derived, not enumerated.** The crossing sector is the negation of the other
two and must be written that way. Enumerating it gives two independent
statements of one boundary, and the only failure mode of the partition is
someone editing one and not the other. `REQ-CAT-9` requires this of the data;
this invariant requires it of any formalisation.

**Consequence, worth asserting separately in a checker.** For any pair the
three tests all reach, exactly one encounter type holds — never two, never
none. That is `REQ-CAT-9`'s partition property, and it is the natural first
invariant for the Alloy model of P2.2.

**Known incompleteness.** "The three tests all reach" is doing work. Two
sailing vessels get no encounter type at all, because Rules 14 and 15 are
gated on two power-driven vessels and Rule 12 has no deeming paragraph. That
is a property of the Rules, not of the model. A pair whose history fact is
absent also gets none, which is a property of the model (`Q-43`).

**Data today.** Entry `15a-crossing`.

### INV-15a-give-way — the vessel with the other to starboard gives way

- **Cites** 15(a).
- **Kind** precedence; a property of a single state.
- **Status** `✎` pencil.

**Invariant.** At every state at which the encounter type is `crossing`, the
vessel which has the other on her own starboard side holds `give-way` and the
other holds `stand-on`.

**Undetermined term.** "On her own starboard side" is given no sector by the
paragraph. The data reads it as `own:geo:rel_bearing_deg` in (0°, 112.5°] —
the starboard half of the non-overtaking sector, its upper edge the same
declared constant 13(b) reads, so the shorthand is checkable against the
partition rather than trusted.

**Data today.** Entry `15a-give-way`, plus six `rel:overrides` from Rule 18
entries: where Rule 18 also ranks the pair, Rule 18's role displaces this one,
because Rule 18's opening words except Rules 9, 10 and 13 and no others.

### INV-15a-single — at most one give-way vessel in a crossing

- **Cites** 15(a).
- **Kind** precedence, derived; a property of a single state.
- **Status** `✎` pencil. Asserted today over steady-bearing geometries only.

**Invariant.** No state assigns `give-way` to both vessels of a crossing pair
under `INV-15a-give-way`.

**Why it is not free.** Two vessels each with the other on her own starboard
side is a geometrically consistent *record* and an impossible *situation* on a
steady bearing: with both making way, own's speed times the sine of her
relative bearing equals minus the other's speed times the sine of the aspect,
so the two bearings lie on opposite sides. The invariant is a theorem at a
bearing rate of zero and an observation elsewhere.

**Where it is known to fail.** At a non-zero bearing rate. 7(d)(i)'s pencilled
1°/min threshold deems risk of collision on a slow, close, starboard-to-
starboard passing just outside the head-on cone, on which both vessels are
give-way. That is 14(c)'s doubt case and belongs with `Q-41`.

**Data today.** `REQ-VERIFY-8`'s consistency declaration and the sweep the
suite runs over steady-bearing geometries; the both-starboard record is pinned
as one the check rejects.

### INV-15a-not-ahead — avoid crossing ahead

- **Cites** 15(a), second limb.
- **Kind** conduct, **temporal**; a property of a trace segment.
- **Status** `✎` pencil.

**Invariant.** The give-way vessel of a crossing shall, if the circumstances of
the case admit, avoid crossing ahead of the stand-on vessel: over the segment
from the state at which the role attached to the state at which the two are
past and clear, the give-way vessel's track does not pass through the region
ahead of the stand-on vessel's advancing position.

**State remembered.** The stand-on vessel's positions and headings over the
segment, since "ahead of" is relative to a moving vessel; and the state at
which the role attached, which bounds the segment.

**Undetermined term.** "If the circumstances of the case admit" is a
practicability qualification with nowhere to live in the current vocabulary:
`modality` is a single closed value and the duty here is an action, not a role,
so it has no `effect` field to move into. That is `Q-31` exactly, and this
paragraph is the clearest case of it.

**Data today.** None; recorded as a `gap` on entry `15a-give-way`.

---

# Rule 16 — Action by the give-way vessel

### INV-16 — early and substantial action to keep well clear

- **Cites** 16.
- **Kind** conduct, **temporal**; a property of a trace segment.
- **Status** `✎` pencil.

**Invariant.** From the state at which a vessel takes the `give-way` role in a
pair, she shall, so far as possible, take early and substantial action to keep
well clear of the other vessel.

**State remembered.** The state at which the role attached, and the vessel's
course and speed at that state; every later course and speed in the segment,
since "action" is a change from the first and only observable across states.
"Early" is a bound on the elapsed time between the role attaching and the
action; "substantial" is a bound on the magnitude of the change; "well clear"
is a bound on the resulting separation.

**Undetermined terms — all three.** The Rules give no number for early, none
for substantial, and none for well clear. Rule 8(b)'s "large enough to be
readily apparent to another vessel observing visually or by radar" is the
nearest the Rules come to *substantial* and is itself a judgement. Nothing here
supplies a figure; a formalisation must either parameterise all three and
report the sensitivity, or state that the invariant is checked only in its
qualitative form (an action was taken, in the direction that increases
separation). The separation figure is `Q-17`'s *d*, which is
`colregs-engine`'s to fix.

**Data today.** None; Rule 16 is `conduct`.

### INV-16-scope — Rule 16 attaches to the role, not to the rule that assigned it

- **Cites** 16.
- **Kind** conduct, derived.
- **Status** `✎` pencil.

**Invariant.** `INV-16` binds any vessel holding the `give-way` role in a pair,
whichever norm assigned it — 13(a), 15(a), 12(a), or any limb of 18(a)–(c).
Rule 16's subject is "every vessel which is directed to keep out of the way of
another vessel", which is the *output* of another norm rather than a fact.

**Why it is separate.** This is the join between the precedence layer and the
conduct layer, and it is `Q-35`'s shape a second time: a norm reading another
norm's effect. A formalisation must decide whether it evaluates norms in two
passes or admits effect-reading predicates. It is also the reason `give-way` is
one role and not four: if Rule 16 attached differently depending on which rule
assigned the role, the role vocabulary would have to be split.

**A vessel not covered.** A vessel holding `shall-not-impede` is not
"directed to keep out of the way" and Rule 16 does not bind her; 8(f)(i) does,
with its own and weaker terms. `keep-clear` (18(e), 18(f)(i)) is likewise
outside Rule 16. The role vocabulary's three non-`none` values are three
different duties and this is where the difference bites.

---

# Rule 17 — Action by the stand-on vessel

Rule 17 is the phase rule. The stand-on vessel's obligation changes in stages,
each with a different modality, and the paragraphs do not say whether the
stages are ordered or reversible. What follows states each stage separately, so
that a formalisation must make the ordering explicit rather than inherit one.

### INV-17a1-scope — Rule 17 needs exactly one give-way vessel

- **Cites** 17(a)(i).
- **Kind** precedence, derived; a property of a single state.
- **Status** `✎` pencil. This is a derivation from the text, not a citation;
  see the note.

**Invariant.** Rule 17 binds a pair at a state only where, at that state, one
of the two vessels is directed to keep out of the way of the other and the
other is not. Where neither is, or where both are, Rule 17 has no subject and
neither vessel holds `stand-on`.

**The derivation.** 17(a)(i) reads "Where one of two vessels is to keep out of
the way, the other shall keep her course and speed." The antecedent names one
vessel of two, so it fails on a pair in which both are directed to act. Rule 14
directs both vessels of a head-on situation to alter to starboard, and does not
use the phrase "keep out of the way" of either; so neither Rule 16 nor Rule 17
is engaged by Rule 14 alone. The same holds for Rule 19: `INV-19a-noroles`.

**Why it is stated.** Because a formalisation that assigns `stand-on` as the
complement of `give-way` will assign it in a head-on situation, where no
paragraph does. The role vocabulary already agrees — `stand-on` appears only as
the counterpart of `give-way` (`REQ-CAT-8`) — and this invariant is the reason
that constraint is there.

**Settled by** Mark ratifying or rejecting the derivation; it is a reading of
the text with no counter-reading cited here, which is not the same as being
settled.

### INV-17a1 — phase 1: the stand-on vessel keeps her course and speed

- **Cites** 17(a)(i).
- **Kind** conduct, **temporal**; a property of a trace segment.
- **Status** `✎` pencil.

**Invariant.** Over the segment from the state at which a vessel takes the
`stand-on` role to the earliest state at which `INV-17a2-trigger` or
`INV-17b`'s condition holds, the stand-on vessel shall keep her course and her
speed: at every state of that segment her heading and her speed through the
water are those she held when the role attached.

**State remembered.** The heading and speed at the state where the role
attached, for the whole segment. This is the reference the duty is measured
against, and the Rules never name it — see the reading below.

**Reading in doubt.** From what baseline? Two:

- *Attachment baseline.* Course and speed as at the state where the stand-on
  role attached; any subsequent change is a breach.
- *Steady-state baseline.* Course and speed as the vessel's settled condition,
  so that a vessel already in a turn when the role attaches may complete it,
  and a vessel accelerating to her passage speed may finish accelerating.

The paragraph says only "keep her course and speed" and fixes no instant.
`Q-56`.

**Not stated.** Whether "speed" is speed through the water or over the ground.
The record carries `kin:sog_kn` alone and states no set or drift
(`situation.geometry.consistency`), so a formalisation reads speed over the
ground and inherits that approximation.

**Data today.** None; Rule 17 is `conduct` throughout.

### INV-17a2-trigger — phase 2 begins when non-compliance becomes apparent

- **Cites** 17(a)(ii).
- **Kind** conduct, **temporal**; a property relating a state to the states
  before it.
- **Status** `✎` pencil.

**Invariant.** Phase 2 begins, for the stand-on vessel, at the earliest state
at which it becomes apparent to her that the give-way vessel is not taking
appropriate action in compliance with these Rules.

**State remembered.** Everything the stand-on vessel has observed of the
give-way vessel since the role attached: her track, her course and speed
changes, their magnitude and their direction. "Is not taking appropriate
action" is a statement about a trace, not about a state — a give-way vessel
that has not yet altered at a given instant may be about to, and one that has
altered the wrong way has already breached.

**Undetermined terms — two, of different kinds.**

- *"Appropriate action"* is Rule 16 read from the other vessel's side, and
  inherits all three of `INV-16`'s undetermined terms. In particular there is
  no elapsed time after which inaction becomes non-compliance.
- *"Becomes apparent to her"* is epistemic. It is a fact about the stand-on
  vessel's knowledge, not about the world, and the situation record carries no
  observation class. It is the same wall 13(c) and 14(c) hit (`Q-41`) with the
  polarity reversed: there, the absence of knowledge fires a duty; here, the
  arrival of knowledge fires a permission. A formalisation has three honest
  options — treat it as perfect observation of the world state, which
  overstates the permission; treat it as a free input the model may set at any
  state, which understates the constraint; or carry an observation lag as a
  parameter. This file does not choose; P4.2 must, and must say which.

**Data today.** None.

### INV-17a2-permission — phase 2 is a permission, and is unilateral

- **Cites** 17(a)(ii).
- **Kind** conduct, **temporal**.
- **Status** `✎` pencil.

**Invariant.** In phase 2 the stand-on vessel **may** take action to avoid
collision by her manoeuvre alone. The modality is permissive: an invariant may
not require the action, and a checker that flags a stand-on vessel for holding
her course in phase 2 is wrong. "By her manoeuvre alone" is a constraint on the
action, not a description of it: the action must be one that avoids collision
without any further action by the give-way vessel.

**Formally.** "By her manoeuvre alone" is a reachability condition over the
stand-on vessel's own manoeuvring envelope — there exists an action available
to her which, against every admissible continuation of the give-way vessel's
motion, avoids collision. That is `Safe(s, σ_own, σ_other)` of ADR 0005 §5 with
the give-way vessel's strategy set left unconstrained, and it is the first
place in Part B where an invariant needs `kin:dynamics` and the game machinery
rather than geometry.

**Reading in doubt.** Does 17(a)(ii) *suspend* 17(a)(i)'s duty, or does it add
an exception which excuses a departure only once taken? On the first reading a
stand-on vessel in phase 2 is under no keep-course-and-speed duty at all; on
the second she remains under it and a departure is lawful only if it is action
to avoid collision by her manoeuvre alone. The word "however" points at the
first; the fact that 17(a)(ii) describes an action rather than lifting a duty
points at the second. `Q-52`.

**Data today.** None.

### INV-17b — phase 3: the stand-on vessel shall act

- **Cites** 17(b).
- **Kind** conduct, **temporal**.
- **Status** `✎` pencil.

**Invariant.** At every state at which the vessel required to keep her course
and speed finds herself so close that collision cannot be avoided by the action
of the give-way vessel alone, she **shall** take such action as will best aid
to avoid collision. In phase 3 the modality is obligation, not permission, and
17(a)(i)'s keep-course-and-speed duty is displaced.

**State remembered.** Strictly, none: the trigger is a property of the current
state and the two vessels' manoeuvring envelopes. In practice a formalisation
carries the phase, because `INV-17c` scopes on which phase the action was taken
in, and because `Q-53` asks whether the phase can be left again.

**Formally.** "Collision cannot be avoided by the action of the give-way vessel
alone" is the dual of `INV-17a2-permission`'s condition: there is *no* action
available to the give-way vessel which avoids collision against the stand-on
vessel holding her course and speed. Both are reachability queries over
`kin:dynamics`; neither is a geometric predicate. This is the invariant that
makes Phase 4's timed and hybrid work (P4.4, P4.5) necessary rather than
optional — a distance threshold is not a formalisation of it, it is a
substitute for one.

**Undetermined term.** "From any cause" widens the trigger to include the
stand-on vessel's own contribution; "such action as will best aid to avoid
collision" ranks actions by an objective the Rules do not define. Neither is
formalised here.

**Data today.** None.

### INV-17c — no turn to port, in phase 2 only

- **Cites** 17(c).
- **Kind** conduct, **temporal**.
- **Status** `✎` pencil.

**Invariant.** Where the stand-on vessel is a power-driven vessel, the other
vessel is a power-driven vessel, the encounter is a crossing, and the action is
taken in phase 2 — in accordance with 17(a)(ii) — she shall, if the
circumstances of the case admit, not alter course to port for a vessel on her
own port side.

**Its four conditions are all load-bearing, and the fourth is the interesting
one.** 17(c) names 17(a)(ii) and not 17(b). On its terms it therefore does not
constrain phase 3 action: a stand-on vessel who has reached the state of
17(b) may alter to port for a vessel on her port side if that is the action
which will best aid to avoid collision. Whether that is what the Rules intend
is not a question this file answers; that it is what they say is checkable, and
a formalisation which applies 17(c) to all stand-on action is stating something
the paragraph does not.

**State remembered.** Which phase the action was taken in — so the phase is
part of the state a monitor carries, not only a derived label.

**Data today.** None.

### INV-17d — Rule 17 never relieves the give-way vessel

- **Cites** 17(d).
- **Kind** precedence, **temporal**.
- **Status** `✎` pencil.

**Invariant.** At every state of an encounter in which one vessel holds
`give-way`, she holds it — with `INV-16`'s duty in force — regardless of the
phase the stand-on vessel is in and regardless of any action the stand-on
vessel has taken. In particular, phase 2 and phase 3 action by the stand-on
vessel does not transfer, share or discharge the give-way vessel's obligation.

**Why it is stated separately.** A phase automaton is a natural way to model
Rule 17, and the natural automaton has the give-way vessel's duty as an input
to the phase transitions. 17(d) says the arrow does not run the other way. The
cheapest way for a formalisation to get this wrong is to model the pair as one
machine with one obligation at a time; the invariant is the reason to model two
obligations that hold concurrently.

**Data today.** None. The nearest thing is 8(f)(ii)'s parallel statement for
`shall-not-impede`, which entry `8f3` records.

### INV-17-phases — the phase structure

- **Cites** 17(a)(i), 17(a)(ii), 17(b).
- **Kind** conduct, **temporal**, derived; the shape a formalisation carries.
- **Status** `✎` pencil.

**Invariant.** For a pair to which Rule 17 applies (`INV-17a1-scope`), the
stand-on vessel is, at each state, in exactly one of three phases:

| phase | condition | modality on the stand-on vessel |
|---|---|---|
| 1 | neither of the below | **shall** keep course and speed (`INV-17a1`) |
| 2 | non-compliance apparent (`INV-17a2-trigger`), not yet phase 3 | **may** act, by her manoeuvre alone (`INV-17a2-permission`), subject to `INV-17c` |
| 3 | collision cannot be avoided by the give-way vessel alone (`INV-17b`) | **shall** act as will best aid to avoid collision |

Phase 3 dominates phase 2: where both conditions hold the obligation of 17(b)
governs, because 17(b) is an obligation and 17(a)(ii) a permission, and a
permission does not qualify an obligation.

**What the Rules do not say, and this table therefore does not either.**
Whether the phases are monotone. If the give-way vessel begins to comply after
phase 2 has been entered, does the stand-on vessel return to phase 1 and her
keep-course-and-speed duty? If she has already altered course under
17(a)(ii), is she obliged to hold the *new* course and speed? Nothing in
Rule 17 answers either. `Q-53`.

**State remembered.** If the phases are monotone, one three-valued latch per
stand-on vessel per encounter. If they are not, no latch is needed for the
phase itself but `INV-17c` still needs the phase in which each action was
taken. The two models are not interchangeable and TLC will distinguish them:
under the monotone reading a trace in which the give-way vessel complies late
still permits stand-on action; under the reversible reading it does not.

---

# Rule 18 — Responsibilities between vessels

Rule 18 is the least temporal rule in this range and the most nearly complete
in the data. What is stated here is the *shape* of the order rather than a
restatement of its eleven limbs, because the shape is what a formalisation gets
wrong.

### INV-18-except — Rule 18 yields to Rules 9, 10 and 13, and to nothing else

- **Cites** 18 (chapeau).
- **Kind** precedence; a property of a single state.
- **Status** `✎` pencil.

**Invariant.** Every role Rule 18 assigns is displaced by a role Rules 9, 10 or
13 assigns to the same pair at the same state, and is displaced by no other
rule. In particular Rule 18's roles are *not* subordinate to Rules 12, 14 or
15: where Rule 18 and Rule 12 or Rule 15 both speak, Rule 18 governs.

**Why it is stated in both directions.** The chapeau is an exhaustive
exception list, and the second half — "and to nothing else" — is what makes the
`rel:overrides` edges in the data run from Rule 18 *to* Rules 12 and 15 rather
than the other way. That direction was got wrong once and found by a sweep
(`Q-40`).

**Data today.** `rel:overrides` on entry `13a` against all eleven Rule 18
entries and all three Rule 12 entries; `rel:overrides` on `18a1`–`18a3`,
`18c1`–`18c2`, `18f1` against `15a-give-way`, and on the Rule 18 entries that
can meet two sailing vessels against `12a1`–`12a3`. A derived check asserts the
hand-list of six against Rule 15 is complete, so a Rule 18 paragraph written
later cannot join Rule 15 silently.

### INV-18-order — the rank order

- **Cites** 18(a), 18(a)(i)–(iv), 18(b), 18(b)(i)–(iii), 18(c), 18(c)(i)–(ii).
- **Kind** precedence; a property of a single state.
- **Status** `✎` pencil.

**Invariant.** At every state at which the two vessels are in sight of one
another and both underway, and subject to `INV-18-except`:

| subject | keeps out of the way of | cite |
|---|---|---|
| a power-driven vessel | a vessel not under command; a vessel restricted in her ability to manoeuvre; a vessel engaged in fishing; a sailing vessel | 18(a)(i)–(iv) |
| a sailing vessel | a vessel not under command; a vessel restricted in her ability to manoeuvre; a vessel engaged in fishing | 18(b)(i)–(iii) |
| a vessel engaged in fishing when underway | a vessel not under command; a vessel restricted in her ability to manoeuvre | 18(c)(i)–(ii) |

The subject of each row holds `give-way`; the object holds `stand-on`.

**Note on the classes.** "Power-driven vessel" is 3(b), "sailing vessel" is
3(c), and the remaining terms are Rule 3's. The model's `fact:rule18_class`
(`Q-32`) is a decode of the display axes onto these ranks and is the model's,
not the Rules'; a vessel constrained by her draught is a power-driven vessel
for the purposes of 18(a) and is ranked by it.

**Not stated by Rule 18.** No risk-of-collision condition and no encounter
type. See `Q-49`.

**Data today.** Entries `18a1`–`18a4`, `18b1`–`18b3`, `18c1`–`18c2`.

### INV-18-partial — the order is partial, and the gaps are the Rules'

- **Cites** 18(a)–(c).
- **Kind** precedence, derived; a property of a single state.
- **Status** `✎` pencil.

**Invariant.** The relation of `INV-18-order` is a strict partial order and is
not total. Two classes of pair it does not order:

- a vessel not under command and a vessel restricted in her ability to
  manoeuvre — neither paragraph names the other;
- two vessels of the same rank.

For such a pair Rule 18 assigns no role to either vessel. Where the pair is
also outside Rules 12, 13, 14 and 15, no Section II norm assigns a role at all,
and a formalisation must be able to say so rather than pick one.

**What it leaves.** Where the pair is inside Rule 12 or Rule 15 — two vessels
engaged in fishing under power, or a vessel not under command crossing one
restricted in her ability to manoeuvre under power — the crossing or sailing
rule is then the only norm in force and lays a helm duty on a vessel that may
be unable to discharge it. That is Rule 2's region (ADR 0005 §5) and is
recorded, not gated (`Q-40`).

**Data today.** Asserted by the steady-bearing and sailing-fleet sweeps, which
check "never both give-way, never both stand-on, no two helm roles after
resolution" across every rank pairing.

### INV-18c-practicable — 18(c)'s qualification is on the duty, not the rank

- **Cites** 18(c).
- **Kind** precedence.
- **Status** `✎` pencil.

**Invariant.** 18(c)'s "so far as possible" qualifies the fishing vessel's
performance of the duty, not whether the duty attaches. She holds `give-way`
with respect to a vessel not under command or restricted in her ability to
manoeuvre at every state at which `INV-18-order` reaches the pair; the
qualification bears on what discharging `INV-16` requires of her.

**Why it is stated.** A formalisation that reads the qualification as a
condition on the antecedent gets a pair with no roles whenever the fishing
vessel's compliance is hard, which is precisely when the roles matter.

**Data today.** Entries `18c1` and `18c2` carry modality
`shall-if-practicable` with effect `give-way`/`stand-on`: the qualification and
the role are held in two fields. That is `Q-31`'s shape, resolved here only
because the duty happens to be a role.

### INV-18d1 — the constrained-by-draught duty confers nothing

- **Cites** 18(d)(i), read with 8(f)(iii).
- **Kind** precedence; a property of a single state.
- **Status** `✎` pencil.

**Invariant.** At every state at which a vessel other than one not under
command or restricted in her ability to manoeuvre is in sight of, and underway
with, a vessel constrained by her draught exhibiting the signals in Rule 28,
the first vessel holds `shall-not-impede` and shall, if the circumstances of
the case admit, avoid impeding the other's safe passage. The vessel constrained
by her draught holds `none` — not `stand-on`. Where the two are approaching so
as to involve risk of collision, she remains fully obliged to comply with
Rules 4–19 (8(f)(iii)), and the impeding vessel is not relieved of her
obligation (8(f)(ii)).

**Why the `none` matters.** `shall-not-impede` is a distinct duty in the Rules'
own vocabulary and is not a give-way role; reading it as one would give the
protected vessel a keep-course-and-speed duty under Rule 17 that no paragraph
confers. This is the content of 8(f)(iii) and the reason the role vocabulary
carries `none` explicitly rather than by omission.

**Undetermined term.** "Exhibiting the signals in Rule 28" is a
display-compliance fact about the other vessel and is not read by entry `18d1`,
which is that much wider than the paragraph (`Q-34`).

**Data today.** Entries `18d1` and `8f3`.

### INV-18f1 — the WIG craft keeps well clear

- **Cites** 18(f)(i).
- **Kind** precedence; a property of a single state.
- **Status** `✎` pencil.

**Invariant.** At every state at which a WIG craft is taking off, landing, or
in flight near the surface, she holds `keep-clear` with respect to every other
vessel: she shall keep well clear and avoid impeding their navigation. The
other vessel holds `none`. `keep-clear` is outside the give-way/stand-on
pairing and outside Rule 16.

**Data today.** Entry `18f1`.

---

# Rule 19 — Conduct of vessels in restricted visibility

Rule 19 is not one more encounter type. It is a **ruleset switch**: for a pair
it reaches, it replaces Section II entirely, and the vocabulary of give-way and
stand-on has no application. Everything below turns on that.

### INV-19a-scope — the ruleset switch

- **Cites** 19(a), read with 11 and 4.
- **Kind** scope; a property of a single state.
- **Status** `✎` pencil.

**Invariant.** At every state, for every pair of vessels:

- Part B Section I — Rules 4 to 10 — applies, in any condition of visibility
  (Rule 4).
- Part B Section II — Rules 11 to 18 — applies to the pair exactly when the two
  vessels are in sight of one another, which by 3(k) is exactly when one can be
  observed visually from the other (Rule 11).
- Rule 19 applies to the pair exactly when the two vessels are **not** in sight
  of one another **and** are navigating in or near an area of restricted
  visibility (19(a)).

Sections II and III are mutually exclusive by the in-sight test; they are not
jointly exhaustive, which is `INV-19a-third-state`. Rule 19 supplements
Section I rather than replacing it — 19(c) says so in terms, directing due
regard to the conditions "when complying with Rules 4-10".

**Temporal note.** Visibility changes, and the switch is a function of the
current state. A pair may pass from Section II to Section III and back inside
one encounter. What happens to the state Section II accumulated — a 13(d) latch,
a Rule 17 phase — across such a transition is not stated by any paragraph, and
is the single question in this file most likely to produce a surprising TLC
trace. `Q-54`.

**Undetermined term.** "In or near an area of restricted visibility" has no
fact behind it. 3(l) defines restricted visibility as a condition of the
atmosphere, and nothing in `data/facts.json` carries it; `pair:geo:in_sight` is
the only conjunct the model has. Entry `19a` therefore selects Section III for
any pair not in sight, which is wider than the paragraph, and records that as a
gap.

**Data today.** Entries `11` and `19a`, a complementary pair on
`pair:geo:in_sight`.

### INV-19a-noroles — Section III has no give-way and no stand-on vessel

- **Cites** 19(a), read with 11.
- **Kind** precedence, derived; a property of a single state.
- **Status** `✎` pencil.

**Invariant.** At a state at which Rule 19 applies to a pair, neither vessel
holds `give-way` and neither holds `stand-on`. Rules 16 and 17 are Section II
rules, do not apply, and have no subject. Every duty Rule 19 imposes falls on
both vessels symmetrically and independently: each acts on her own appraisal,
neither is entitled to expect the other to hold her course, and there is no
rule of the road to allocate the manoeuvre.

**Consequence worth checking.** A formalisation that carries a role variable
must be able to hold "no role" for a pair in Section III without that being
indistinguishable from "no encounter". This is `Q-43`'s distinction — "no
encounter" versus "cannot say" — arriving from a second direction, and it
belongs to `colregs-engine`'s status alphabet.

**Data today.** No entry produces a role under a `pair:geo:in_sight: false`
predicate; every `precedence` entry in Section II gates on
`pair:geo:in_sight: true`. The property holds by construction and is not
asserted.

### INV-19a-third-state — not in sight, and not in restricted visibility

- **Cites** 19(a), read with 11 and 4.
- **Kind** scope, derived; a property of a single state.
- **Status** `✎` pencil. **This states a gap and does not close it.**

**Invariant.** There are states at which two vessels are not in sight of one
another and are not navigating in or near an area of restricted visibility —
two vessels beyond visual range in clear weather, or two vessels aware of each
other by radar or AIS alone on a clear night at long range. At such a state
Rule 11 excludes Section II and 19(a) excludes Rule 19, and only Section I
governs the pair.

**Why it is written down.** It is a hole in the surface the two scope
paragraphs cover, it is forced by the text of both, and a formalisation that
treats "not Section II" as "Section III" will not have it. The model closes the
hole today by dropping 19(a)'s second conjunct, which puts the pair in
Section III; that is a decision, not a reading, and it should be visible as
one. `Q-55`.

**Data today.** Entry `19a`'s `gap`.

### INV-19b — safe speed, and engines ready

- **Cites** 19(b).
- **Kind** conduct; the first limb is a property of a single state, the second
  a property of the vessel's machinery.
- **Status** `✎` pencil.

**Invariant.** At every state at which Rule 19 applies, every vessel proceeds
at a safe speed adapted to the prevailing circumstances and conditions of
restricted visibility, and a power-driven vessel has her engines ready for
immediate manoeuvre.

**Undetermined term.** "Safe speed" is Rule 6, which lists the factors to be
taken into account and gives no number and no formula. Nothing here supplies
one. What is formalisable without inventing a number is the *comparison*: a
vessel's safe speed under Rule 19 is not greater than her safe speed in the
same geometry in clear visibility, because 19(b) adds conditions to Rule 6's
list and removes none. A formalisation may assert the monotonicity and decline
the value.

**Not formalisable from the record.** "Engines ready for immediate manoeuvre"
is a fact about the vessel's machinery. Neither the fact record nor the
kinematic class carries it, and no paragraph would make it a fact of the pair.

### INV-19c — due regard when complying with Rules 4–10

- **Cites** 19(c).
- **Kind** conduct.
- **Status** `✎` pencil.

**Invariant.** At every state at which Rule 19 applies, every vessel has due
regard to the prevailing circumstances and conditions of restricted visibility
when complying with Rules 4 to 10.

**Undetermined modality.** "Shall have due regard to" is neither an obligation
to act nor a permission; it qualifies the manner of complying with other rules.
The modality vocabulary has no value for it, which is the same obstacle
7(d)(ii) hit and `Q-42` records. Stated here so the paragraph is covered rather
than absent; not turned into a checkable predicate.

### INV-19d-determine — the radar-alone determination

- **Cites** 19(d), first sentence.
- **Kind** conduct, **temporal**; the duty is discharged over a segment.
- **Status** `✎` pencil.

**Invariant.** At every state at which Rule 19 applies and a vessel has
detected the presence of another **by radar alone**, she shall determine
whether a close-quarters situation is developing and whether risk of collision
exists.

**State remembered.** "Developing" is a property of a trace: it needs the
sequence of ranges and bearings since detection, not the current range. Rule
7(b)'s "radar plotting or equivalent systematic observation" is the operation,
and `kin:position` is cited to it.

**Note on the antecedent.** "By radar alone" is a real restriction and not a
throat-clearing: a vessel that has heard the other's fog signal but has no
radar contact is not under 19(d). Her duty is 19(e). A formalisation must carry
the means of detection, which the situation record does not: there is no
observation class.

**Undetermined term.** "Close-quarters situation" is not defined anywhere in
the Rules and has no distance.

### INV-19d-action — avoiding action in ample time

- **Cites** 19(d), second sentence.
- **Kind** conduct, **temporal**.
- **Status** `✎` pencil.

**Invariant.** Where `INV-19d-determine`'s determination is that a
close-quarters situation is developing, or that risk of collision exists, or
both, the vessel shall take avoiding action in ample time.

**State remembered.** The state at which the determination was or should have
been made, since "ample time" is measured from it; and the vessel's course and
speed at that state, since an action is a change from them.

**Undetermined term.** "Ample time" has no figure. It is the natural subject of
the timed model of P4.4: ample time against the stopping distance and turning
circle of `kin:dynamics` is a bound the Rules gesture at and never state, and
computing it is a better answer than choosing it.

### INV-19d1 — no alteration to port for a vessel forward of the beam

- **Cites** 19(d)(i).
- **Kind** conduct, **temporal**.
- **Status** `✎` pencil.

**Invariant.** Where the avoiding action of `INV-19d-action` consists of an
alteration of course, then so far as possible the vessel shall not alter course
to port for a vessel forward of her beam — `own:geo:rel_bearing_deg` in
(270°, 360°) ∪ [0°, 90°) — other than for a vessel being overtaken.

**The exception reaches across the switch.** "A vessel being overtaken" is Rule
13's classification, used inside Section III, where Rule 13 does not apply.
A formalisation must therefore be able to evaluate the *encounter
classification* for a pair to which Section II does not apply. That is an
architectural consequence and not a small one: the classification layer cannot
be gated on `pair:geo:in_sight` if 19(d)(i) is to be expressible. The entries
today are so gated.

**Undetermined term.** "So far as possible" — `Q-31` again.

### INV-19d2 — no alteration toward a vessel abeam or abaft the beam

- **Cites** 19(d)(ii).
- **Kind** conduct, **temporal**.
- **Status** `✎` pencil.

**Invariant.** Where the avoiding action of `INV-19d-action` consists of an
alteration of course, then so far as possible the vessel shall not alter course
toward a vessel abeam or abaft her beam — `own:geo:rel_bearing_deg` in
[90°, 270°].

**Note.** "Toward" is a property of the alteration's sign relative to the other
vessel's bearing, not of the resulting heading alone: an alteration is toward
the other vessel when it reduces the magnitude of her relative bearing off the
bow on the side she lies. Stated in those terms because the resulting-heading
form is wrong for a vessel nearly astern.

### INV-19e — reduce to steerage way

- **Cites** 19(e).
- **Kind** conduct, **temporal**.
- **Status** `✎` pencil.

**Invariant.** At every state at which Rule 19 applies and a vessel either
hears, apparently forward of her beam, the fog signal of another vessel, or
cannot avoid a close-quarters situation with another vessel forward of her
beam, she shall — except where it has been determined that risk of collision
does not exist — reduce her speed to the minimum at which she can be kept on
her course; shall if necessary take all her way off; and shall in any event
navigate with extreme caution until danger of collision is over.

**State remembered.** The duty runs "until danger of collision is over", so the
segment is bounded at both ends by conditions the Rules do not define. The
exception clause is the same shape as `INV-19d-determine`'s output and carries
its determination forward, which means the determination is state a monitor
holds rather than recomputes.

**Its subject is not a pair.** A fog signal heard forward of the beam is an
observation whose source may not be a tracked vessel at all, and the duty
attaches on the observation. The situation record is a record of a *pair*, and
this is the clearest paragraph in Part B that does not fit it: a formalisation
of 19(e) needs either an observation class or a distinguished "unidentified
contact" subject. Recorded, not resolved.

**Undetermined terms.** "Apparently forward of her beam" (an observation, with
a bearing accuracy the Rules do not state), "close-quarters situation", "the
minimum at which she can be kept on her course", "extreme caution", and "until
danger of collision is over" — five, in one paragraph, which is why this
invariant states the paragraph and formalises none of them.

---

# Cross-rule invariants

These are the properties a checker asserts over the whole of Section II. Each
is derived from the paragraphs named; none is stated by a paragraph of its own.

### INV-PB-roles-exclusive — never both give-way, never both stand-on

- **Cites** 13(a), 15(a), 12(a), 18(a)–(c), read with 18's chapeau.
- **Kind** precedence, derived; a property of a single state.
- **Status** `✎` pencil. Asserted today over consistent, steady-bearing
  situations only (`REQ-VERIFY-8`).

**Invariant.** At every state, after every `rel:overrides` has been applied, no
pair holds `give-way` on both subjects, and no pair holds `stand-on` on both
subjects.

**Known exception, pinned rather than assumed away.** At a non-zero bearing
rate the property is not a theorem; see `INV-15a-single`.

**Data today.** The sailing-fleet and power-fleet sweeps in
`test/data.test.mjs`; every one of the six Rule 18 → Rule 15 overrides fails
the sweep when removed.

### INV-PB-partition — exactly one encounter type

- **Cites** 13(b), 13(d), 14(b), 15(a).
- **Kind** classification, derived; a property of a single state.
- **Status** `✎` pencil.

**Invariant.** For any pair the three deeming tests all reach, exactly one of
`overtaking`, `head-on` and `crossing` holds — never two, never none. This is
`REQ-CAT-9` stated as an invariant rather than as a requirement on the data.

**What "all reach" excludes**, and why the invariant is conditional: two
sailing vessels, a pair with no risk of collision, a pair not in sight, and a
pair whose `hist:was_overtaking` is absent. The first three are properties of
the Rules; the fourth is a property of the model (`Q-43`).

### INV-PB-one-role-source — a vessel holds one helm role at a time

- **Cites** 13(a), 18 chapeau, read with 16 and 17.
- **Kind** precedence, derived; a property of a single state.
- **Status** `✎` pencil.

**Invariant.** After every `rel:overrides` has been applied, no vessel holds
both `give-way` and `stand-on` with respect to the same other vessel at the
same state.

**Known exception, recorded as a finding rather than asserted away.** A sailing
vessel meeting a vessel constrained by her draught holds `stand-on` under
18(a)(iv) and `shall-not-impede` under 18(d)(i) at once. Those are not two helm
roles — `shall-not-impede` is not `give-way` — so the invariant as stated
survives, and the pairing is pinned in the suite as `Q-36` rather than
overridden.

---

## Not formalised here

Goal 4 of the epic is legal traceability: a paragraph with a switchable effect
is either covered or explicitly excluded, and an unmentioned paragraph is a
hole. This section makes the coverage of Rules 13–19 auditable. Every paragraph
path `data/rules.json` carries in the range 13–19 appears exactly once.

### Coverage

| paragraph | disposition |
|---|---|
| 13(a) | `INV-13a` |
| 13(b) | `INV-13b`, `INV-13b-pair` |
| 13(c) | **not formalised** — doubt |
| 13(d) | `INV-13d`, `INV-13d-duty` |
| 14(a) | `INV-14a` |
| 14(b) | `INV-14b` |
| 14(c) | **not formalised** — doubt |
| 15(a) | `INV-15a-crossing`, `INV-15a-give-way`, `INV-15a-single`, `INV-15a-not-ahead` |
| 16 | `INV-16`, `INV-16-scope` |
| 17(a)(i) | `INV-17a1-scope`, `INV-17a1`, `INV-17-phases` |
| 17(a)(ii) | `INV-17a2-trigger`, `INV-17a2-permission` |
| 17(b) | `INV-17b` |
| 17(c) | `INV-17c` |
| 17(d) | `INV-17d` |
| 18 (chapeau) | `INV-18-except` |
| 18(a) (chapeau) | `INV-18-order`, `INV-18-partial` — read with 18(a)(i)–(iv) |
| 18(a)(i) | `INV-18-order` |
| 18(a)(ii) | `INV-18-order` |
| 18(a)(iii) | `INV-18-order` |
| 18(a)(iv) | `INV-18-order` |
| 18(b) (chapeau) | `INV-18-order` — read with 18(b)(i)–(iii) |
| 18(b)(i) | `INV-18-order` |
| 18(b)(ii) | `INV-18-order` |
| 18(b)(iii) | `INV-18-order` |
| 18(c) (chapeau) | `INV-18-order`, `INV-18c-practicable` |
| 18(c)(i) | `INV-18-order` |
| 18(c)(ii) | `INV-18-order` |
| 18(d)(i) | `INV-18d1` |
| 18(d)(ii) | **not formalised** — conduct, no shape |
| 18(e) | **not formalised** — no seaplane fact |
| 18(f)(i) | `INV-18f1` |
| 18(f)(ii) | **not formalised** — a decode statement |
| 19(a) | `INV-19a-scope`, `INV-19a-noroles`, `INV-19a-third-state` |
| 19(b) | `INV-19b` |
| 19(c) | `INV-19c` |
| 19(d) | `INV-19d-determine`, `INV-19d-action` |
| 19(d)(i) | `INV-19d1` |
| 19(d)(ii) | `INV-19d2` |
| 19(e) | `INV-19e` |

Thirty-nine paragraph paths; thirty-four covered by an invariant, five
excluded. Forty invariants, of which three — the `INV-PB-` ones — are
cross-rule and appear against no single paragraph.

### Excluded paragraphs, with reasons

- **13(c)** and **14(c)** — "when a vessel is in any doubt … she shall assume
  that this is the case". A duty that fires on the *absence* of knowledge.
  Formalising it means either a `doubt` boolean, which asks a consumer to
  report a mental state, or reading an absent fact as an assertion, which
  reverses the one firm commitment of the predicate language (`Q-33`). Both are
  already in `known_omissions`; the question is `Q-41`. Note that these are the
  two paragraphs that make the Rules' errors *conservative*, so excluding them
  makes any conclusion drawn from these invariants less cautious than the Rules
  are, not more. That is the direction an exclusion must not be silent about.
- **18(d)(ii)** — "a vessel constrained by her draught shall navigate with
  particular caution having full regard to her special condition". Conduct with
  an undefined standard and no counterparty; it prescribes a manner of
  navigating rather than anything a two-vessel invariant can check. In
  `known_omissions`.
- **18(e)** — the seaplane paragraph. There is no fact for being a seaplane:
  `fact:propulsion` has power, sail and oars, and 3(a) makes a seaplane a
  vessel without giving the record anywhere to say so. The role vocabulary has
  `keep-clear` for it; the predicate does not exist. In `known_omissions`.
- **18(f)(ii)** — "a WIG craft operating on the water surface shall comply with
  Rules 4-19 as a power-driven vessel". Not a norm about a pair: it maps a WIG
  on the surface onto `propulsion:power` for the rest of Part B, which is a
  decode-table statement. In `known_omissions`. 18(f)(i), the phase that does
  change the roles, is `INV-18f1`.

### Terms named inside a covered invariant and not formalised

An invariant above may cover its paragraph and still leave a term
undetermined. These are listed so that "covered" is not read as "checkable".
Every one is a term the Rules use and do not define.

| term | paragraph | invariant |
|---|---|---|
| "coming up with" (a speed comparison) | 13(b) | `INV-13b` |
| "finally past and clear" | 13(d) | `INV-13d` |
| "ahead or nearly ahead" (an angle) | 14(b) | `INV-14b` |
| the night and day observation limbs | 14(b) | `INV-14b` |
| "on her own starboard side" (a sector) | 15(a) | `INV-15a-give-way` |
| "if the circumstances of the case admit" | 15(a), 17(c), 18(d)(i) | `INV-15a-not-ahead`, `INV-17c`, `INV-18d1` |
| "early", "substantial", "well clear" | 16 | `INV-16` |
| the baseline for "course and speed" | 17(a)(i) | `INV-17a1` |
| "becomes apparent to her" (epistemic) | 17(a)(ii) | `INV-17a2-trigger` |
| "appropriate action" | 17(a)(ii) | `INV-17a2-trigger` |
| "so close that collision cannot be avoided" | 17(b) | `INV-17b` |
| "such action as will best aid to avoid collision" | 17(b) | `INV-17b` |
| "exhibiting the signals in Rule 28" | 18(d)(i) | `INV-18d1` |
| "in or near an area of restricted visibility" | 19(a) | `INV-19a-scope` |
| "safe speed"; "engines ready for immediate manoeuvre" | 19(b) | `INV-19b` |
| "due regard to" (a modality) | 19(c) | `INV-19c` |
| "close-quarters situation" | 19(d), 19(e) | `INV-19d-determine`, `INV-19e` |
| "ample time" | 19(d) | `INV-19d-action` |
| "so far as possible" | 16, 19(d)(i), 19(d)(ii) | `INV-16`, `INV-19d1`, `INV-19d2` |
| "apparently forward of her beam"; "the minimum at which she can be kept on her course"; "extreme caution"; "until danger of collision is over" | 19(e) | `INV-19e` |

Three of these have a declared constant in `data/facts.json`
(`situation.constants`) standing in for them, each with its status and, where
pencilled, what would settle it: the overtaking sector's two edges (ink, stated
in 13(b) itself), the head-on half-angle (pencil), and the appreciable bearing
change of 7(d)(i) (pencil). The rest have nothing standing in for them and a
formalisation must either parameterise them and report the sensitivity, or say
that the invariant is checked only in a qualitative form.

### Rules outside 13–19 that these invariants read

Not excluded, and not this file's to state — listed so a reader can see what
the invariants depend on:

Rule 3 (the definitions, including 3(b), 3(c) and 3(k)), Rule 4 (Section I's
scope), Rule 5, Rule 6 (safe speed), Rule 7 (risk of collision), Rule 8 and
particularly 8(b) and 8(f), Rules 9 and 10 (excepted by Rule 18's chapeau),
Rule 11 (Section II's scope), Rule 12 (two sailing vessels), and Rule 21(c)
(the sternlight arc, which is 13(b)'s sector).

Rule 2 is deliberately absent from every invariant above. ADR 0005 §5 settles
it: 2(a) is `care` and 2(b) is `meta`, both are in `represented_paragraphs`,
neither is an entry, and Rule 2 names a *region* of situation space computed
offline rather than a predicate evaluated at a state. Putting Rule 2 into a
compliance invariant makes the definition circular. Where an invariant above
notes that some pair is left with a duty it may be unable to discharge, that
observation is a pointer into Rule 2's region and is recorded, never gated.

---

## Open questions raised by this file

Stated in full in `docs/requirements.md` §11, "From the Part B invariants
(P4.1)": `Q-49` through `Q-56`. Each is a place where the rule text admits two
readings and this file declines to choose.
