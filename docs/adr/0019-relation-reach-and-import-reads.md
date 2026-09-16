# ADR 0019 — What a relation reaches, and what an import reads

Date: 2026-09-16
Status: proposed — merging this PR is the ruling; a revert undoes it

## Context

REQ-MODEL-7 and the README define the six relation verbs by meaning and
leave composition to the consumer (REQ-CONS-3). colregs-engine#33 checked
the seven composition decisions its evaluator makes where the data is
silent. ADR 0007 settled the largest, direction: a directed "this one
prevails" is `rel:overrides`, and `rel:excludes` is pick-one between
alternatives. Three readings of the verbs remain stated only in
colregs-engine's `docs/engine-notes.md` (items 2, 3 and 5) and pinned only
by its tests: how far a relation reaches, what a `one_of` yields, and which
part of a referenced entry's predicate an import consults. Each is a
reading of the Rules, and the package that carries the Rules should say it.

## Decision

1. **Displacing relations reach entries in force; composing relations
   reach what is exhibited.** An entry is *in force* when its own predicate
   holds. `rel:overrides` and `rel:exempts` act on entries in force and on
   nothing else: an import is not in force, it is a light set its carrier
   exhibits, and the carrier is what a displacing relation must name.
   `rel:in_lieu_of`, `rel:excludes`, `rel:includes` and
   `rel:conditional_includes` act on what one display may contain, imports
   included, and remove nothing from the set of entries in force. Direction
   is carried by the verb, never by modality: an override fires from a
   forceful entry (ADR 0007), an exemption from a `modality:exempt` one,
   and `rel:excludes` fires from nowhere — it is symmetric and already
   barred to forceful entries by CI (`test/data.test.mjs`, "rel:excludes is
   reciprocated"). A consumer that infers a veto from an excluder's modality
   is reading a relation the data does not carry.

2. **A `one_of` yields exactly one option per display, or none when the
   carrier is `modality:may`.** Under a `may` carrier the chosen option is
   exhibited in lieu of the carrier's own lights, and the none choice
   exhibits them (25(d)(ii): the sailing lights, or failing them the torch).
   An option already in force by its own predicate discharges the set: the
   carrier imports nothing, and the option composes as the entry it is. A
   vessel restricted in her ability to manoeuvre at anchor shows 30(a) or
   30(b) because 30(a) and 30(b) apply to her, not because 27(b)(iv)
   redirects her to them. Every choice is returned (REQ-MODEL-8).

3. **An import reads the referenced entry's lights, their modality, and
   its scalar gates — never its axes.** An import is a `rel:includes`, the
   `rel:includes` of a `rel:conditional_includes` branch, or a `one_of`
   option. `facts.json`'s `axes` and `modifiers` are the field: a key
   declared there is the vessel's situation, and the carrier's redirect has
   already placed her in it — 30(d) sends a vessel aground to "the lights
   prescribed in paragraph (a) or (b)", and that she is not at anchor is the
   premise of the redirect, not a gate on it. A key not declared there is a
   fact the redirect does not alter, and the referenced entry's condition
   on it binds: 30(b)'s "less than 50 metres" binds a vessel aground as it
   binds one at anchor, and 25(b)'s "less than 20 metres" binds a vessel
   under oars. Modality is the referenced entry's, resolved against the
   vessel (Rule 28's three reds are `may`; the Rule 23 lights it imports
   stay `shall`). A gate the carrier needs that the source does not carry is
   written on the carrier's branch `when`, as 27(f) and 29(a) do; nothing
   is inferred from a source's axes in either direction. REQ-MODEL-7's
   "lights only, never its predicate" is amended to say this.

4. **Two entries in force whose `rel:in_lieu_of` targets intersect are
   alternatives to each other** and never share a display. This is an
   invariant of the verb, not a declared pair list. Both pairs the data
   holds read that way in the text: 23(d)(ii)'s display is 23(d)(i)'s with
   the sidelights made practicable-only, and 25(d)(i)'s torch is what a
   vessel shows *if she does not* exhibit (a) or (b). A future pair that
   lawfully combines is the evidence to reopen this point; until one
   exists, the target sets are the declaration.

Three shapes were considered and not adopted. Restating each option's
scalar gate on the carrier's branch (30(d) split at 50 m) keeps "lights
only" literal at the cost of transcribing 30(b)'s condition into 27(b)(iv),
27(f), 29(a) and 30(d), and 25(b)'s into 25(d)(ii), plus a CI check to
police the copies; the text redirects, it does not restate, and REQ-MODEL-5
puts a gate where its fact lives. Declaring the point-4 pairs as a relation
duplicates what the target sets say. A per-verb "reaches imports" flag
would be set the same way on every entry, and a field nothing varies is
decoration.

## Consequences

- **No data changes.** The README relation table, REQ-MODEL-7 and the
  `relations` notes in `data/applicability.json` say the four points in
  this PR. `docs/identifiers.md` and the schema are untouched.
- **colregs-engine implements this in one issue, three deletions.** Its
  modality-inferred exclusion path goes: `rel:excludes` is a co-occurrence
  check on a display and nothing more. Its `includeApplies` goes: it
  consulted one axis by name on `rel:includes` imports, the inverse of
  point 3, and no import in the data reaches it on a coherent record —
  every carrier either shares the source's position gate (23(b), 23(c),
  25(c), 28), gates its branch on it (24, 27(f), 29(a)), or reads
  `fact:making_way`, which refines `position:underway` (26(b)(iii),
  26(c)(iii), 27(a)(iii), 27(b)(iii)). The availability test it already
  applies to `one_of` options becomes the one rule for every import. Its
  `docs/engine-notes.md` items 2–5 become pointers here. colregs-engine#33
  items 1, 6 and 7 stay the engine's: presentation and output shape.
- **A `one_of` option's scalar gate is a normative read of the source
  entry.** Editing 30(b)'s length gate changes what a vessel aground may
  show. That is the intended coupling: one paragraph, one gate.
- **Cost to reverse.** Delete this file and restore two sentences; the
  engine's deleted paths come back by revert. Pre-1.0, a revert.
