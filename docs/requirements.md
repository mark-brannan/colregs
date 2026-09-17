# colregs — design requirements

Status: **draft**, seeded 2026-08-29. This is the source of truth for what the
package must do. Coding sessions work against these IDs; tests cite them.

Requirement IDs are stable and never reused. If a requirement is dropped it is
struck through and kept, not deleted — a spec whose IDs shift silently cannot
be cited by a test.

A requirement marked **(unimplemented)** is specified but not yet built, and
nothing in the repository satisfies it today; **(unimplemented in part)**
names the clause that is outstanding. Either way it is still binding; the
marker exists so the document cannot be read as a description of what ships.
Requirements that are pure prohibitions, or constraints on a future addition
that has not happened, carry no marker — there is nothing to
implement until something tries to violate them. Gate status is not marked in
prose at all: it is data, in `docs/gates.json`.

Language: **MUST** / **SHOULD** / **MAY** in the RFC 2119 sense.

---

## 1. Purpose

Publish the international collision regulations, and the national amalgamations
derived from them, as language-neutral data that more than one implementation
can consume and verify against.

Two named consumers shape the design:

- **an educational app** — wants every rule, including those with no switchable
  output, plus imagery and prose;
- **a switching plugin** — wants only the subset a boat can actually act on,
  evaluated against live vessel state.

Neither consumer lives in this repo.

### Non-goals

- **No inference.** The package does not decide what a vessel *is doing*.
  Deriving `making_way`, propulsion or activity from sensor data belongs to a
  separate consumer. This package is a pure function of a fact record.
- **No runtime.** Data and fixtures only; no evaluator ships here.
- **No advice.** The package states what the rules require. It does not tell a
  mariner what to do, and carries no claim of fitness for navigation.

---

## 2. Definitions

| Term | Meaning |
|---|---|
| **paragraph path** | The citation unit: `27(a)(i)`, `25(d)(ii)`. Not the rule number. |
| **fact record** | A set of facts about one vessel at one moment; the input. |
| **entry** | One applicability record: predicate → lights/refs → modality → citation. |
| **modality** | `modality:shall` / `modality:may` / `modality:shall-if-practicable`. |
| **jurisdiction** | A body of rules: `intl`, `us/inland`, `ca/inland`, … |
| **delta** | A jurisdiction's departures from the international text. |
| **identifier** | Any name the data is addressed by: entry id, paragraph path, light id, fact key, fact value, relation name, modality/role/encounter/category value, jurisdiction value. |

---

## 3. Scope and jurisdictions

- **REQ-SCOPE-1** — The package MUST model the international regulations
  (COLREGS 72) as its base body of rules.
- **REQ-SCOPE-2** — Jurisdiction MUST be a first-class dimension on every
  applicability entry and every rule-text record, expressed as
  `<country-or-body>/<waters>` with `intl` as the reserved base value.
  Examples: `intl`, `us/inland`, `us/great-lakes`, `us/western-rivers`,
  `ca/inland`, `de/binnen`, `eu/cevni`. The jurisdiction value is itself an identifier, unprefixed and immutable under REQ-MODEL-10 (ADR 0017).
- **REQ-SCOPE-3** — A jurisdiction MUST be expressible as a *delta*: entries
  absent from a jurisdiction's data inherit from `intl`. A jurisdiction MUST
  NOT require restating the whole body of rules. Inheritance is "unless
  suppressed", not unconditional: verified Inland structure (Rule 28
  "[Reserved]") means silence-means-inherit would apply international law
  where the national body deliberately has none, so a jurisdiction MUST
  tombstone each inherited entry it deliberately lacks in `suppressions[]`
  (ADR 0018; Q-11). The delta is an RFC 7396 merge patch over `intl` by
  entry id — own entries present, tombstones `null`, silence inherits — and
  a test proves the stored tables equal to that patch applied. This binds
  whether a jurisdiction's text ships or is withheld (REQ-PROV-2, ADR 0010
  are separate). A delta that only *adds* entries has no tombstones (ADR
  0008); one that replaces an `intl` entry tombstones it and adds its own.
- **REQ-SCOPE-4** — Adding a jurisdiction MUST be additive. It MUST NOT require
  a schema change or edits to existing `intl` entries.
- **REQ-SCOPE-5** — Geography that gates a rule (Great Lakes, Western Rivers,
  a designated special anchorage area) MUST be an ordinary fact read by a
  predicate, NOT a jurisdiction value of its own where the rule is a
  conditional inside a wider jurisdiction.
- **REQ-SCOPE-6** — Every release MUST state, in the README, exactly which
  jurisdictions and which rule parts it contains. Silence MUST NOT imply
  coverage.

### 3.1 Rule parts

Part C (Rules 20–31, lights and shapes) is v1. The structure MUST accommodate
the rest without redesign.

- **REQ-PART-1** — Part C lights MUST be complete for `intl` before any other
  part or jurisdiction is added, except a purely additive jurisdiction delta
  recorded in an ADR — one that adds entries and edits or suppresses none
  (ADR 0008). Such a delta is not a claim to model that jurisdiction, and
  REQ-SCOPE-6's coverage statement MUST say what it does and does not cover.
- **REQ-PART-2** — Day shapes MUST use the same entry model as lights, differing
  only in the fixture vocabulary they emit.
- **REQ-PART-3** — Sound and light signals (Part D, Rules 32–37) SHOULD be
  representable by the same entry model. Where they are not — signals are
  event-triggered rather than state-derived — the divergence MUST be recorded
  as an ADR before any Part D data is written.
- **REQ-PART-4** — ~~Steering and sailing rules (Part B) are OUT of v1 scope and
  MAY never be modelled; they govern conduct between two vessels, not the
  appearance of one, and the fact record is single-vessel by construction.~~
  **Superseded by ADR 0005** (2026-09-04); replaced by REQ-CAT-1..5 (§4.1).
  Part B stays out of v1 scope (REQ-PART-1 still orders Part C first), but
  the situation record of REQ-CAT-4 removes the single-vessel obstacle.

---

## 4. Data model

Four layers, each independently addressable.

- **REQ-MODEL-1** — **Rule text**, verbatim, keyed by paragraph path. Text MUST
  NOT be paraphrased, summarised or reflowed. Where a jurisdiction's text
  differs, both MUST be stored, keyed by jurisdiction — unless the paragraph is
  `text_status: withheld` (ADR 0010), which stores no rule text. What a
  withheld paragraph carries instead — citation alone, a digest, a
  deterministic non-prose reduction, or the `intl` equivalent — is pencil in
  ADR 0010, deliberately unsettled. This requirement bars paraphrasing text
  the package *ships*; it does not by itself decide the withheld case.
- **REQ-MODEL-2** — **Light definitions** (Rule 21) MUST carry colour, arc of
  visibility in degrees, and range by length band (Rule 22). Jurisdictions MAY
  add definitions (e.g. the US special flashing light, Inland 21(g)).
- **REQ-MODEL-3** — **Facts**: the input vocabulary. Three orthogonal axes MUST
  be used, never a single flattened status enum:
  - `fact:propulsion` ∈ `propulsion:power` / `propulsion:sail` /
    `propulsion:oars`
  - `fact:activity` ∈ `activity:none` / `activity:fishing` /
    `activity:trawling` / `activity:towing` / `activity:pushing` /
    `activity:being_towed` / `activity:nuc` / `activity:ram` /
    `activity:ram_underwater` / `activity:cbd` / `activity:mine` /
    `activity:pilot` / `activity:diving`
  - `fact:position` ∈ `position:underway` / `position:anchored` /
    `position:aground` / `position:moored`
  plus `fact:making_way` as a boolean refining `fact:position=position:underway`
  and `fact:on_mooring_buoy` as a boolean refining
  `fact:position=position:moored` — made fast to a buoy, not to the shore;
  the Convention prescribes lights for neither, and only a jurisdiction that
  deems her at anchor reads it (ADR 0008) — and numeric and boolean facts (`fact:length_m`, `fact:tow_length_m`,
  `fact:max_speed_kn`, `fact:composite_unit`, and the education-only facts).
  Fact keys, and the values of the enumerated facts, carry a type prefix;
  `docs/identifiers.md` states the scheme and why citation-derived
  identifiers do not.
- **REQ-MODEL-4** — **Applicability entries**: `when` (predicate over facts) →
  lights or refs → modality → citation → jurisdiction. Every entry MUST have a
  stable id, a paragraph key in the `rule:` namespace (`rule:25d_i`; ADR 0015).
- **REQ-MODEL-5** — Gates MUST be expressed as predicates over facts
  (`fact:length_m < 7`), never as pre-enumerated tuples or configuration counts. Any
  count of "configurations" is an output of evaluation, never an input to the
  data.
- **REQ-MODEL-6** — Entries MUST compose. Multiple entries applying to one fact
  record is the normal case, not an error (Rule 28 is "in addition to" Rule 23).
- **REQ-MODEL-7** — Five relations MUST be supported:
  - `rel:includes` — import another entry's lights, modality and scalar gates, never its axes (ADR 0019);
  - `rel:in_lieu_of` — legal alternatives for the same fact record; overlapping targets are alternatives to each other (ADR 0019);
  - `rel:excludes` — mutual exclusion, including across rules; symmetric
    (A excludes B implies B excludes A), and no participating entry MAY be
    forceful (`modality:shall`/`modality:shall-if-practicable`) — a directed "this one
    prevails" is `rel:overrides` (ADR 0007), not `rel:excludes`; a constraint on one display, never a removal (ADR 0019);
  - `rel:exempts` — one entry lifting another's obligation; reaches an entry in force, never an import (ADR 0019);
  - `rel:conditional_includes` — import or alternatives, gated on a predicate; a `one_of` yields exactly one per display, or none under a `may` carrier (ADR 0019).
  The five are not interchangeable; README.md holds the working semantics.
- **REQ-MODEL-13** — Where a condition goes is not a style choice. A
  condition on whether a paragraph *applies to this vessel at all* MUST be in
  the entry's predicate; a condition on *which of two applicable paragraphs
  prevails* MUST be a relation between them, never a negation of the other
  entry's class folded into the predicate. The test: delete the other
  paragraph, and if this one is still true of the vessel, it is a relation.
  Rule 28 does not speak to a vessel constrained by her draught at anchor, so
  `underway` is a predicate; Rule 15 does speak to a fishing vessel under
  power, and Rule 18 only displaces the role it assigns, so that is
  `rel:overrides`. A gate doing a relation's job silently drops every pair the
  displacing paragraph is silent about (fishing against fishing under Rule 18).
  ADR 0005 §4.
- **REQ-MODEL-12** — `rel:conditional_includes` carries three shapes under
  one name, inferred from which keys are present: a bare `one_of`
  (`rule:25d_ii`), a gated `one_of` (`rule:27f`), and a gated import with its
  own `cite` (`rule:29a`). **Soft**: the data is correct and tested, but a
  relation whose semantics depend on key presence cannot be schema-validated.
  Before a non-`intl` jurisdiction lands, split the relation or add a
  discriminant. Accepted risk until then (Q-10).
- **REQ-MODEL-8** — Alternatives MUST be first-class. Where the rules permit a
  choice, the data MUST express all lawful options with their differing
  modalities and gates, and MUST NOT pick one.
- **REQ-MODEL-9** — A decode table from SignalK `navigation.state` to the three
  axes MUST ship with the package. Its lossy cases MUST be enumerated in data,
  not prose — at minimum, the flat enum cannot express fishing-at-anchor.
- **REQ-MODEL-10** — **Identifiers are immutable once published.** An
  identifier (§2) that has shipped in a released version MUST NOT be
  renamed, reused, or repointed. Specifically:
  - **Adding** an identifier is always permitted, at any version.
  - **Deprecating** one is permitted: it MUST keep denoting what it always
    denoted, MUST be marked deprecated in data with the version that
    deprecated it, and MUST NOT be removed in the same major version.
  - **Mutating** one is forbidden. This covers the obvious case (renaming
    `rule:25b`) and the dangerous quiet one: an identifier keeping its spelling
    while changing what it denotes — a paragraph path repointed at
    different text, a fact value narrowed, a light id reassigned. A
    consumer cannot detect this, and every stored citation becomes silently
    wrong.
  - **Reuse after removal** is forbidden outright. A retired identifier is
    retired permanently; its spelling MUST NOT be reissued with a new
    meaning in any later version.

  Where a renumbering upstream forces a genuine collision, the resolution
  is a **new identifier plus a deprecation**, never a repoint. Renaming or
  removing an identifier is a major version (REQ-PKG-4); repointing one is
  not a version event at all, because it is not permitted.

  **Immutability baseline: `1.0.0`.** The prohibitions above bind every
  identifier present in `colregs@1.0.0` and every identifier introduced
  from then on. Before `1.0.0` the schema is being designed, and an
  identifier may be renamed or discarded without a deprecation record.
  First set at `0.1.1` (2026-08-30) so the identifier audit could happen;
  moved to `1.0.0` by Solace's ruling on #121 (ADR 0015, 2026-09-16).

  From `1.0.0` the baseline is **fixed**. It MUST NOT be moved, raised,
  re-stated in a later version, or joined by a second baseline clause.
  Without that, "move the baseline" is a silent escape hatch from
  REQ-MODEL-10 and the exception becomes the pattern.
  `test/data.test.mjs` pins the literal and refuses a second clause — the
  form the escape hatch actually takes. There is no identifier diff against
  the last release: ADR 0006 proposed one, ADR 0015 removed it pre-1.0.

  **Recorded review — identifier audit, 2026-08-30.** `docs/identifiers.md`
  states what it changed, and why `nuc`, `cbd`, `ram` and `ram_underwater`
  stay unspelled. Its two kept findings on entry-id suffixes were reopened
  and superseded by ADR 0015.
- **REQ-MODEL-11** — Deprecated identifiers MUST be recorded as data — a
  registry naming each retired identifier, what it denoted, the version that
  deprecated it, and its replacement where one exists. Prose in a changelog
  MUST NOT stand in for it: a consumer pinned to an old version needs to
  resolve a stale identifier mechanically. **The registry is absent until
  `1.0.0`.** ADR 0015 deleted it, and the diff that read it: nothing before
  the baseline is immutable, so nothing before it can be retired, and an
  empty file with a dormant test is a mechanism that cannot fire.

### 4.1 Rule categories and the situation record

ADR 0005. Everything in this subsection is **pencil** (`docs/conventions.md`):
any session may change it for a better idea, logging the change. It is
recorded as a requirement because it is what the package has decided to build
towards, not because the shape is settled.

- **REQ-CAT-1** **(unimplemented in part — `category` is carried by the
  two-subject entries and defaulted for the rest; no record in `rules.json`
  carries one, so a paragraph with no entry is uncategorised)** —
  Every rule paragraph record MUST carry exactly one `category` from the
  closed set `category:scope`, `category:definition`, `category:standard`, `category:display`,
  `category:classification`, `category:precedence`, `category:conduct`, `category:care`, `category:meta`. The field
  defaults to `category:display`, so existing entries are correct unedited. CI MUST
  fail on a value outside the set. Where a paragraph plays a second role,
  that role MUST be expressed as a relation (REQ-CAT-3), never as a second
  category.
- **REQ-CAT-2** — `category:care` and `category:meta` paragraphs (Rules 2(a) and 2(b)) MUST NOT
  be applicability entries. They MUST be recorded in a registry sibling to
  `known_omissions`, stating that the package represents them and evaluates
  neither. CI MUST fail on a `category:care` or `category:meta` paragraph that appears as an
  entry.
- **REQ-CAT-3** **(unimplemented in part — `modality:shall-not` has no entry yet)** —
  The modality vocabulary MUST admit `modality:shall-not` and `modality:shall-not-impede`
  alongside `modality:shall`, `modality:may`, `modality:shall-if-practicable`, `modality:conditional` and
  `modality:exempt`, and the relation vocabulary MUST admit `rel:overrides` as a
  sixth verb beside REQ-MODEL-7's five. Both remain closed sets; CI MUST
  fail on a value outside them, and on a cycle in `rel:overrides`.
- **REQ-CAT-4** — A two-subject rule MUST read a **situation record**:
  two per-vessel fact records, a kinematic state per vessel, relative
  geometry, and history. The per-vessel fact record MUST NOT change to accommodate it, and kinematic
  state MUST be a distinct fact class — a consumer that reads only `category:display`
  entries MUST NOT be required to supply one. Adding the situation record
  MUST leave every existing fixture valid unedited.
- **REQ-CAT-5** — A situation MUST NOT be expressible in the current
  single-vessel fixture format. Before any two-subject entry lands, the fixture schema MUST be
  extended to carry a situation and to name each subject unambiguously, and
  the extension MUST be backward-compatible with the fixtures published
  today (REQ-VERIFY-1).
- **REQ-CAT-6** — The situation record MUST be declared in
  `data/facts.json` under `situation`, and MUST address each vessel's facts
  through the subject namespace of `docs/identifiers.md`:
  `<subject>:<class>:<key>`, subject from `self`/`other`/`pair`, class from
  `fact`/`kin`/`geo`/`hist`/`env`. A key with no subject segment MUST mean `self:`,
  so that every predicate and fixture published today is a valid situation
  predicate unedited. `self:fact:*` and `other:fact:*` MUST resolve to the
  per-vessel fact record key for key, with no key renamed or copied.
  `pair` MUST carry only classes whose facts are symmetric between the two
  vessels; `env` — where the encounter is happening — is `pair`-only for that
  reason and MUST NOT appear under a vessel. Every fact in the `kin`, `geo` and `hist` classes MUST carry
  `type`, `cite`, `actuable` and `signalk` like the existing scalars, and a
  `null` `cite` MUST carry `cite_pending` naming the paragraph it awaits, or
  an explicit `null` where no paragraph will ever justify it. CI MUST fail
  on a subject or class outside the declared sets, on a `pair` class that is
  not symmetric, and on a fact record key that does not survive the subject
  prefix.
- **REQ-CAT-7** — Situation fixtures MUST live in a file separate from
  `fixtures/applicability-fixtures.json`, which MUST remain byte-identical
  (REQ-VERIFY-1). Each case MUST carry a `situation` whose every key
  resolves in the namespace of REQ-CAT-6 to a fact declared in
  `data/facts.json`, and a `status` from a closed set. An element of
  `expect` MUST be either a bare entry id — the published one-subject form,
  asserting nothing about modality — or `{entry, modality}` naming the
  modality that entry is expected to carry, which is what Q-5 needs. A case
  MAY state `roles`, the pooled two-frame answer for both subjects (ADR
  0016). An `illustrative` case MUST assert no entries and MUST NOT join the
  replay. CI MUST fail on an undeclared fact, an unresolvable key, an unknown
  entry id or modality, a stated role the pooled read does not yield, and on
  an `illustrative` case that names an entry.

- **REQ-CAT-8** — A two-subject entry MUST state an `effect` and MUST NOT
  state `lights`. For a `category:precedence` entry the effect MUST be a role per
  subject, `{self, other}`, from the closed set `role:give-way`, `role:stand-on`,
  `role:shall-not-impede`, `role:keep-clear`, `role:none`; for a `category:scope` entry it MUST name
  the part, the section and the rules that section governs; for a
  `category:classification` entry it MUST carry exactly one key, either `encounter`
  from the closed set `encounter:head-on`, `encounter:crossing`, `encounter:overtaking`, `encounter:none`, or
  `risk_of_collision`, whose only value is `true`. `role:stand-on` MUST
  appear only as the counterpart of `role:give-way`, and the counterpart of
  `role:shall-not-impede` MUST be `role:none` — Rule 8(f)(iii) is why. CI MUST fail on a
  role or an encounter outside its set, on an effect whose shape does not match
  its category, and on a `rel:overrides` that resolves to no entry, points at an
  entry of a different category, or closes a cycle. `✎` pencil, with the rest of
  §4.1.
- **REQ-CAT-9** — The `category:classification` entries for Rules 13, 14 and 15 MUST
  **partition** the pair's relative geometry: for any situation those entries
  all reach, exactly one encounter type MUST apply — never two, never none.
  The crossing sector MUST NOT be enumerated; it MUST be derived, as the
  negation of the other two, so that a single constraint object states each
  sector and its complement. Any numeric threshold a Part B predicate needs
  which the Rules do not state MUST be declared once in `data/facts.json`
  under `situation.constants`, with its status under `docs/conventions.md`
  and, where pencilled, what would settle it; an entry MUST read the declared
  constant rather than repeat the literal. CI MUST sweep both subjects'
  relative bearings and fail on any bearing in two encounter types or in none,
  on either edge of 13(b)'s sector falling on the wrong side, and on any entry
  whose threshold does not match the declared constant. `✎` pencil, with the
  rest of §4.1.

### 4.2 Part B invariants

`docs/part-b-invariants.md` states what COLREGS requires of a *trace* of
situations, where an entry says which norms one state selects; it is a separate
document because its propositions are about COLREGS, not requirements on this
package, and would be misread under a `REQ-` id and an RFC 2119 MUST. Everything
here is **pencil** (`docs/conventions.md`) with §4.1.

- **REQ-INV-1** — Part B's steering and sailing rules MUST be recorded as prose
  invariants in `docs/part-b-invariants.md`, each with a stable identifier,
  each citing the paragraph path it comes from, and each precise enough that a
  formalisation can be written from it without returning to the rule text.
- **REQ-INV-2** — An invariant identifier MUST be `INV-` followed by the
  entry-id derivation of its paragraph path (`docs/identifiers.md`, "Entry
  ids"), with a descriptive hyphenated suffix where one paragraph yields more
  than one invariant. A suffix MUST name what distinguishes the invariant, and
  MUST NOT be an ordinal. Identifiers MUST be stable and MUST NOT be reused; a
  withdrawn invariant is struck through and kept, as a requirement is. Once a
  formal specification cites an invariant identifier, its **Invariant.**
  statement MUST NOT change in place; a changed statement is a new identifier
  and the old one is struck through and kept.
- **REQ-INV-3** — Every paragraph path in `data/rules.json` within the range
  the document covers MUST appear exactly once in its coverage table, mapped
  either to an invariant identifier or to an explicit exclusion with a reason.
  CI MUST fail on a paragraph in range that appears in neither, on one that
  appears twice, and on an invariant whose citation does not resolve in
  `data/rules.json`. Enforced by `test/data.test.mjs`.
- **REQ-INV-4** — An invariant that is temporal MUST state what state must be
  remembered and over what window. "Temporal" means it relates two or more
  states of a trace; a property of a single state MUST say so.
- **REQ-INV-5** — Where the rule text admits two readings, the document MUST
  record both and MUST NOT choose. The choice is an open question in §11 and is
  the maintainer's; a session MAY argue for a reading, and MUST NOT resolve one
  by writing only its preferred half down. A proposition that is neither the
  rule text, arithmetic over the rule text, nor a decision recorded as such
  MUST NOT appear as an invariant.
- **REQ-INV-6** — An invariant that covers its paragraph while leaving a term
  the Rules do not define MUST name that term in the document's list of
  undetermined terms, so that "covered" is never read as "checkable". A numeric
  stand-in for such a term MUST be a declared constant under
  `situation.constants` (`REQ-CAT-9`), never a literal inside an invariant.
- **REQ-INV-7** — An invariant's **Invariant.** paragraph MUST be at most 120
  words. This is a readability bound on the normative statement itself, not a
  document-length budget (`docs/budgets.json` governs those); it keeps a single
  invariant from growing into a paragraph a formalisation can't be checked
  against sentence-by-sentence. Enforced by `test/data.test.mjs`.

## 5. Languages and localization

COLREGS 72 is multi-lingual at the source: English and French are equally
authentic treaty texts, Spanish and Russian official translations were
deposited with the original, Arabic and Chinese texts exist through IMO's
official languages, and many states gazette their own legally binding
translation. (Recalled, not yet verified against the primary sources — Q-6.)
See ADR 0003.

- **REQ-LANG-1** — Language MUST be a dimension orthogonal to jurisdiction,
  identified by BCP 47 tags. Which body of rules applies and which text of
  them is displayed are independent questions; neither MUST ever be inferred
  from the other, and no property beyond the language of the text — not
  source, audience, nor legal applicability — MUST be inferred from a tag.
- **REQ-LANG-2** — Identifiers — entry ids, fact values, light ids,
  paragraph paths, relation names, modality/role/encounter/category values — MUST be language-neutral and MUST NOT
  be localized. Translations attach to identifiers; they never replace them.
  Identifiers are schema keywords, not display strings: each vocabulary
  distinguishes machine identifier, display label (catalog), and definition,
  and renaming an identifier is a breaking change (REQ-PKG-4). Immutability
  itself is REQ-MODEL-10; this requirement adds only that identifiers are
  never localized.
- **REQ-LANG-3** — Rule text MUST be storable
  as a **corpus** per (jurisdiction × language × source), keyed by paragraph
  path, holding at most one text per path, with corpus-level provenance and
  one declared status tier:
  - `authentic` — identified by the governing instrument itself as an
    equally authentic text (a claim of the instrument, never this repo's
    assessment);
  - `official` — an official translation published or deposited through the
    instrument's depositary organization;
  - `national` — a state's legally binding published text;
  - `community` — informational, no legal standing.
  Tier is a property of the source, not the language. REQ-MODEL-1's verbatim
  rule applies per corpus, against that corpus's own source.
- **REQ-LANG-4** — Adding a language MUST be additive: no schema change, no
  edits to existing corpora or catalogs (the language mirror of REQ-SCOPE-4).
- **REQ-LANG-5** — Corpora MAY be partial. Coverage MUST be declared in
  machine-readable form, and CI MUST fail on a corpus key that does not
  resolve to a known paragraph path, and on a corpus filename that disagrees
  with the file's internal metadata. Silence MUST NOT imply coverage (the
  language mirror of REQ-SCOPE-6).
- **REQ-LANG-6** — Display strings for the closed vocabularies the package
  emits (light, modality, role, encounter, jurisdiction, fact values, and
  image captions **(unimplemented — no catalog yet)**) MUST be addressable
  via stable string keys with per-language catalogs, separate from legal
  corpora; not being an identifier does not exclude a vocabulary. Catalog
  entries are static strings — no interpolation, plural or gender grammar —
  and MUST carry provenance (contributors, reviewers, review date, licence);
  definitions stay untranslated in structural files, not catalogued.
- **REQ-LANG-7** — The package MUST NOT encode a language fallback policy,
  and MUST NOT silently substitute one corpus for another. Text is only
  addressable inside a corpus, so every textual unit a consumer retrieves
  is attributable to its corpus; package documentation MUST state that a
  mixed-corpus rendering is never a single authoritative edition. Choice
  and fallback beyond that are the consumer's (the language mirror of
  REQ-CONS-3).
- **REQ-LANG-8** — A `community`-tier corpus MUST record who produced and
  who reviewed it. Machine translation without named human review MUST NOT
  be accepted.
- **REQ-LANG-9** — Verbatim (REQ-MODEL-1) is defined at the Unicode level: each
  corpus MUST declare the normalization form applied to its text (NFC unless
  declared otherwise) and MUST NOT insert or strip bidi control characters,
  localize numerals, punctuation, units or quotation marks, or otherwise "fix"
  the source text. Rendering direction is a consumer concern and MUST stay out
  of the data.
- **REQ-LANG-10** — The structural skeleton MUST declare, as
  data, the amendment state it consolidates (e.g. "COLREGS 72 as amended
  through …"). Every corpus MUST declare the amendment state its source
  reflects. The two MAY differ — a corpus transcribed from an older
  consolidation is legitimate — but the difference MUST be machine-visible,
  never silent.
- **REQ-LANG-11** — Exactly one language MUST be declared reference-complete;
  CI MUST fail if its catalog omits an emitted value. Other catalogs MAY be
  partial, gated only by the existing key-resolution check.

---

## 6. Provenance and licensing

- **REQ-PROV-1** — Every text and image asset MUST record its source, the date
  retrieved, and its licence or public-domain basis.
- **REQ-PROV-2** — A jurisdiction's *rule text* MUST NOT be published until its
  reproduction terms have been checked against the primary source and recorded.
  Recalled or assumed terms are not sufficient. This does not bar *modelling* a
  jurisdiction: its structure may ship with the text withheld — ADR 0010.
- **REQ-PROV-3** — Where a licence requires attribution (e.g. OGL, CC BY), the
  attribution text MUST ship in the package, not only in the repo.
- **REQ-PROV-4** — Code licence and data licence MUST be stated separately. The
  code licence does not cover third-party scans.
- **REQ-PROV-5** — Images MUST be addressable as data: an image record per file,
  naming what it illustrates by entry id or paragraph path. Unexplained filename
  prefixes are a provenance defect.
- **REQ-PROV-6** — Source identity MUST be structured data —
  publisher, title, edition, publication and effective dates, URL, retrieval
  date — not a prose string. Rights MUST be recorded separately for the source
  text, for the basis on which this package redistributes it, and for the
  licence the package distributes under; one flat `licence` field MUST NOT
  stand in for all three. A translation MAY carry translator rights even where
  the underlying instrument is public domain, and that check is part of
  REQ-PROV-2.
- **REQ-PROV-7** — An external contribution MUST NOT be merged from a
  contributor who has not agreed to the contribution terms in
  `CONTRIBUTING.md`, which state that opening a pull request constitutes
  agreement. Those terms MUST include both (a) a DCO-style certification
  that the contributor has the right to submit the work, and (b) a licence
  grant to the maintainer sufficient to relicense the compilation. (b) is
  what holds GATE-6 open; a bare DCO certifies origin and grants nothing,
  so it does not.

---

## 7. Verification

- **REQ-VERIFY-1** — Fixtures MUST pair fact records with the entries that apply,
  and MUST be consumable by an implementation in any language.
- **REQ-VERIFY-2** — A **drift test** MUST cross-check the forward direction
  (fact record → lights) against a reverse direction (observed lights →
  candidate fact records), so the two cannot silently disagree.
- **REQ-VERIFY-3** — Every applicability entry MUST be covered by at least one
  fixture that exercises it, and at least one that excludes it.
- **REQ-VERIFY-4** — Every `rel:in_lieu_of` and `rel:excludes` relation MUST have a
  fixture demonstrating it.
- **REQ-VERIFY-5** — Predicates MUST be tested at their boundaries. Every numeric
  gate MUST have fixtures immediately either side of the threshold.
- **REQ-VERIFY-6** — CI MUST fail on a fixture that references an entry id, a
  light definition or a paragraph path that does not exist.
- **REQ-VERIFY-7** **(unimplemented — the check is unwritten; it depends on
  REQ-MODEL-11)** — CI MUST fail on an identifier present in the deprecation
  registry (REQ-MODEL-11) that has reappeared in the live data with a
  different denotation, and on a registry entry whose replacement does not
  resolve. Immutability (REQ-MODEL-10) is otherwise a cross-version property
  no single build can check; the registry is what makes the checkable part
  checkable.
- **REQ-VERIFY-8** — A situation record's relative geometry MUST be checkable
  against its kinematic state. `data/facts.json` MUST declare, under
  `situation.geometry.consistency`, the equations relating the two relative
  bearings, the range, the CPA, the TCPA and the bearing rate to the two
  positions, headings and speeds, with the tolerances a comparison uses. CI
  MUST fail on a situation fixture that states quantities on both sides of one
  of those equations and violates it, and every situation the suite constructs
  for a sweep MUST satisfy the declaration. A property asserted over
  constructed situations — REQ-CAT-9's partition, the precedence properties —
  MUST be asserted over consistent situations only; where a property holds on
  consistent situations and fails on an inconsistent one, the suite MUST pin
  that situation as one the check rejects, so the exclusion is visible rather
  than assumed. `✎` pencil, with `Q-48`.

---

## 8. Packaging

- **REQ-PKG-1** — Zero runtime dependencies.
- **REQ-PKG-2** — Data MUST be consumable without a JavaScript runtime: plain
  JSON, no code-carrying formats.
- **REQ-PKG-3** — The published package MUST contain data, images, fixtures and
  provenance, and MUST NOT contain build tooling or source scans.
- **REQ-PKG-4** — Breaking changes to entry ids, fact vocabulary or relation
  semantics MUST be a major version.
- **REQ-PKG-5** — Package keywords MUST include the terms a searcher would
  actually use for each covered jurisdiction (`colregs`, `navrules`,
  `inland-rules`, `33-cfr-83`, `cevni`).

---

## 9. Consumer contracts

- **REQ-CONS-1** — The switching subset MUST be derivable from the data by
  filtering, not by a separate hand-maintained list. A consumer MUST be able to
  select actuable entries mechanically.
- **REQ-CONS-2** — Education-only facts MUST be marked as such in the fact
  vocabulary, so a switching consumer can assert it never reads them.
- **REQ-CONS-3** — Final selection among lawful alternatives belongs to the
  consumer (for switching, the vessel's fixture map). The package MUST NOT
  encode a preference.
- **REQ-CONS-4** — The package MUST NOT assume a SignalK consumer beyond the
  optional decode table of REQ-MODEL-9.

---

## 10. Reversibility gates

A pre-1.0 data package can decline a design and still adopt it later. That
stops being true at a specific, nameable event — a version tag, a second
corpus, a first consumer. A declined design whose cost rises over time is
therefore not "closed"; it is **timed**, and the timing is part of the
specification until 1.0.

- **REQ-GATE-1** — Every design declined on the grounds that it can be
  adopted later MUST be recorded as a gate below, naming the **closing
  event** after which adoption stops being cheap, and the **reopening
  trigger** — the observable fact that forces reconsideration. A decline
  recorded without both is incomplete.
- **REQ-GATE-2** — A gate MUST NOT be closed by the passage of time or by
  a maintainer's judgement alone. It closes when its named event occurs, or
  when its trigger fires and the decision is re-taken in a new ADR.
- **REQ-GATE-3** — Tagging 1.0 MUST be blocked until every gate whose
  closing event is *the 1.0 tag* has been re-taken deliberately: confirmed
  in a new ADR, or adopted. Inheriting one by default is the failure this
  section exists to prevent.
- **REQ-GATE-4** — A gate that is adopted or confirmed MUST be struck
  through here, not deleted, and MUST cite the ADR that settled it
  (the gate mirror of the ID-stability rule in this document's preamble).

### Open gates

Each names the declined design, closing event, and trigger.
- **GATE-1 — `paragraph_id` split from `citation_path`**
  (ADR 0003, declined; REQ-LANG-3, REQ-PKG-4).
  *Closing event*: the 1.0 tag. Before it, splitting the two is a
  mechanical rewrite of cross-references in a package with no stable-API
  promise. After it, every consumer's lookup path breaks.
  *Trigger*: a paragraph path that keeps its spelling while changing what
  text it denotes, *within one jurisdiction across releases* — the mutation
  REQ-MODEL-10 forbids. Two routes, both verified against primary sources
  ([verification](verification/2026-08-30-q6-q8.md)): IMO amendment
  renumbering (A.910(22) displaced `23(c)` to `23(d)`; A.464(XII)
  relettered `24(g)` and `27(d)(iv)` — two of seven amendments), and a
  national body renumbering its own amalgamation. Cross-jurisdiction
  divergence at one moment is NOT a trigger: the 33 CFR 83 rows are the
  jurisdiction dimension working as designed (REQ-MODEL-1), and the
  structural residue (`23(d)(i)`, Rule 28 "[Reserved]") is Q-11's.
  *Ruling, 2026-08-30*: no published path has changed denotation, so the
  gate does not flip on today's data; with the "believed never" premise
  gone, the pre-1.0 re-take **leans adopt**, decided in the
  second-jurisdiction bundle with GATE-2 and Q-10. If the trigger fires the
  outcome is predetermined, since REQ-MODEL-10 forbids both repoint and
  reuse: the split lands as a **major version**; identifiers across the
  boundary are **defined incompatible**, and a consumer MUST NOT assume a
  same-spelled path denotes the same text; a prior → new mapping MAY ship,
  seeded by REQ-MODEL-11's registry. *Re-take required before 1.0*
  (REQ-GATE-3).

- ~~**GATE-2 — instrument → edition → corpus as first-class layers**~~
  (ADR 0003, declined; REQ-LANG-10 adopted the 80%). **Re-taken and
  adopted, ADR 0013**, ahead of its closing event as declined — the first
  non-English corpus of a jurisdiction; trigger as declined, two editions
  of one jurisdiction in force concurrently.

- **GATE-3 — legal-status × translation-status as two enums**
  (ADR 0003, half-adopted: one tier for legal authority in REQ-LANG-3,
  translation provenance as structured metadata in REQ-LANG-8/REQ-PROV-6).
  *Closing event*: the first `community`-tier translation of a `national`
  corpus. Until one exists, the four-way combination the split exists to
  express is hypothetical.
  *Trigger*: a real corpus whose legal tier and translation tier disagree
  in a way a consumer must filter on, and cannot from the metadata as
  structured.

- **GATE-4 — a package-encoded language fallback chain**
  (ADR 0003, declined; replaced by REQ-LANG-7's no-silent-substitution).
  *Closing event*: none — this door opens outward. Loosening a strict rule
  is additive; tightening one later breaks consumers. Recorded so the
  asymmetry is not re-discovered as an argument for adopting it early.
  *Trigger*: none anticipated. Consumer demand for a *documented,
  non-normative* recommended chain, shipped outside the data, would not
  reopen it.

- **GATE-5 — a CI-enforced terminology glossary**
  (ADR 0003, declined for legal corpora; REQ-MODEL-1).
  *Closing event*: none for legal corpora — the decline follows from
  verbatimness and does not get cheaper or dearer with time. For display
  catalogs it is contributor guidance, gated on the contribution docs
  existing at all.
  *Trigger*: none. A glossary contradicting a verbatim source is a defect
  in the glossary.

- **GATE-6 — the compilation's outbound licence**
  (ADR 0004; changed MIT → Apache-2.0 in `2669e2a` on `main`. REQ-PROV-4.)
  *Closing event*: the **first merged external contribution**. Until then
  the copyright holder is one person and the licence can be changed at
  will. After it, relicensing needs every contributor's consent — and
  soliciting translations is the express purpose of the language work, so
  this door closes early and hard.
  *Trigger*: deciding the data side wants CC0 or CC BY 4.0 separately from
  the code (REQ-PROV-4; Q-9). Already-published npm versions stay under
  the licence they shipped with. The gate is **held open deliberately** by
  REQ-PROV-7's licence grant; a CLA-assistant bot is the upgrade path if
  contributors arrive (ADR 0004). "Unlikely" is not a closing event
  (REQ-GATE-1), so it is recorded regardless.

Four gates declined by ADR 0013 (option B). *Closing event*, for all four:
the first national text whose edition cannot be determined.

- **GATE-7 — validity intervals on editions (`in_force_until`)**.
  *Trigger*: an edition superseded with no successor to bound it.
- **GATE-8 — a per-source publication record separate from the edition
  (FRBR manifestation)**.
  *Trigger*: two published sources for one edition that disagree.
- **GATE-9 — a content digest per corpus for verification**.
  *Trigger*: a corpus differing from its cited source with no edition or
  source change.
- **GATE-10 — a skeleton per edition**.
  *Trigger*: the first amendment that deletes or renumbers a path.

Gates whose closing event is "none" are recorded because a future reader will otherwise re-ask whether they were merely deferred. They were not.

### Gate status is data

The gates above are mirrored in **`docs/gates.json`** — id, closing event,
trigger, status (`open` / `re-taken` / `adopted` / `declined-permanently`),
and the ADR that settled it where one exists. That file, not this prose, is
what REQ-GATE-3 is enforced against: `test/data.test.mjs` fails the build if
`package.json`'s major version is 1 or higher while any gate whose closing
event is the 1.0 tag is still `open` or cites no ADR. There is no environment
variable, skip flag, or warning-only path — undoing the block means editing
the registry in a pull request, which is the deliberate re-take REQ-GATE-3
asks for. The test also fails on a gate that appears in one place and not the
other, so the prose and the registry cannot drift apart.

---

## 11. Open questions

Tracked here until resolved; each becomes an ADR.

- **Q-1** — Do Part D sound signals fit the entry model, or do they need an
  event dimension? Blocks REQ-PART-3.
- **Q-2** — Are the USCG scans the educational payload, or a stopgap until
  light geometry is rendered from data? Affects how hard REQ-PROV-5 is pushed.
- **Q-3** — Jurisdiction licence terms. **Verified 2026-09-05** against
  the primary sources for every jurisdiction except CEVNI (ADR 0001
  Amendments). CEVNI stays open: the UN's default terms (personal,
  non-commercial) block it until written permission or a national
  transposition is chosen. **Ruled 2026-09-09 (ADR 0010):** that blocks
  CEVNI's *text*, not `eu/cevni`; a jurisdiction may be modelled in full
  with its text withheld.
- **Q-4** — Two upstream SignalK spec asks are outstanding and independent of
  this package: a making-way indicator, and `design.maxSpeed`.
- **Q-5** — REQ-VERIFY-5's boundary fixtures for the three `modality_by`
  thresholds (`rule:23a_ii`, `rule:26b_ii`, `rule:30c`) need an expected
  modality per entry, which the fixture format could not state.
  **Decided in pencil 2026-09-04** (PR #22): an element of `expect` is a
  bare entry id or `{entry, modality}` (REQ-CAT-7), so
  `applicability-fixtures.json` needs no migration. What is left is the
  work: the three fixtures; settled for good when they land.
- **Q-6** — The treaty-language facts behind §5. **Verified 2026-08-30**
  against the UNTS deposit (Vol. 1050, I-15824, Article IX): en/fr
  authentic and es/ru deposited translations confirmed; ar/zh confirmed as a
  mechanism (IMO's six official languages), Arabic not independently
  re-fetched
  ([verification](verification/2026-08-30-q6-q8.md#claim-3-q-6--verified-arabic-component-partially)).
- **Q-7** — Reproduction terms per language corpus sequence the work, and
  are answerable **per language**: clearing one source unblocks that corpus
  alone. **BOE (`es`) and Finlex (`fi`) verified clean, 2026-09-09 and
  2026-09-12** (ADR 0001 amendments). The UNTS deposit (`en`/`fr`) is
  confirmed **blocked**: the reachable terms are the same
  personal/non-commercial, no-derivative-works terms that block CEVNI, so
  `en`/`fr` need written UN permission or a national republication.
- **Q-8** — Does the paragraph path survive the first national
  amalgamation? The threat is the second jurisdiction, not a future
  amendment: while `intl` is the only populated one the question cannot
  fail. **Verified 2026-08-30** against primary sources
  ([verification](verification/2026-08-30-q6-q8.md)): of 90 Part C paths in
  33 CFR 83, 15 are same-spelling-different-text, one is a structural
  mismatch (`23(d)(i)`), Rule 28 is "[Reserved]", two are clean absences;
  and amendments have renumbered Part C twice (A.910(22), A.464(XII)).
  Both findings feed GATE-1's re-take, not decided here.
- **Q-12** — REQ-MODEL-10's **baseline off-by-one**: as first written it
  bound every identifier in `colregs@0.1.1`, including the ones the audit
  had cleared for renaming. **Resolved 2026-08-30**: REQ-MODEL-10 names the
  baseline, stated exactly once and immovable, and `test/data.test.mjs`
  pins it; the audit is REQ-MODEL-10's recorded review, and the changed
  identifiers are in `docs/identifiers.md`.
- **Q-10** — Split `rel:conditional_includes`, or add a discriminant?
  REQ-MODEL-12 records the overload. A split lets a schema validate the
  shape at the cost of two more relation verbs; a discriminant key is
  cheaper. Not urgent: the trigger is the second jurisdiction, as for
  GATE-2 and Q-8, so the three are decided together.
- **Q-9** — Is Apache-2.0 the right outbound licence for a *data*
  compilation, or should the data carry CC0 / CC BY 4.0 separately
  (REQ-PROV-4)? ADR 0004 settles the code licence and leaves this open.
  GATE-6's trigger; the CLA/DCO half is answered by REQ-PROV-7.
- **Q-11** — What is the delta suppression mechanism? Inheritance by
  absence is verified unsafe: 33 CFR 83 leaves Rule 28 "[Reserved]" and has
  no `23(d)(ii)`/`(iii)`, so a silent `us/inland` delta would assert
  international obligations on inland waters. **Resolved 2026-09-16, ADR
  0018**: tombstones in `suppressions[]`, the delta an RFC 7396 merge patch
  proven by test (REQ-SCOPE-3). The hold on non-`intl` jurisdictions is
  lifted; GATE-1, Q-10 and Q-8 stay open on their triggers.

### From ADR 0005 (pencilled items)

Every item ADR 0005 records is pencil (`docs/conventions.md`), and each
pencilled item in the proposal behind it names what would settle it. They are
listed here, one line each, because the ADR is what makes them live. Most are
`colregs-engine`'s to settle rather than this package's; they are marked
*(engine)* where so, and this package's own are the ones that gate data.

- **Q-13** — Is `category` the right word for the field (against kind, type,
  flavour, charge)? Settled by Mark, before REQ-CAT-1's field name ships.
- **Q-14** — Which category does each paragraph take? The proposal's table is
  a first cut; settled paragraph by paragraph as Rules 1–19 are transcribed.
  PR #24 settles the first sixteen and departs from the table once: 13(a) is
  `category:precedence`, not `category:classification` (`Q-37`).
- **Q-15** — Which verification tool discharges each category (Alloy, Z3, TLA+,
  STL, Rocq)? Settled by building one proof per category, not by argument.
  *(engine)*
- **Q-16** — Are the invariant levels right as hard / safe / rule-level, and
  are procedural and physical levels needed? Settled by the first level-3
  invariant that does not fit. *(engine)*
- **Q-17** — What separation distance *d* defines the "safe" level? Fixed to
  one value to start; settled by the sensitivity matrix of Q-22. *(engine)*
  One anchor: the MAIB *Polesie*/*Verity* report in `docs/maritime-sources.md`
  puts close-quarters at a ~12-minute TCPA and adapts a suggested-TCPA table.
- **Q-18** — What is the dynamics model, and what is the list of dynamics
  classes (tanker, ferry, yacht, …)? Settled by the first two-vessel
  computation; the class list is a data question once it stabilises.
  A first-cut class list now exists in data as `kin:dynamics`
  (PR #22) so the situation record has something to carry; it is
  pencil and the question is unchanged. `dynamics:unknown` stays in the set
  whatever the list becomes.
- **Q-19** — What are the game's parameters — horizon *T*, terminal condition,
  action cadence Δt, the admissible set *A*, the information assumption?
  Settled by the sensitivity matrix, which is owed before the ontology moves
  out of pencil. *(engine)*
- **Q-20** — Is the adversary rule-compliant, arbitrary within physics, or
  both, and does the horizon hide the region behind it? Settled by computing
  both and comparing. *(engine)*
- **Q-21** — Can the hybrid, partial-information game be encoded soundly in
  UPPAAL TIGA/STRATEGO or KeYmaera X at all? Settled by a benchmark with
  certified bounds, not by reading the tools' documentation. *(engine)*
- **Q-22** — Is the region computed offline per dynamics-class pair, or does
  it have to be computed at runtime? Settled by the first two-vessel
  computation's cost. *(engine)*
- **Q-23** — Is Rule 2(b) a duty where departure is necessary, and does the
  departing vessel bear the burden? Partly settled — yes and yes — by
  `docs/maritime-sources.md`'s *Ever Smart* and *Crowley* entries; the
  taxonomy of qualifying circumstances, and *The Bywell Castle* and *Boy
  Andrew v St Rognvald*, are still unread. *colregs-engine* issue #83.
- **Q-24** — Are the four worked illustrations (R0, R1, R2,
  `inconclusive-in-model`) actually in the regions they are said to be in?
  They fix meanings, not numbers; settled by computing them. *(engine)*
- **Q-25** — Is the tractability tiering (findable under duress / with time /
  likely missed) a real axis, and do its proxies measure it? Settled by
  bridge-simulator or human-reliability evidence, not by the model. *(engine)*
- **Q-26** — How large is the relative-frame state space? The 10⁴–10⁶ figure
  is a back-of-envelope guess; settled by a worksheet. *(engine)*
- **Q-27** — What are the field names for `category`, `subjects`, `when`,
  `effect` and the widened `modality`? Settled when the first non-`category:display`
  entry lands, and cheap to change until then. The data half is answered
  below (PR #24); `situation`, the classes and the subjects are REQ-CAT-6's.
- **Q-28** — What namespace distinguishes the two subjects of a two-subject
  entry? **Decided in pencil 2026-09-04** (PR #22):
  `<subject>:<class>:<key>`, bare key meaning `self:`, in
  `docs/identifiers.md` §"Two subjects" and REQ-CAT-6; additive under
  REQ-MODEL-10 at the cost of reserving `self`/`other`/`pair`. Settled for
  good by Rule 18 being written against it (PR #24).
- **Q-29** — What are the file names and schemas for the invariants file and
  the region grid, and how does a level-3 invariant carry `jurisdiction`?
  Settled when the first invariant is written down.
- **Q-30** — What does the `category:care`/`category:meta` registry look like as a file — its
  name, its schema, and its relationship to `known_omissions`? Settled by
  REQ-CAT-2's implementation. **Decided in pencil, PR #23**: the registry
  is `represented_paragraphs`, a sibling array to `known_omissions` in
  `data/applicability.json` — `id`, `jurisdiction`, `cite`, `category` and
  a one-sentence `note`; no `when`, no `lights`. `✎` file name and schema
  stay open to a better idea.

### From the first two-subject data (PR #24)

Rules 4, 11, 19(a) and 18(a)–(f) are the first entries written against ADR
0005's model. All pencil. **Decided in pencil 2026-09-04 (PR #24)**, the data
half of `Q-27`: the field names are `category`, `subjects` and `effect`
(`docs/identifiers.md` §"Effects", `REQ-CAT-8`). One addition to `Q-28`'s
namespace: a fifth class `env`, `pair`-only, because a narrow channel or a
traffic separation scheme is a property of the water.

- **Q-31** — `modality` is a single closed value, and 18(c), 18(d)(i) and 9(a)
  each carry a practicability caveat *and* the duty itself. Settled by
  deciding whether practicability is a second field beside `modality`, as
  `modality_by` is for the light rules. **Narrowed, not settled, 2026-09-04
  (PR #25):** 18(d)(i) is `modality:shall-if-practicable` with
  `effect.self: role:shall-not-impede`, which works only because that duty
  is a role; 9(a)'s caveat has no second field, and the general question is
  untouched.
- **Q-32** — **decided in pencil 2026-09-04 (PR #25): a derived fact.**
  `fact:activity` says what lights a vessel shows, not her rank under Rule
  18. `fact:rule18_class` is the rank, declared under `derived` in
  `data/facts.json` with a decode table as its definition, seven values
  each cited to Rule 3; `activity:mine`, `activity:diving`,
  `activity:trawling` and the 27(c) tow (`fact:tow_restricts_deviation`)
  decode instead of being hand-listed. Every Rule 18, 9 and 10 entry reads
  the class, and a test forbids a `category:precedence` entry reading
  `fact:activity`. Not settled: the seaplane of 3(e) (18(e) stays in
  `known_omissions`); a vessel under oars decodes to nothing, deliberately.
- **Q-33** — **decided in pencil 2026-09-04 (PR #25): the predicate language
  grows `not` and `any_of`.** `{"not": C}` is a constraint on one fact,
  never a key of a `when`; `any_of` is disjunction at either level. **`not`
  over an absent fact is unsatisfied**, like every constraint, so a duty is
  never laid on a vessel because a consumer left a field out. 18(d)(i) and
  the 18(a) family are written as the negations their paragraphs state;
  9(b) and 10(j) each collapse to one entry. A generated complement was
  declined: no reader could check it against the rule text.
- **Q-34** — A `modality:shall-not-impede` entry names a duty toward
  `other`, but 9(b), 9(d), 10(i), 10(j) and 18(d)(i) identify the protected
  vessel by a property this package did not carry, so the entries were
  wider than their paragraphs. **Decided in pencil 2026-09-05, for the
  9/10 half: a per-vessel, consumer-supplied fact** —
  `fact:confined_to_channel` and `fact:following_traffic_lane`, read as
  `other:fact:*` by `rule:9b`, `rule:10i` and `rule:10j`; 9(d) inherits it
  when written. **18(d)(i) is left open**: "exhibiting the signals in Rule
  28" is a display-compliance fact and this package models night lights
  only.
- **Q-35** — 8(f)(iii)'s antecedent is "a vessel, the passage of which is not to
  be impeded" — the *output* of another norm, not a fact. A precedence
  predicate reads only facts, so entry `rule:8f_iii` reads the risk-of-collision half
  alone and applies to every pair with risk of collision. Settled by deciding
  whether a norm may read another norm's effect, which is the same question a
  `category:conduct` monitor will ask about role and phase.
- **Q-36** — Rule 18(a)(iv) and 18(d)(i) are both in force between a sailing
  vessel and a vessel constrained by her draught: the CBD vessel gives way, and
  the sailing vessel must not impede her. Neither overrides the other and the
  model records both, so one subject holds `role:stand-on` and `role:shall-not-impede`
  at once. The test suite pins it as a finding rather than asserting it away.
  Settled by reading 8(f)(ii) against the cases, not by picking a role.
- **Q-37** — 13(a) is `category:classification` in ADR 0005 §1 and in the proposal's
  first-cut table, but it is the one paragraph of Rule 13 that assigns a role
  and a `category:classification` entry has nowhere to put one. Entry `rule:13a` is
  `category:precedence` here, with 13(b)'s sector test left for the `category:classification`
  entry that would set the `hist:was_overtaking` overtaking-history fact. Settled with the rest
  of `Q-14`, paragraph by paragraph.
  **Closed in pencil 2026-09-04 (PR #26).** 13(a) stays
  `category:precedence`, reading the 13(b) sector and the 13(d) history as
  an `any_of`; 13(b) and 13(d) are `category:classification` entries, which
  confirms ADR 0005 §1's one category per paragraph. **Reversed in part,
  2026-09-16:** ADR 0015 makes 13(b) one symmetric entry, `rule:13b`,
  reading the same sector object on either subject.
- **Q-38** — 9(d), 18(d)(ii), 18(e), 18(f)(ii), 1(a)–(e) and 20(b)–(c) are
  recorded in `known_omissions` rather than modelled: 9(d) needs the channel's
  axis, 18(e) needs a fact for being a seaplane, 20(b)–(c) need time of day,
  and 1(a)–(e) are addressed to an authority rather than to a vessel. Settled
  one at a time as the facts they need land; none blocks the rest of Part B.
- **Q-39** — Rule 4's `category:scope` entry has an empty `when`, because "any condition
  of visibility" is the absence of a condition. That makes it unfalsifiable —
  `REQ-VERIFY-3`'s "excluded by at least one fixture" half cannot be satisfied
  and the test exempts it explicitly. Settled by deciding whether an ungated
  norm should be a registry record like `represented_paragraphs` rather than an
  entry with a vacuous predicate.

### From the classification norms (PR #26)

Rules 7(d), 12, 13(b)–(d), 14 and 15 are the first `category:classification` entries and
the second family of `category:precedence` ones. All pencil. What the model expressed is
written up in `docs/identifiers.md` §"Effects"; what it could not is here.

- **Q-40** — **Rule 12 is `category:precedence`, not `category:classification`.**
  It produces a role, and a classification effect has nowhere to put one
  (`Q-37`'s argument again); 12(b) is a `category:definition`, the cite on
  `kin:wind_side`. The category half stays with `Q-14`. The mechanism for
  Rule 18 over Rules 12–15 is settled by REQ-MODEL-13: a relation, not a
  gate, because Rules 12 and 15 do apply and Rule 18 only displaces the role.
  **Decided in pencil 2026-09-05 (PR #35): Rule 12 reads 3(c), and Rules
  13 and 18 override it.** The three Rule 12 entries gate on
  `fact:propulsion: propulsion:sail`, so a fishing vessel under sail is
  inside Rule 12 as the paragraph says; 18(b)(i)–(iii), 18(c)(i)–(ii) and
  13(a) carry `rel:overrides` against them.
  **Decided in pencil 2026-09-05 (PR #46): Rule 15 reads 3(b), and Rule 18
  overrides it too.** `rule:15a:keep_out_of_the_way` no longer negates the
  Rule 18 ranks in its own predicate — that gate gave *no* role on pairs
  Rule 18 does not order, which two fixtures now pin. A derived check
  asserts every Rule 18 entry that assigns a helm role carries the
  override, and the steady-bearing sweep fails when any is removed. What
  both leave: on a pair Rule 18 does not order, Rule 12 or 15 lays a helm
  duty on a vessel that may be unable to discharge it — Rule 2's region
  (ADR 0005 §5), recorded, not gated.
- **Q-41** — **13(c) and 14(c) invert the absent-fact rule.** "When a vessel is
  in any doubt as to whether she is overtaking, she shall assume that this is
  the case" is a duty that fires on the *absence* of knowledge, and the
  predicate language's one firm commitment is that an absent fact satisfies
  nothing (`Q-33`). Modelling either paragraph means a `doubt` boolean, which
  asks a consumer to report a mental state, or reading absence as assertion,
  which reverses the rule the language is built on. Both are in
  `known_omissions`. 12(a)(iii) is the same shape and *is* modelled, only
  because 12(b) makes the uncertainty a declared value of a fact that is
  present — `wind_side:unknown`. Settled by deciding whether "in doubt" is a
  fact of the situation at all; if it is, it is one fact and it closes three
  paragraphs.
- **Q-42** — **7(d)(ii) is recorded, not modelled.** "Very large vessel"
  and "close range" have no quantity a paragraph names, so both would be
  invented numbers; a tow is expressible, but "may sometimes exist" is
  neither a deeming rule nor a permission and the vocabulary has no value
  for an instruction to the mariner's judgement. Settled by deciding
  whether it gains one — `Q-31`'s neighbour, not its duplicate.
- **Q-43** — **The partition needs history to be present, and says nothing
  when it is absent.** `rule:14b` and `rule:15a:crossing` gate on
  `hist:was_overtaking` being `false` on both subjects, so a situation that
  omits the fact is classified as *no encounter at all* — conservative and
  silent, which is the wrong way to be conservative. Two sailing vessels get
  no encounter type either, a property of the Rules. Settled by deciding
  whether an engine may distinguish "no encounter" from "cannot say" — the
  status alphabet of ADR 0005 §5, `colregs-engine`'s.
- **Q-44** — **`kin:wind_side` is not kinematics.** It cannot go in the fact
  record (`REQ-CAT-4`) or in `pair` (not symmetric), which leaves `kin`,
  whose declared meaning it does not fit. Filed rather than fixed by
  widening the class note. Settled by the second per-vessel Part B fact that
  is not kinematics: one is an awkwardness, two is a missing class.
- **Q-45** — **One entry, two paragraphs.** The head-on entry cited 14(a),
  which states the situation, and read 14(b), which deems it. **Decided in
  pencil 2026-09-05 (PR #36): the entry is `rule:14b`**, since the deeming
  test is the only effect it has (as `rule:13b` cites 13(b)); 14(a)'s duty
  is `category:conduct` and joins `known_omissions`. Whether a paragraph
  with no effect of its own gets an entry is `Q-39`'s and is untouched.
- **Q-46** — **"Coming up with" is a comparison of two facts.**
  `self:kin:sog_kn` against `other:kin:sog_kn`, and the predicate language
  compares a fact to a constant only. `pair:geo:tcpa_s > 0` stands in: it
  excludes the vessel drawing away astern, and admits a pair closing because
  the vessel ahead has stopped. Settled by deciding whether the language
  gains fact-to-fact comparison — a bigger change than `not` and `any_of`,
  not one to make for a single paragraph.
- **Q-47** — **13(d)'s overtaking history never clears.** "Finally past and
  clear" is a seamanship judgement, so `hist:was_overtaking` is set and
  cleared by a consumer and `rule:13d` classifies an overtaking for as long
  as it stands. Settled by whatever settles the `category:conduct` monitors.
  **Ruled 2026-09-08:** while one vessel's history stands, 13(a)'s sector
  test is suppressed on the other, newly-gaining vessel — once overtaking,
  always overtaking. `rule:13a`'s sector branch reads
  `other:hist:was_overtaking: false`; the closing fixture in
  `fixtures/situation-fixtures.json` is the case.
- **Q-48** — **Nothing checked that a situation is geometrically possible.**
  Six facts related by two equations, enforced nowhere, so a both-starboard
  crossing made `rule:15a:keep_out_of_the_way` apply to both vessels.
  **Decided in pencil 2026-09-05: the record gains a consistency check,
  declared in data and enforced in the suite.** `data/facts.json` declares
  the equations under `situation.geometry.consistency` with tolerances, and
  `REQ-VERIFY-8` requires the suite to apply them; a sparse record is "not
  inconsistent", not "possible". The "never both give-way" property is
  asserted over a steady-bearing sweep, where it is a theorem
  (`u·sin(self bearing) = −v·sin(aspect)`), and the both-starboard case is
  pinned as a record the check rejects. Pinned too, not settled: at
  7(d)(i)'s pencilled 1°/min a slow starboard-to-starboard passing has both
  vessels give-way — 14(c)'s doubt case, with `Q-41`. Relative quantities
  as derived facts stays open in the block's `settled_by`.

- **Q-49** — **Must `rule:13d`'s effect cross the Section II/III boundary for Rule 19(d)(i) to be expressible?**
  - *broad* — drop `rule:13d`'s `pair:geo:in_sight` gate so `encounter: overtaking` is visible in Section III; breaks the scope invariant.
  - *narrow* — `rule:13d` stays gated; a 19(d)(i) entry reads `self:hist:was_overtaking`/`other:hist:was_overtaking` directly, as `rule:14b` and `rule:15a:crossing` already do.
  - Default: narrow (nothing changes).
  - Recommendation: narrow — the test named below shows the fact resolves out of sight
    (`Q-49: hist:was_overtaking resolves out of sight; rule:13d does not fire`, `test/data.test.mjs`).
- **Q-58** — **Do the Rule 18/12 role entries need `other:hist:was_overtaking: false`, like `rule:13a` and `rule:15a:keep_out_of_the_way` (Q-47)?** The nine `18a*`/`18b*`/`18c*` and three `12a*` entries carry no such gate, and `rule:13a` overrides them only when *self* holds the history; when the *other* holds it, self is named give-way under Rule 18 or 12 while 13(a) puts the duty on the other alone. Default **ungated** (nothing changes), recorded as a `gap` on the twelve. Recommend **gated**, in Q-47's shape: 13(a)'s 'notwithstanding' and Rule 18's own exception for Rule 13 both displace these entries, and Q-47 already ruled the history decides who holds the role. colregs-engine#75 (closed) read the table as self-centric and recommended a consumer swap subjects for the other's duty; that answers the other's role, not self's wrong one. `colregs#117`.

### From the Part B invariants (P4.1)

Eight places where the rule text admits two readings, recorded here under
`REQ-INV-5`. Each is the maintainer's, and each names the data's default so
nothing is blocked while open.

- **Q-50** — **Does risk of collision gate Rules 13 and 18?** 14(a) and 15(a)
  say "so as to involve risk of collision"; Rule 13 and Rule 18 do not.
  *Wide:* they attach whenever in sight and the geometry holds — Rule 11 is the
  only gate Section II states. *Narrow:* Section II's duties attach only with
  risk of collision; 14 and 15 are emphasis. Default **wide**: `rule:13a`, `rule:13b`,
  `rule:13d` and every Rule 18 entry read `in_sight` only. **Ruled
  2026-09-17:** wide — the window is the encounter itself. A pair the engine is
  evaluating is an encounter, at whatever range suits the vessels; inside it 13
  and 18 attach on sight and geometry alone, and how close is clear stays a
  monitor parameter. *The Nowy Sacz* [1977] 2 Lloyd's Rep 91 (CA) holds risk
  of collision unnecessary for the overtaking rule; *Meghna Princess* [2017]
  SGHC 220 [56] restates it; nothing found on Rule 18 either way (colregs#72).
- **Q-51** — **What arms 13(d)'s overtaking history?** *A:* 13(b)'s deeming, at the first
  state the geometry holds. *B:* 13(a)'s duty actually attaching. They differ
  only on `Q-50`'s surface. **Ruled 2026-09-17:** B, closed by `Q-50` wide —
  with no gate between geometry and duty the two readings coincide (colregs#72).
- **Q-52** — **What does 13(d)'s overtaking history forbid?** *Narrow:* reclassification to
  *crossing* only, as the paragraph says, leaving head-on to Rule 14 on the
  geometry of the moment. *Broad:* the encounter stays an overtaking and no
  other Section II classification attaches. Both preserve the duty; they differ
  on encounter type, which Rule 17's phases and 14(a) hang off.
  Pencilled **broad** ✎ (Solace, 2026-09-14), which is also the data's
  default: `rule:13d` yields `encounter: overtaking` from history alone, `rule:14b` and
  `rule:15a:crossing` gate on `was_overtaking: false`. 13(a)'s "notwithstanding"
  already displaces Rule 14; eCOLREGs states the broad reading as conventional.
  Settled by: a case or commentary on an overtaking becoming a head-on; none
  found.
- **Q-53** — **Does 17(a)(ii) suspend 17(a)(i)'s duty, or add an exception?**
  *Suspension:* "may, however" lifts the duty once non-compliance is apparent;
  a monitor then flags nothing. *Exception:* the duty stands and a departure is
  lawful only as action to avoid collision by her manoeuvre alone; a monitor
  flags any other alteration. No default (Rule 17 has no entry). **Ruled
  2026-09-16:** exception — the 17(a)(i) duty stands and a departure is lawful
  only as action to avoid collision; a monitor flags any other alteration.
  Purpose, not source (colregs#72); read with `Q-54`.
- **Q-54** — **Are Rule 17's phases monotone?** *Monotone:* one three-valued
  marker per stand-on vessel per encounter; late compliance does not take the
  permission away. *Re-evaluating:* each phase is a predicate on the current
  state and the vessel may fall back — must she then hold her *new* course
  and speed? TLC distinguishes them on a four-state trace. **Ruled
  2026-09-16:** monotone — permission or duty, once arisen, survives belated
  compliance; a fall-back needs a baseline the Rules lack (`Q-57`). No holding on point (colregs#72); *Ever Smart* [2021] UKSC 6 para 61 has the obligation cease at 17(a)(ii)/17(b) with no revival — consistent with monotone, not a ruling on it.
- **Q-55** — **What does a visibility transition do to Section II state?**
  Rule 11 and 19(a) switch on the current state; no paragraph says what
  becomes of a 13(d) overtaking history or a Rule 17 phase. *Persisting:* they belong to the
  encounter and survive the fog. *Resetting:* Section II starts afresh on the
  geometry when sight is regained — the reclassification 13(d) forbids, via
  visibility. No default (nothing is temporal). **Deferred indefinitely** (Solace,
  2026-09-16): no authority either way (colregs#72); scenario contrived. Lean, not
  ruling: **resetting** — a new encounter after the fog; persisting withdrawn.
- **Q-56** — **The third visibility state: a hole, or closed by the model?**
  Not in sight *and* not in or near restricted visibility (clear weather, beyond
  visual range, radar contact) is outside Rule 11 and 19(a): Section I only.
  *Hole:* represent it; a fact for "in or near restricted visibility" is owed.
  *Closed:* treat not-in-sight as Section III. Default **closed**: `rule:19a` drops
  the second conjunct, recorded as a `gap`. Recommend **hole**: the default is
  safe for a switching consumer and unsafe for a traceability claim.
- **Q-57** — **The baseline for "keep her course and speed"?** 17(a)(i) fixes
  no instant. *Attachment:* course and speed when the role attached; any later
  change is a departure — checkable, occasionally absurd. *Steady state:* the
  vessel's settled condition, so a turn in progress may complete — seamanlike,
  and needs a definition of "settled" the Rules lack. No default. Recommend
  **attachment**, with the departure tolerance an explicit monitor parameter.

Two decisions in pencil, cheap until a TLA+ module cites an id: the invariants
live in their own document (`REQ-INV-1`–`REQ-INV-7`, §4.2) and the id scheme is
`REQ-INV-2`'s. One ruled (2026-09-08): **`docs/part-b-invariants.md` stays
hand-written Markdown; no derived JSON registry** unless P4.2 needs to cite
`INV-` ids mechanically.
