# Part B invariants — Rules 13–19

Status: **sketch** (P4.1 of the formal-methods epic,
[colregs-engine#1](https://github.com/mark-brannan/colregs-engine/issues/1)).
Bound by `REQ-INV-1`–`REQ-INV-6` in `docs/requirements.md` §4.2. Everything
here is `✎` **pencil** under `docs/conventions.md` unless a block says
otherwise.

Prose invariants over the *situation record* of `REQ-CAT-4`, extended to a
trace, written so a TLA+ or Rocq formalisation can be built from them without
the rule text; where temporal, each says what is remembered and over what
window, which is what P4.2 and P4.3 build on. Not `data/applicability.json`
(an entry says which norms a *state* selects; an invariant, what holds of a
*trace*), and not a restatement of the rules: what is not formalised is listed
in [Not formalised here](#not-formalised-here), so Goal 4's coverage claim is
auditable. **No maritime doctrine**: every proposition is the rule text,
arithmetic over it, or a decision recorded as such; two readings are both
recorded and the choice is a `Q-` in §11.

---

## The identifier scheme `✎`

`INV-` plus the entry-id derivation of the paragraph path (`docs/identifiers.md`
§"Entry ids") plus, where one paragraph yields several invariants, a hyphenated
suffix naming what distinguishes them.

| paragraph | invariant id |
|---|---|
| `13(d)` | `INV-13d` |
| `17(a)(ii)` | `INV-17a2-trigger`, `INV-17a2-permission` |
| `16` | `INV-16` |

- Insertion appends a suffix and never renumbers; a suffix names something and
  is not an ordinal (`REQ-INV-2`).
- The paragraph is the unit (ADR 0001): an invariant reading several takes the
  id of the one stating its operative content, as entry `14b` does.
- `INV-` is a type prefix on a citation-derived name — the one departure from
  `docs/identifiers.md`, because `13a` is already an entry id. Jurisdiction is a
  dimension (`REQ-SCOPE-2`, `Q-8`); only `intl` is populated.

---

## The model these invariants are stated over `✎`

A **situation** is the record of `REQ-CAT-4` and `REQ-CAT-6`: two per-vessel
fact records, a kinematic state each, relative geometry, history and the
environment, addressed as `<subject>:<class>:<key>`, subject in
`own`/`other`/`pair`. A **trace** is a sequence of situations for one ordered
pair, sampled at *t*₀ < *t*₁ < … . Each invariant is a property of one state
("at every state") or relates two or more ("at every state after", "from the
first state at which") — the whole content of §4.1's `conduct` category, and
why an entry, evaluated at a point, cannot carry it.

An **encounter** is a maximal segment of a trace in which the two vessels are
in a relationship the Rules reach. Where it begins and ends is `Q-47`'s
question; invariants scoped to "the same encounter" make a formalisation choose
a segmentation explicitly.

**Roles** are `data/applicability.json`'s closed `effects.roles`: `give-way`,
`stand-on`, `shall-not-impede`, `keep-clear`, `none`. **Encounter types** are
`head-on`, `crossing`, `overtaking`, `none`. **Sections**: I is Rules 4–10, II
is Rules 11–18, III is Rule 19; which governs a pair is `INV-19a-scope`.

---

# Rule 13 — Overtaking

13(a) assigns a role, 13(b) deems the encounter, 13(c) resolves doubt, 13(d)
latches the result against the geometry that follows.

### INV-13b — the overtaking deeming test

`13(b)` under 11 · classification · single-state · `✎`

**Invariant.** At any state at which the two vessels are in sight of one
another and both underway, own is deemed to be overtaking other exactly when
own is coming up with other and own bears, from other, more than 22.5° abaft
other's beam — `other:geo:rel_bearing_deg` strictly inside (112.5°, 247.5°).
The sector is open at both ends (*more than* 22.5°: a vessel on the edge is
not overtaking); its edges are the forward edges of Rule 21(c)'s sternlight
arc, which 13(b)'s second limb states in light terms.

- **Undetermined term.** "Coming up with" is a speed comparison the model cannot
  express (`Q-46`); `13b-overtaking` substitutes `pair:geo:tcpa_s > 0`, which
  admits a pair closing because the vessel ahead stopped. This states the rule.
- **Not stated by 13(b).** Risk of collision: `Q-50`.
- Entries: `13b-overtaking`, `13b-overtaken`;
  `situation.constants.overtaking_sector_from_deg`/`_to_deg` (ink). Settled by
  P2.2's Alloy sector model: a partition, or a bearing that falls in both.

### INV-13b-pair — overtaking is a property of the pair

`13(b)` · classification, derived · single-state · `✎`

**Invariant.** Where `INV-13b` holds of own with respect to other, the
encounter type of the pair is `overtaking` read from *either* subject: the
vessel being overtaken is in an overtaking, not a crossing, though the
overtaking vessel bears forward of her beam.

- **Why separate.** A formalisation carrying encounter type per vessel
  classifies the overtaken side as a crossing, two types on one pair.
- Entries: `13b-overtaking`, `13b-overtaken`, each other's `when` with subjects
  swapped. Settled by P4.2 carrying the type on the pair and TLC finding no
  state where the subjects disagree.

### INV-13a — the overtaking vessel keeps out of the way

`13(a)` · precedence · single-state · `✎`

**Invariant.** At every state at which the encounter type is `overtaking`, the
overtaking vessel holds `give-way`, the overtaken vessel `stand-on`, and these
roles displace any role Rules 4–18 would otherwise assign to either vessel.
"Notwithstanding anything contained in the Rules 4-18" — the USCG rendering of
"part B, sections I and II", the same span — reaches Rule 12 and Rule 18 as
well as Rules 14 and 15.

- **Not stated by 13(a).** Risk of collision: `Q-50`.
- Entries: `13a`, overriding all eleven Rule 18 and all three Rule 12 entries.
  Settled by P4.2's role assignment: the override is or is not needed to keep
  "never both give-way" true.

### INV-13d — the latch: the classification survives the geometry

`13(d)` · classification · temporal, a state to every later state of the
encounter · `✎`

**Invariant.** Let *s* be the first state of an encounter at which own is
deemed to be overtaking other. At every state of that encounter after *s*,
until own is finally past and clear, the encounter type of the pair is
`overtaking` whatever the relative bearings then are; in particular it is not
`crossing`, and the tests of Rules 14 and 15 do not apply to the pair.

- **State remembered.** One directional boolean per subject per encounter (own
  was, earlier in this encounter, the overtaking vessel), plus the time of *s*
  for a monitor that says when the duty attached; window *s* to finally past and
  clear. Reading only the current state is wrong in the direction the paragraph
  forbids: an overtaking drawn out on the bow reads *crossing*, and hands
  give-way to the wrong vessel.
- **Undetermined term.** "Finally past and clear" has no fact and no threshold;
  the data's latch is consumer-cleared and never self-clears (`Q-47`), a trace
  model's is its segmentation, and no bearing or range is invented here.
- **Readings in doubt.** Two: what arms the latch, `Q-51`; what it forbids,
  `Q-52`.
- Entries: `13d`, reading `own`/`other:hist:was_overtaking` and no geometry; the
  `was_overtaking: false` gates on `14b`, `15a-crossing`, `15a-give-way`
  implement `Q-52`'s *broad* reading. Settled by `Q-51`, `Q-52`, then TLC on a
  three-state trace of an overtaking drawing out onto the bow.

### INV-13d-duty — the duty survives the geometry

`13(d)` second limb · precedence · temporal, as `INV-13d` · `✎`

**Invariant.** With *s* as in `INV-13d`, at every state after *s* until own is
finally past and clear, own holds `give-way` and other `stand-on`, whatever the
bearings. Separate from `INV-13d` because the two limbs come apart: a reading
on which 13(d) forbids only the *crossing* reclassification still preserves
the duty by its second clause, and a formalisation deriving role from encounter
type alone cannot distinguish `Q-52`'s readings.

- **State remembered.** As `INV-13d`.
- Entries: `13a`'s `any_of` second limb, `own:hist:was_overtaking: true` — role
  asserted from the latch directly, keeping the limbs separable. Settled by
  `Q-52`.

---

# Rule 14 — Head-on situation

### INV-14b — the head-on deeming test

`14(b)` reading 14(a)'s conditions · classification · single-state · `✎`

**Invariant.** At any state at which two power-driven vessels are in sight,
both underway, with risk of collision, and neither latched under `INV-13d`, a
head-on situation is deemed to exist exactly when each sees the other ahead or
nearly ahead: `own:geo:rel_bearing_deg` and `other:geo:rel_bearing_deg` each
in [0°, 11.25°] ∪ [348.75°, 360°).

- **Both bearings, not one.** 14(b)'s lights limb is a statement about the
  *other* vessel's aspect; one bearing alone swallows part of the crossing
  sector.
- **Undetermined term.** "Ahead or nearly ahead" has no angle;
  `situation.constants.head_on_half_angle_deg` pencils 11.25° (one compass
  point; 13(b)'s 22.5° is two), wider than the usual 5°–6° because 14(c) errs
  that way.
- **Not formalised.** The night and day observation limbs are stated as the
  geometry they encode; a vessel that cannot see the lights has 14(c).
- Entries: `14b`. Settled by `INV-13b`'s partition sweep plus a decision on the
  constant.

### INV-14a — both vessels alter to starboard

`14(a)` · conduct · temporal, a trace segment · `✎`

**Invariant.** From the first state at which a head-on situation is deemed
under `INV-14b`, each vessel shall alter her course to starboard so that each
passes on the port side of the other. Neither is directed to keep out of the
way; both are directed to act, and the duty is symmetric.

- **State remembered.** Each vessel's heading when the situation was first
  deemed, and the sign of the alteration, observable only across states. 8(b)'s
  "readily apparent" gives no magnitude; the sign and outcome (starboard,
  port-to-port) are fixed.
- **Why it matters formally.** The one Section II encounter with no `stand-on`
  vessel, and why `INV-17a1-scope` has content.
- Entries: none; `conduct`, in `known_omissions`, no conduct shape (`Q-45`);
  `14a` is retired in `data/deprecated-identifiers.json`. Settled by the first
  conduct monitor.

---

# Rule 15 — Crossing situation

### INV-15a-crossing — the crossing classification is the residual

`15(a)` · classification · single-state · `✎`

**Invariant.** At any state at which two power-driven vessels are in sight,
both underway, with risk of collision, and neither latched under `INV-13d`, the
encounter type is `crossing` exactly when it is neither `overtaking` under
`INV-13b` nor `head-on` under `INV-14b`.

- **Derived, not enumerated.** Enumerating the sector gives two statements of
  one boundary, and the partition's only failure mode is editing one;
  `REQ-CAT-9` requires this of the data, this of any formalisation. The
  partition property is `INV-PB-partition`.
- **Known incompleteness.** Two sailing vessels get no encounter type (Rules 14
  and 15 are gated on power, Rule 12 has no deeming paragraph): the Rules'. A
  pair with the history fact absent gets none: the model's (`Q-43`).
- Entries: `15a-crossing`.

### INV-15a-give-way — the vessel with the other to starboard gives way

`15(a)` · precedence · single-state · `✎`

**Invariant.** At every state at which the encounter type is `crossing`, the
vessel which has the other on her own starboard side holds `give-way` and the
other holds `stand-on`.

- **Undetermined term.** "On her own starboard side" has no sector in the
  paragraph; the data reads `own:geo:rel_bearing_deg` in (0°, 112.5°], its upper
  edge 13(b)'s constant, so it is checkable against the partition.
- Entries: `15a-give-way`, plus six `rel:overrides` from Rule 18 entries, since
  Rule 18's chapeau excepts Rules 9, 10 and 13 and no others.

### INV-15a-single — at most one give-way vessel in a crossing

`15(a)` · precedence, derived · single-state · `✎`, asserted over steady
bearings only

**Invariant.** No state assigns `give-way` to both vessels of a crossing pair
under `INV-15a-give-way`.

- **Why it is not free.** Both-starboard is a consistent *record* and an
  impossible *situation* on a steady bearing: own's speed times the sine of her
  relative bearing equals minus other's speed times the sine of the aspect, so
  the bearings lie on opposite sides. A theorem at zero bearing rate, an
  observation elsewhere.
- **Where it fails.** Non-zero bearing rate: 7(d)(i)'s pencilled 1°/min deems
  risk of collision on a slow, close starboard-to-starboard passing just outside
  the head-on cone, and both are give-way. 14(c)'s doubt case; `Q-41`.
- Entries: none; `REQ-VERIFY-8`'s steady-bearing sweep, both-starboard pinned as
  rejected.

### INV-15a-not-ahead — avoid crossing ahead

`15(a)` second limb · conduct · temporal, a trace segment · `✎`

**Invariant.** The give-way vessel of a crossing shall, if the circumstances of
the case admit, avoid crossing ahead of the stand-on vessel: from the state at
which the role attached to the state at which the two are past and clear, her
track does not pass through the region ahead of the stand-on vessel's
advancing position.

- **State remembered.** The stand-on vessel's positions and headings over the
  segment ("ahead of" a moving vessel), and the state the role attached.
- **Undetermined term.** "If the circumstances of the case admit" has nowhere to
  live — `modality` is one closed value, an action has no `effect` — `Q-31`.
- Entries: none; a `gap` on `15a-give-way`.

---

# Rule 16 — Action by the give-way vessel

### INV-16 — early and substantial action to keep well clear

`16` · conduct · temporal, a trace segment · `✎`

**Invariant.** From the state at which a vessel takes `give-way` in a pair,
she shall, so far as possible, take early and substantial action to keep well
clear of the other vessel.

- **State remembered.** The state the role attached with course and speed there,
  and every later course and speed. "Early" bounds elapsed time to the action,
  "substantial" the magnitude of the change, "well clear" the separation.
- **Undetermined terms — all three.** No number for any; 8(b)'s "readily
  apparent" is nearest to *substantial* and is a judgement. Parameterise all
  three and report sensitivity, or check only the qualitative form (an action in
  the direction that increases separation). The separation is `Q-17`'s *d*,
  `colregs-engine`'s to fix.
- Entries: none; `conduct`.

### INV-16-scope — Rule 16 attaches to the role, not the rule that assigned it

`16` · conduct, derived · `✎`

**Invariant.** `INV-16` binds any vessel holding `give-way`, whichever norm
assigned it — 13(a), 15(a), 12(a), or any limb of 18(a)–(c): "every vessel
which is directed to keep out of the way" is another norm's *output*, not a
fact.

- **Why separate.** The precedence–conduct join, `Q-35`'s shape (a norm reading
  a norm's effect): two evaluation passes or effect-reading predicates. Also why
  `give-way` is one role and not four.
- **Not covered.** `shall-not-impede` (8(f)(i) binds her, more weakly) and
  `keep-clear` (18(e), 18(f)(i)); the three non-`none` roles are three duties.

---

# Rule 17 — Action by the stand-on vessel

The obligation changes in stages with different modalities; each is stated
separately so a formalisation must make the ordering explicit.

### INV-17a1-scope — Rule 17 needs exactly one give-way vessel

`17(a)(i)` · precedence, derived · single-state · `✎`, a derivation, not a
citation

**Invariant.** Rule 17 binds a pair at a state only where one vessel is
directed to keep out of the way of the other and the other is not. Where
neither is, or both are, Rule 17 has no subject and neither holds `stand-on`.

- **The derivation.** "Where one of two vessels is to keep out of the way" fails
  on a pair in which both are directed to act. Rule 14 directs both to alter and
  does not say "keep out of the way" of either, so Rules 16 and 17 are not
  engaged by Rule 14 alone; likewise Rule 19, `INV-19a-noroles`.
- **Why stated.** A formalisation assigning `stand-on` as `give-way`'s
  complement assigns it in a head-on situation, where no paragraph does;
  `REQ-CAT-8`'s constraint exists for this.
- Settled by the maintainer ratifying or rejecting the derivation; no
  counter-reading is cited.

### INV-17a1 — phase 1: the stand-on vessel keeps her course and speed

`17(a)(i)` · conduct · temporal, a trace segment · `✎`

**Invariant.** From the state a vessel takes `stand-on` to the earliest state
at which `INV-17a2-trigger` or `INV-17b`'s condition holds, she shall keep her
course and speed: at every state her heading and speed through the water are
those she held when the role attached.

- **State remembered.** Heading and speed at attachment, for the segment — the
  reference the Rules never name.
- **Reading in doubt.** The baseline: `Q-57`.
- **Not stated.** Through the water or over the ground; the record has
  `kin:sog_kn` and no set or drift (`situation.geometry.consistency`), so a
  formalisation inherits over-the-ground.
- Entries: none; Rule 17 is `conduct` throughout.

### INV-17a2-trigger — phase 2 begins when non-compliance becomes apparent

`17(a)(ii)` · conduct · temporal, a state to the states before it · `✎`

**Invariant.** Phase 2 begins, for the stand-on vessel, at the earliest state
at which it becomes apparent to her that the give-way vessel is not taking
appropriate action in compliance with these Rules.

- **State remembered.** Everything observed of the give-way vessel since the
  role attached — track, course and speed changes, magnitude and direction. "Is
  not taking appropriate action" is about a trace: a vessel not yet altered may
  be about to; one altered the wrong way has already breached.
- **Undetermined terms — two.** "Appropriate action" is Rule 16 from the other
  side, inheriting `INV-16`'s three terms, with no elapsed time after which
  inaction is non-compliance. "Becomes apparent to her" is epistemic — the
  record has no observation class — 13(c)/14(c)'s wall (`Q-41`) with polarity
  reversed: there absence of knowledge fires a duty, here its arrival fires a
  permission. Three honest options: perfect observation (overstates the
  permission), a free input (understates the constraint), or an observation lag
  parameter. P4.2 must choose and say which.

### INV-17a2-permission — phase 2 is a permission, and is unilateral

`17(a)(ii)` · conduct · temporal · `✎`

**Invariant.** In phase 2 the stand-on vessel **may** take action to avoid
collision by her manoeuvre alone. Permissive: an invariant may not require it,
and a checker flagging a stand-on vessel for holding course in phase 2 is
wrong. "By her manoeuvre alone" constrains the action: it must avoid collision
without further action by the give-way vessel.

- **Formally.** Reachability over the stand-on vessel's manoeuvring envelope:
  `Safe(s, σ_own, σ_other)` of ADR 0005 §5 with the give-way strategy set
  unconstrained — the first Part B invariant needing `kin:dynamics`.
- **Reading in doubt.** Suspension or exception: `Q-53`.

### INV-17b — phase 3: the stand-on vessel shall act

`17(b)` · conduct · temporal · `✎`

**Invariant.** At every state at which the vessel required to keep her course
and speed finds herself so close that collision cannot be avoided by the action
of the give-way vessel alone, she **shall** take such action as will best aid
to avoid collision. Obligation, not permission; 17(a)(i)'s duty is displaced.

- **State remembered.** Strictly none (the trigger is the current state and two
  envelopes), but the phase is carried: `INV-17c` scopes on it and `Q-54` asks
  whether it can be left.
- **Formally.** The dual of `INV-17a2-permission`: *no* give-way action avoids
  collision against the stand-on vessel holding on. Reachability over
  `kin:dynamics`, not geometry; a distance threshold is a substitute, which is
  why P4.4 and P4.5 are necessary.
- **Undetermined terms.** "From any cause" admits the stand-on vessel's own
  contribution; "best aid to avoid collision" ranks by an undefined objective.

### INV-17c — no turn to port, in phase 2 only

`17(c)` · conduct · temporal · `✎`

**Invariant.** Where the stand-on vessel and the other are power-driven, the
encounter is a crossing, and the action is taken in phase 2 — in accordance
with 17(a)(ii) — she shall, if the circumstances of the case admit, not alter
course to port for a vessel on her own port side.

- **All four conditions are load-bearing.** 17(c) names 17(a)(ii), not 17(b), so
  it does not constrain phase 3: a vessel at 17(b) may alter to port for a
  vessel on her port side if that best aids. Whether the Rules intend that is
  not answered here; applying 17(c) to all stand-on action states what the
  paragraph does not.
- **State remembered.** Which phase the action was taken in; the phase is
  carried state, not only a derived label.

### INV-17d — Rule 17 never relieves the give-way vessel

`17(d)` · precedence · temporal · `✎`

**Invariant.** At every state of an encounter in which one vessel holds
`give-way`, she holds it, with `INV-16` in force, regardless of the stand-on
vessel's phase or action; phase 2 and 3 action does not transfer, share or
discharge her obligation.

- **Why separate.** The natural automaton takes the give-way duty as an input to
  its transitions; 17(d) says the arrow does not run back, so model two
  obligations holding concurrently, not one machine with one obligation.
- Entries: none; nearest is 8(f)(ii)'s parallel for `shall-not-impede`, `8f3`.

### INV-17-phases — the phase structure

`17(a)(i)`, `17(a)(ii)`, `17(b)` · conduct, derived · temporal · `✎`

**Invariant.** For a pair under Rule 17 (`INV-17a1-scope`), the stand-on vessel
is at each state in exactly one of three phases:

| phase | condition | modality on the stand-on vessel |
|---|---|---|
| 1 | neither of the below | **shall** keep course and speed (`INV-17a1`) |
| 2 | non-compliance apparent (`INV-17a2-trigger`), not yet phase 3 | **may** act, by her manoeuvre alone (`INV-17a2-permission`), subject to `INV-17c` |
| 3 | collision cannot be avoided by the give-way vessel alone (`INV-17b`) | **shall** act as will best aid to avoid collision |

Phase 3 dominates phase 2: an obligation is not qualified by a permission.

- **Reading in doubt.** Monotone or not: `Q-54`.
- **State remembered.** If monotone, one three-valued latch per stand-on vessel
  per encounter; if not, no latch but `INV-17c` still needs the phase of each
  action. TLC distinguishes them: under monotone a late-complying give-way
  vessel still leaves stand-on action permitted; under reversible it does not.

---

# Rule 18 — Responsibilities between vessels

The *shape* of the order is stated, not its eleven limbs: the shape is what a
formalisation gets wrong.

### INV-18-except — Rule 18 yields to Rules 9, 10 and 13, and to nothing else

`18` chapeau · precedence · single-state · `✎`

**Invariant.** Every role Rule 18 assigns is displaced by a role Rules 9, 10 or
13 assigns to the same pair at the same state, and by no other rule. Rule 18's
roles are *not* subordinate to Rules 12, 14 or 15: where both speak, Rule 18
governs.

- **Why both directions.** "To nothing else" is what runs the `rel:overrides`
  edges from Rule 18 *to* Rules 12 and 15; got wrong once, found by a sweep
  (`Q-40`).
- Entries: overrides on `13a` against all Rule 18 and Rule 12 entries; on
  `18a1`–`18a3`, `18c1`–`18c2`, `18f1` against `15a-give-way`; on the Rule 18
  entries that can meet two sailing vessels against `12a1`–`12a3`; a derived
  check asserts the hand-list of six against Rule 15 is complete.

### INV-18-order — the rank order

`18(a)`, `18(a)(i)–(iv)`, `18(b)`, `18(b)(i)–(iii)`, `18(c)`, `18(c)(i)–(ii)` ·
precedence · single-state · `✎`

**Invariant.** At every state at which the two vessels are in sight and both
underway, subject to `INV-18-except`:

| subject | keeps out of the way of | cite |
|---|---|---|
| a power-driven vessel | a vessel not under command; a vessel restricted in her ability to manoeuvre; a vessel engaged in fishing; a sailing vessel | 18(a)(i)–(iv) |
| a sailing vessel | a vessel not under command; a vessel restricted in her ability to manoeuvre; a vessel engaged in fishing | 18(b)(i)–(iii) |
| a vessel engaged in fishing when underway | a vessel not under command; a vessel restricted in her ability to manoeuvre | 18(c)(i)–(ii) |

The subject holds `give-way`; the object `stand-on`.

- **The classes.** 3(b), 3(c) and the rest of Rule 3; `fact:rule18_class`
  (`Q-32`) is the model's decode onto these ranks. A vessel constrained by her
  draught is a power-driven vessel for 18(a) and is ranked by it.
- **Not stated by Rule 18.** Risk of collision and encounter type: `Q-50`.
- Entries: `18a1`–`18a4`, `18b1`–`18b3`, `18c1`–`18c2`.

### INV-18-partial — the order is partial, and the gaps are the Rules'

`18(a)–(c)` · precedence, derived · single-state · `✎`

**Invariant.** `INV-18-order` is a strict partial order, not total: it does not
order a vessel not under command against one restricted in her ability to
manoeuvre (neither paragraph names the other), nor two vessels of the same
rank. Such a pair gets no role from Rule 18; outside Rules 12–15 too, no
Section II norm assigns one, and a formalisation must be able to say so.

- **What it leaves.** Inside Rule 12 or 15 — two fishing vessels under power, or
  a vessel not under command crossing one restricted in her ability to
  manoeuvre, under power — the crossing or sailing rule lays a helm duty on a
  vessel that may be unable to discharge it: Rule 2's region (ADR 0005 §5),
  recorded, not gated (`Q-40`).
- Entries: none; the steady-bearing and sailing-fleet sweeps ("never both
  give-way, never both stand-on, no two helm roles after resolution").

### INV-18c-practicable — 18(c)'s qualification is on the duty, not the rank

`18(c)` · precedence · `✎`

**Invariant.** "So far as possible" qualifies the fishing vessel's performance
of the duty, not whether it attaches: she holds `give-way` against a vessel
not under command or one restricted in her ability to manoeuvre at every state
`INV-18-order` reaches the pair, and the qualification bears on what
discharging `INV-16` requires of her.

- **Why stated.** Read as a condition on the antecedent, it gives a roleless
  pair exactly when compliance is hard and the roles matter.
- Entries: `18c1`, `18c2`, modality `shall-if-practicable` with effect
  `give-way`/`stand-on` — `Q-31`'s shape, resolved only because the duty is a
  role.

### INV-18d1 — the constrained-by-draught duty confers nothing

`18(d)(i)` with 8(f)(iii) · precedence · single-state · `✎`

**Invariant.** At every state at which a vessel other than one not under
command or restricted in her ability to manoeuvre is in sight of, and underway
with, a vessel constrained by her draught exhibiting the signals in Rule 28,
the first holds `shall-not-impede` and shall, if the circumstances of the case
admit, avoid impeding her safe passage. The vessel constrained by her draught
holds `none` — not `stand-on`; approaching so as to involve risk of collision
she remains fully obliged under Rules 4–19 (8(f)(iii)), and the impeding vessel
is not relieved (8(f)(ii)).

- **Why `none`.** Read as a give-way role, `shall-not-impede` would give the
  protected vessel a Rule 17 duty no paragraph confers — 8(f)(iii)'s content,
  and why `none` is explicit.
- **Undetermined term.** "Exhibiting the signals in Rule 28" is a
  display-compliance fact `18d1` does not read; the entry is wider (`Q-34`).
- Entries: `18d1`, `8f3`.

### INV-18f1 — the WIG craft keeps well clear

`18(f)(i)` · precedence · single-state · `✎`

**Invariant.** At every state at which a WIG craft is taking off, landing, or
in flight near the surface, she holds `keep-clear` with respect to every other
vessel — keeps well clear and avoids impeding their navigation — and the other
holds `none`. `keep-clear` is outside the give-way/stand-on pairing and Rule 16.

- Entries: `18f1`.

---

# Rule 19 — Conduct of vessels in restricted visibility

A **ruleset switch**, not an encounter type: for a pair it reaches it replaces
Section II entirely, and give-way and stand-on do not apply.

### INV-19a-scope — the ruleset switch

`19(a)` with 11 and 4 · scope · single-state · `✎`

**Invariant.** At every state, for every pair: Section I (Rules 4–10) applies
in any condition of visibility (Rule 4); Section II (Rules 11–18) applies
exactly when the two are in sight of one another, by 3(k) when one can be
observed visually from the other (Rule 11); Rule 19 applies exactly when they
are **not** in sight **and** are navigating in or near an area of restricted
visibility (19(a)). II and III are mutually exclusive by the in-sight test and
not jointly exhaustive (`INV-19a-third-state`); Rule 19 supplements Section I
(19(c): "when complying with Rules 4-10").

- **Temporal note.** The switch is a function of the current state; a pair may
  cross it and back inside one encounter, and no paragraph says what becomes of
  a 13(d) latch or a Rule 17 phase: `Q-55`.
- **Undetermined term.** "In or near an area of restricted visibility" has no
  fact (3(l)'s atmospheric condition is nowhere in `data/facts.json`), so `19a`
  selects Section III for any pair not in sight — wider — and records a gap.
- Entries: `11`, `19a`, complementary on `pair:geo:in_sight`.

### INV-19a-noroles — Section III has no give-way and no stand-on vessel

`19(a)` with 11 · precedence, derived · single-state · `✎`

**Invariant.** Where Rule 19 applies, neither vessel holds `give-way` or
`stand-on`; Rules 16 and 17 have no subject. Every Rule 19 duty falls on both
symmetrically and independently: each acts on her own appraisal, neither may
expect the other to hold her course, and no rule allocates the manoeuvre.

- **Consequence.** A role variable must hold "no role" distinguishably from "no
  encounter" — `Q-43`'s distinction from a second direction, for
  `colregs-engine`'s status alphabet.
- Entries: none produce a role under `in_sight: false`; every Section II
  `precedence` entry gates on `in_sight: true`. By construction, not asserted.

### INV-19a-third-state — not in sight, and not in restricted visibility

`19(a)` with 11 and 4 · scope, derived · single-state · `✎`, states a gap and
does not close it

**Invariant.** There are states at which two vessels are not in sight and not
in or near restricted visibility — beyond visual range in clear weather, or
aware of each other by radar or AIS alone on a clear night. There Rule 11
excludes Section II, 19(a) excludes Rule 19, and only Section I governs.

- **Why written down.** A hole forced by both scope paragraphs, which "not
  Section II, so Section III" will not have. The model closes it by dropping
  19(a)'s second conjunct — a decision, not a reading: `Q-56`.
- Entries: `19a`'s `gap`.

### INV-19b — safe speed, and engines ready

`19(b)` · conduct · first limb single-state, second a property of the
machinery · `✎`

**Invariant.** At every state at which Rule 19 applies, every vessel proceeds
at a safe speed adapted to the prevailing circumstances and conditions of
restricted visibility, and a power-driven vessel has her engines ready for
immediate manoeuvre.

- **Undetermined term.** "Safe speed" is Rule 6: factors, no number.
  Formalisable without inventing one: the *comparison* — safe speed under Rule
  19 is not greater than in the same geometry in clear visibility, since 19(b)
  adds to Rule 6's list and removes nothing. Assert the monotonicity, decline
  the value.
- **Not formalisable from the record.** "Engines ready" is a fact about the
  machinery, in neither the fact record nor `kin`, and of no pair.

### INV-19c — due regard when complying with Rules 4–10

`19(c)` · conduct · `✎`

**Invariant.** At every state at which Rule 19 applies, every vessel has due
regard to the prevailing circumstances and conditions of restricted visibility
when complying with Rules 4 to 10.

- **Undetermined modality.** "Shall have due regard to" is neither obligation
  nor permission but a manner of complying with other rules; no modality value
  (7(d)(ii)'s obstacle, `Q-42`). Covered, not checkable.

### INV-19d-determine — the radar-alone determination

`19(d)` first sentence · conduct · temporal, discharged over a segment · `✎`

**Invariant.** At every state at which Rule 19 applies and a vessel has
detected another **by radar alone**, she shall determine whether a
close-quarters situation is developing and whether risk of collision exists.

- **State remembered.** "Developing" needs the ranges and bearings since
  detection; 7(b)'s "radar plotting or equivalent systematic observation" is the
  operation, `kin:position` cited to it.
- **The antecedent.** "By radar alone" restricts: a vessel with a fog signal and
  no radar contact is under 19(e), not 19(d), so the means of detection must be
  carried, and the record has no observation class.
- **Undetermined term.** "Close-quarters situation": undefined, no distance.

### INV-19d-action — avoiding action in ample time

`19(d)` second sentence · conduct · temporal · `✎`

**Invariant.** Where `INV-19d-determine` finds a close-quarters situation
developing, or risk of collision, or both, the vessel shall take avoiding
action in ample time.

- **State remembered.** The state at which the determination was or should have
  been made ("ample time" runs from it), and course and speed there.
- **Undetermined term.** "Ample time" has no figure; P4.4's timed model against
  `kin:dynamics`' stopping distance and turning circle computes it, which is
  better than choosing it.

### INV-19d1 — no alteration to port for a vessel forward of the beam

`19(d)(i)` · conduct · temporal · `✎`

**Invariant.** Where `INV-19d-action`'s action is an alteration of course,
then so far as possible the vessel shall not alter course to port for a vessel
forward of her beam — `own:geo:rel_bearing_deg` in (270°, 360°) ∪ [0°, 90°) —
other than for a vessel being overtaken.

- **The exception reaches across the switch.** "A vessel being overtaken" is
  Rule 13's classification inside Section III, where Rule 13 does not apply: the
  classification layer cannot be gated on `pair:geo:in_sight` if 19(d)(i) is to
  be expressible. The entries today are so gated.
- **Undetermined term.** "So far as possible": `Q-31` again.

### INV-19d2 — no alteration toward a vessel abeam or abaft the beam

`19(d)(ii)` · conduct · temporal · `✎`

**Invariant.** Where `INV-19d-action`'s action is an alteration of course,
then so far as possible the vessel shall not alter course toward a vessel
abeam or abaft her beam — `own:geo:rel_bearing_deg` in [90°, 270°].

- **"Toward"** is the sign of the alteration against the other's bearing, not
  the resulting heading: toward when it reduces her relative bearing off the bow
  on the side she lies. The resulting-heading form is wrong for a vessel nearly
  astern.

### INV-19e — reduce to steerage way

`19(e)` · conduct · temporal · `✎`

**Invariant.** At every state at which Rule 19 applies and a vessel either
hears, apparently forward of her beam, the fog signal of another vessel, or
cannot avoid a close-quarters situation with another vessel forward of her
beam, she shall — except where it has been determined that risk of collision
does not exist — reduce her speed to the minimum at which she can be kept on
her course; shall if necessary take all her way off; and shall in any event
navigate with extreme caution until danger of collision is over.

- **State remembered.** The segment ends "until danger of collision is over", so
  both bounds are undefined; the exception clause carries `INV-19d-determine`'s
  determination forward, state a monitor holds, not recomputes.
- **Its subject is not a pair.** A fog signal's source may not be a tracked
  vessel; the record is a record of a *pair*, and 19(e) is the clearest Part B
  paragraph that does not fit it — an observation class or an "unidentified
  contact" subject is needed. Recorded, not resolved.
- **Undetermined terms.** "Apparently forward of her beam" (an observation of
  unstated accuracy), "close-quarters situation", "the minimum at which she can
  be kept on her course", "extreme caution", "until danger of collision is over"
  — five, so this states the paragraph and formalises none.

---

# Cross-rule invariants

Asserted by a checker over the whole of Section II; derived, stated by no
paragraph of its own.

### INV-PB-roles-exclusive — never both give-way, never both stand-on

`13(a)`, `15(a)`, `12(a)`, `18(a)–(c)` with 18's chapeau · precedence, derived
· single-state · `✎`, asserted over consistent steady bearings only
(`REQ-VERIFY-8`)

**Invariant.** At every state, after every `rel:overrides` is applied, no pair
holds `give-way` on both subjects, and none holds `stand-on` on both.

- **Known exception, pinned.** Not a theorem at non-zero bearing rate:
  `INV-15a-single`.
- Entries: none; the sailing-fleet and power-fleet sweeps in
  `test/data.test.mjs`, where removing any of the six Rule 18 → Rule 15
  overrides fails the sweep.

### INV-PB-partition — exactly one encounter type

`13(b)`, `13(d)`, `14(b)`, `15(a)` · classification, derived · single-state ·
`✎`

**Invariant.** For any pair the three deeming tests all reach, exactly one of
`overtaking`, `head-on` and `crossing` holds — never two, never none.
`REQ-CAT-9`'s partition as an invariant; the natural first Alloy invariant for
P2.2.

- **What "all reach" excludes.** Two sailing vessels, no risk of collision, not
  in sight (the Rules); `hist:was_overtaking` absent (the model, `Q-43`).

### INV-PB-one-role-source — a vessel holds one helm role at a time

`13(a)`, `18` chapeau, with 16 and 17 · precedence, derived · single-state · `✎`

**Invariant.** After every `rel:overrides` is applied, no vessel holds both
`give-way` and `stand-on` with respect to the same other vessel at the same
state.

- **Known exception, recorded as a finding.** A sailing vessel meeting a vessel
  constrained by her draught holds `stand-on` (18(a)(iv)) and `shall-not-impede`
  (18(d)(i)) at once; not two helm roles, so the invariant survives, and the
  pairing is pinned as `Q-36`, not overridden.

---

## Not formalised here

Goal 4 of the epic is legal traceability: a paragraph with a switchable effect
is either covered or explicitly excluded, and an unmentioned paragraph is a
hole. Every `data/rules.json` path in 13–19 appears exactly once below;
`REQ-INV-3`'s test enforces it.

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

Thirty-nine paths; thirty-four covered, five excluded. Forty invariants, the
three `INV-PB-` ones cross-rule and against no single paragraph.

### Excluded paragraphs, with reasons

- **13(c)** and **14(c)** — a duty firing on the *absence* of knowledge; it
  needs a `doubt` boolean (a reported mental state) or reads an absent fact as
  an assertion, reversing the predicate language's one firm commitment
  (`Q-33`). In `known_omissions`; `Q-41`. These two make the Rules' errors
  *conservative*, so excluding them makes any conclusion drawn here less
  cautious than the Rules — the direction an exclusion must not be silent about.
- **18(d)(ii)** — "particular caution having full regard to her special
  condition": conduct, undefined standard, no counterparty; `known_omissions`.
- **18(e)** — no seaplane fact: `fact:propulsion` has power, sail and oars, and
  3(a) makes a seaplane a vessel with nowhere to say so; `keep-clear` exists,
  the predicate does not. In `known_omissions`.
- **18(f)(ii)** — a WIG on the surface "as a power-driven vessel" is a decode
  onto `propulsion:power`, not a norm about a pair. In `known_omissions`;
  18(f)(i) is `INV-18f1`.

### Terms named inside a covered invariant and not formalised

Listed so that "covered" is not read as "checkable"; each is a term the Rules
use and do not define.

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

Three have a `situation.constants` stand-in: the overtaking sector's edges
(ink, from 13(b)), the head-on half-angle (pencil), 7(d)(i)'s appreciable
bearing change (pencil). The rest have none: parameterise and report
sensitivity, or check only qualitatively.

### Rules outside 13–19 that these invariants read

Not excluded, and not this file's to state: Rule 3 (3(b), 3(c), 3(k)), Rule 4
(Section I's scope), Rule 5, Rule 6 (safe speed), Rule 7 (risk of collision),
Rule 8 and particularly 8(b) and 8(f), Rules 9 and 10 (excepted by Rule 18's
chapeau), Rule 11 (Section II's scope), Rule 12 (two sailing vessels), Rule
21(c) (the sternlight arc, 13(b)'s sector).

Rule 2 is absent from every invariant: ADR 0005 §5 makes it a region computed
offline, a compliance invariant citing it would be circular, and pointers into
that region above are recorded, never gated.

---

## Open questions raised by this file

`Q-50`–`Q-57` in `docs/requirements.md` §11, "From the Part B invariants
(P4.1)": each a place where the text admits two readings and this file declines
to choose.
