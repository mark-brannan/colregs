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
| **modality** | `shall` / `may` / `shall-if-practicable`. |
| **jurisdiction** | A body of rules: `intl`, `us/inland`, `ca/inland`, … |
| **delta** | A jurisdiction's departures from the international text. |
| **identifier** | Any name the data is addressed by: entry id, paragraph path, light id, fact key, fact value, relation name. |

---

## 3. Scope and jurisdictions

- **REQ-SCOPE-1** — The package MUST model the international regulations
  (COLREGS 72) as its base body of rules.
- **REQ-SCOPE-2** — Jurisdiction MUST be a first-class dimension on every
  applicability entry and every rule-text record, expressed as
  `<country-or-body>/<waters>` with `intl` as the reserved base value.
  Examples: `intl`, `us/inland`, `us/great-lakes`, `us/western-rivers`,
  `ca/inland`, `de/binnen`, `eu/cevni`.
- **REQ-SCOPE-3** — A jurisdiction MUST be expressible as a *delta*: entries
  absent from a jurisdiction's data inherit from `intl`. A jurisdiction MUST
  NOT require restating the whole body of rules. Inheritance is "unless
  suppressed", not unconditional — see Q-11: verified Inland structure
  (Rule 28 "[Reserved]") means silence-means-inherit would apply
  international law where the national body deliberately has none, so no
  non-`intl` jurisdiction lands before an explicit suppression mechanism
  exists.
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
  part or jurisdiction is added.
- **REQ-PART-2** — Day shapes MUST use the same entry model as lights, differing
  only in the fixture vocabulary they emit.
- **REQ-PART-3** — Sound and light signals (Part D, Rules 32–37) SHOULD be
  representable by the same entry model. Where they are not — signals are
  event-triggered rather than state-derived — the divergence MUST be recorded
  as an ADR before any Part D data is written.
- **REQ-PART-4** — ~~Steering and sailing rules (Part B) are OUT of v1 scope and
  MAY never be modelled; they govern conduct between two vessels, not the
  appearance of one, and the fact record is single-vessel by construction.~~
  **Superseded by ADR 0005** (2026-09-04), and kept here rather than deleted
  per the preamble's ID-stability rule. Part B remains out of v1 scope —
  REQ-PART-1 still orders Part C first, and no Part B data lands with the
  ADR — but "MAY never be modelled" does not survive: the obstacle it named,
  a single-vessel fact record, is met by the situation record of REQ-CAT-4
  without changing that record. Replaced by REQ-CAT-1..5 (§4.1).

---

## 4. Data model

Four layers, each independently addressable.

- **REQ-MODEL-1** — **Rule text**, verbatim, keyed by paragraph path. Text MUST
  NOT be paraphrased, summarised or reflowed. Where a jurisdiction's text
  differs, both MUST be stored, keyed by jurisdiction.
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
  plus `fact:making_way` as a boolean refining `fact:position=position:underway`,
  and numeric and boolean facts (`fact:length_m`, `fact:tow_length_m`,
  `fact:max_speed_kn`, `fact:composite_unit`, and the education-only facts).
  Fact keys, and the values of the enumerated facts, carry a type prefix;
  `docs/identifiers.md` states the scheme and why citation-derived
  identifiers do not.
- **REQ-MODEL-4** — **Applicability entries**: `when` (predicate over facts) →
  lights or refs → modality → citation → jurisdiction. Every entry MUST have a
  stable id derived from its paragraph path (`25b`, `25d1`).
- **REQ-MODEL-5** — Gates MUST be expressed as predicates over facts
  (`fact:length_m < 7`), never as pre-enumerated tuples or configuration counts. Any
  count of "configurations" is an output of evaluation, never an input to the
  data.
- **REQ-MODEL-6** — Entries MUST compose. Multiple entries applying to one fact
  record is the normal case, not an error (Rule 28 is "in addition to" Rule 23).
- **REQ-MODEL-7** — Five relations MUST be supported:
  - `rel:includes` — import another entry's **lights only**, never its predicate;
  - `rel:in_lieu_of` — legal alternatives for the same fact record;
  - `rel:excludes` — mutual exclusion, including across rules;
  - `rel:exempts` — one entry lifting another's obligation;
  - `rel:conditional_includes` — import or alternatives, gated on a predicate.
  The five are not interchangeable; README.md holds the working semantics.
- **REQ-MODEL-12** — `rel:conditional_includes` currently carries three
  distinct shapes under one relation name: a bare `one_of` alternative set
  (`25d2`), a gated alternative set (`when` + `one_of`, `27f`), and a gated
  import with its own citation (`when` + `rel:includes` + `cite`, `29a`). Which
  behaviour applies is inferred from which keys are present. This is a
  **soft** requirement — the data is correct today and the tests cover it,
  so nothing is broken. It is recorded because a third jurisdiction adding
  a fourth shape is how the inference stops being obvious, and because a
  relation whose semantics depend on key presence cannot be validated by
  schema. Before a non-`intl` jurisdiction lands, either split the relation
  or add an explicit discriminant. Recorded as accepted risk until then
  (Q-10).
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
    `25b`) and the dangerous quiet one: an identifier keeping its spelling
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

  **Immutability baseline: `0.1.1`.** The prohibitions above bind every
  identifier present in the first version released *after* `colregs@0.1.1`,
  and every identifier introduced from then on. Identifiers as they stood
  in `0.1.1` and earlier are outside the baseline. The reason, recorded so
  it is not mistaken for convenience later: `0.1.1` was published
  2026-08-29, the day the package was seeded, before the identifier review
  this requirement itself calls for had been done and before any consumer
  existed. Read without a baseline, the requirement froze the vocabulary at
  the moment of its first accidental publication and forbade the one review
  it was written to make possible — including the vocabulary type-prefixing
  that resolved a live namespace collision (`docs/identifiers.md`). That is
  a defect in the requirement, not a licence to skip the review.

  The baseline is **set exactly once**. It MUST NOT be moved, raised,
  re-stated in a later version, or joined by a second baseline clause. This
  clause is the whole of the exception; there is no mechanism for granting
  another. Without that, "move the baseline" is a silent escape hatch from
  REQ-MODEL-10 and the exception becomes the pattern — a specification that
  can suspend its own prohibition by editing one number is advisory, not
  normative. One recorded exception is a correction; a second is a policy.

  `test/data.test.mjs` pins the baseline literal and asserts it is stated
  exactly once. A build has no access to git history, so it cannot see the
  number being *edited* in place; a test that reconstructed history to
  check would cost more than it is worth and would still pass on a rewritten
  history. What it can refuse is a **second** baseline clause, which is the
  form the escape hatch actually takes — nobody deletes the recorded reason
  for the first exception in order to grant themselves a second. Editing
  the pinned literal is possible, but it is no longer silent: it fails the
  suite and must be done deliberately, in a reviewable diff.

  **Recorded review — identifier audit, 2026-08-30.** REQ-MODEL-10 binds a
  vocabulary that had never been reviewed as a vocabulary. The audit that
  the baseline authorises is that review; `docs/identifiers.md` states what
  it changed. What it examined and deliberately did **not** change is
  recorded here so it is not re-opened as an oversight:
  - **The entry-id suffix taxonomy** — `23a1`, `24a-m2`, `24a-rest`,
    `26b-mw`, `30d-red`. The suffixes are not drawn from one scheme
    (ordinal, masthead count, fact abbreviation, colour) because the
    paragraphs they disambiguate do not divide on one axis. A uniform
    scheme would have to be ordinal, which would make every id opaque to
    the reader who has the rule text in front of them, for no gain to a
    machine that only ever compares them for equality. Kept as they are.
  - **`24a-m2` / `24a-m3`** — the two-or-three masthead split. The
    cardinality is stated in 24(a)(i) itself ("two masthead lights … three
    such lights" by tow length), so the suffix names something the law
    names, not a modelling convenience of this package.
  - **`nuc`, `cbd`, `ram`, `ram_underwater`** — kept unspelled as terms of
    art; see `docs/identifiers.md` for the reasoning and the trap in `ram`.
- **REQ-MODEL-11** — Deprecated identifiers MUST be recorded as data — a
  registry naming each retired identifier, what it denoted, the version that
  deprecated it, and its replacement where one exists. Prose in a changelog
  MUST NOT stand in for it: a consumer pinned to an old version needs to
  resolve a stale identifier mechanically. The registry is
  `data/deprecated-identifiers.json`, schema-validated
  (`schema/deprecated-identifiers.schema.json`, ADR 0006); it ships empty
  until the first identifier is retired.

### 4.1 Rule categories and the situation record

ADR 0005. Everything in this subsection is **pencil** (`docs/conventions.md`):
any session may change it for a better idea, logging the change. It is
recorded as a requirement because it is what the package has decided to build
towards, not because the shape is settled.

- **REQ-CAT-1** **(unimplemented — no rule record carries a category)** —
  Every rule paragraph record MUST carry exactly one `category` from the
  closed set `scope`, `definition`, `standard`, `display`,
  `classification`, `precedence`, `conduct`, `care`, `meta`. The field
  defaults to `display`, so existing entries are correct unedited. CI MUST
  fail on a value outside the set. Where a paragraph plays a second role,
  that role MUST be expressed as a relation (REQ-CAT-3), never as a second
  category.
- **REQ-CAT-2** **(unimplemented — no registry file exists)** — `care` and
  `meta` paragraphs (Rules 2(a) and 2(b)) MUST NOT be applicability entries.
  They MUST be recorded in a registry sibling to `known_omissions`, stating
  that the package represents them and evaluates neither. CI MUST fail on a
  `care` or `meta` paragraph that appears as an entry.
- **REQ-CAT-3** **(unimplemented — the vocabularies are not widened yet)** —
  The modality vocabulary MUST admit `shall-not` and `shall-not-impede`
  alongside `shall`, `may`, `shall-if-practicable`, `conditional` and
  `exempt`, and the relation vocabulary MUST admit `rel:overrides` as a
  sixth verb beside REQ-MODEL-7's five. Both remain closed sets; CI MUST
  fail on a value outside them, and on a cycle in `rel:overrides`.
- **REQ-CAT-4** — A two-subject rule MUST read a **situation record**:
  two per-vessel fact records, a kinematic state per vessel, relative
  geometry, and history. The per-vessel fact record MUST NOT change to accommodate it, and kinematic
  state MUST be a distinct fact class — a consumer that reads only `display`
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
  `<subject>:<class>:<key>`, subject from `own`/`other`/`pair`, class from
  `fact`/`kin`/`geo`/`hist`. A key with no subject segment MUST mean `own:`,
  so that every predicate and fixture published today is a valid situation
  predicate unedited. `own:fact:*` and `other:fact:*` MUST resolve to the
  per-vessel fact record key for key, with no key renamed or copied.
  `pair` MUST carry only classes whose facts are symmetric between the two
  vessels. Every fact in the `kin`, `geo` and `hist` classes MUST carry
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
  whose `status` is `illustrative` MUST assert no entries and MUST NOT join
  the fixture replay; it fixes the shape and the namespace before the
  entries exist. CI MUST fail on an undeclared fact, an unresolvable key, an
  unknown entry id, an unknown modality, and on an `illustrative` case that
  names an entry.

---

## 5. Languages and localization

COLREGS 72 is multi-lingual at the source: English and French are equally
authentic treaty texts, Spanish and Russian official translations were
deposited with the original, Arabic and Chinese texts exist through IMO's
official languages, and many states gazette their own legally binding
translation. (Recalled, not yet verified against the primary sources — Q-6.)
See ADR 0003.

- **REQ-LANG-1** **(unimplemented — no language dimension exists in the
  data)** — Language MUST be a dimension orthogonal to jurisdiction,
  identified by BCP 47 tags. Which body of rules applies and which text of
  them is displayed are independent questions; neither MUST ever be inferred
  from the other, and no property beyond the language of the text — not
  source, audience, nor legal applicability — MUST be inferred from a tag.
- **REQ-LANG-2** — Identifiers — entry ids, fact values, light ids,
  paragraph paths, relation names — MUST be language-neutral and MUST NOT
  be localized. Translations attach to identifiers; they never replace them.
  Identifiers are schema keywords, not display strings: each vocabulary
  distinguishes machine identifier, display label (catalog), and definition,
  and renaming an identifier is a breaking change (REQ-PKG-4). Immutability
  itself is REQ-MODEL-10; this requirement adds only that identifiers are
  never localized.
- **REQ-LANG-3** **(unimplemented — rule text is one untagged ruleset, not a
  corpus per jurisdiction × language × source)** — Rule text MUST be storable
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
- **REQ-LANG-5** **(unimplemented — no coverage declaration, and the CI checks
  are unwritten)** — Corpora MAY be partial. Coverage MUST be declared in
  machine-readable form, and CI MUST fail on a corpus key that does not
  resolve to a known paragraph path, and on a corpus filename that disagrees
  with the file's internal metadata. Silence MUST NOT imply coverage (the
  language mirror of REQ-SCOPE-6).
- **REQ-LANG-6** **(unimplemented — no display catalogs exist)** — Display
  strings for the identifier vocabularies (light names, fact-value labels,
  modality labels, image captions) MUST be addressable via stable string keys
  with per-language catalogs, separate from legal corpora. Catalog entries are
  static strings: no interpolation, plural or gender grammar — message
  composition belongs to the consumer's i18n system, and this package MUST NOT
  grow one. Each catalog MUST carry lightweight provenance: contributors,
  reviewers, review date, licence. Maintainer notes inside structural files
  are working documentation, not display strings, not part of the localization
  surface, and stay untranslated.
- **REQ-LANG-7** **(unimplemented in part — no fallback policy is encoded, but
  the mixed-corpus statement is missing from the package documentation)** — The
  package MUST NOT encode a language fallback policy, and MUST NOT silently
  substitute one corpus for another. Text is only addressable inside a corpus,
  so every textual unit a consumer retrieves is attributable to its corpus;
  package documentation MUST state that a mixed-corpus rendering is never a
  single authoritative edition. Choice and fallback beyond that are the
  consumer's (the language mirror of REQ-CONS-3).
- **REQ-LANG-8** — A `community`-tier corpus MUST record who produced and
  who reviewed it. Machine translation without named human review MUST NOT
  be accepted.
- **REQ-LANG-9** **(unimplemented — the shipped text declares no normalization
  form)** — Verbatim (REQ-MODEL-1) is defined at the Unicode level: each
  corpus MUST declare the normalization form applied to its text (NFC unless
  declared otherwise) and MUST NOT insert or strip bidi control characters,
  localize numerals, punctuation, units or quotation marks, or otherwise "fix"
  the source text. Rendering direction is a consumer concern and MUST stay out
  of the data.
- **REQ-LANG-10** **(unimplemented — neither the skeleton nor the ruleset
  declares an amendment state)** — The structural skeleton MUST declare, as
  data, the amendment state it consolidates (e.g. "COLREGS 72 as amended
  through …"). Every corpus MUST declare the amendment state its source
  reflects. The two MAY differ — a corpus transcribed from an older
  consolidation is legitimate — but the difference MUST be machine-visible,
  never silent.

---

## 6. Provenance and licensing

- **REQ-PROV-1** — Every text and image asset MUST record its source, the date
  retrieved, and its licence or public-domain basis.
- **REQ-PROV-2** — A jurisdiction MUST NOT be added until its reproduction terms
  have been checked against the primary source and recorded. Recalled or assumed
  terms are not sufficient.
- **REQ-PROV-3** — Where a licence requires attribution (e.g. OGL, CC BY), the
  attribution text MUST ship in the package, not only in the repo.
- **REQ-PROV-4** — Code licence and data licence MUST be stated separately. The
  code licence does not cover third-party scans.
- **REQ-PROV-5** — Images MUST be addressable as data: an image record per file,
  naming what it illustrates by entry id or paragraph path. Unexplained filename
  prefixes are a provenance defect.
- **REQ-PROV-6** **(unimplemented — source identity is a prose string and
  rights are one flat field)** — Source identity MUST be structured data —
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

Each gate names the declined design, the closing event, and the trigger.

- **GATE-1 — `paragraph_id` split from `citation_path`**
  (ADR 0003, declined; REQ-LANG-3, REQ-PKG-4).
  *Closing event*: the 1.0 tag. Before it, splitting the two is a
  mechanical rewrite of cross-references in a package with no stable-API
  promise. After it, every consumer's lookup path breaks.
  *Trigger*: any paragraph path that keeps its spelling while changing what
  text it denotes — the mutation REQ-MODEL-10 forbids outright, which is
  why the collision has to be resolved in the schema rather than absorbed.
  Two ways that happens, both now checked against primary sources
  ([verification](verification/2026-08-30-q6-q8.md)):
  - **Amendment renumbering — verified real, not hypothetical.** The
    original "believed never since 1972" premise is refuted: A.910(22)
    (2001) displaced the old `23(c)` to `23(d)` when WIG lighting took its
    path, and A.464(XII) (1981) relettered `24(g)`→`24(h)` and
    `27(d)(iv)`→`(iii)`. Two of seven amendments renumbered Part C.
  - **Cross-jurisdiction divergence — verified present, and NOT this
    gate's trigger.** The 15 same-path-different-text rows in the 33 CFR 83
    diff are the *jurisdiction dimension working as designed* (REQ-MODEL-1
    stores both texts, keyed by jurisdiction) — the effective identifier is
    (jurisdiction, path), so they are not REQ-MODEL-10 mutations. This
    route is retired, not merely dormant: divergence between two
    jurisdictions at one point in time can never fire the trigger. The
    residue that is genuinely structural — `23(d)(i)` having no Inland
    counterpart path, Rule 28 "[Reserved]" — is a delta-model problem
    (Q-11), not a repoint.
  - **National renumbering across releases — live, and the second real
    route.** A national body renumbering its own amalgamation is the same
    within-jurisdiction repoint as an IMO amendment: if `us/inland 24(c)`
    denotes different text in vN+1 than it did in vN, that is a mutation
    REQ-MODEL-10 forbids, jurisdiction dimension or not. The trigger is
    *within one jurisdiction across releases*, on either route — not
    between jurisdictions at one moment.
  *Ruling, 2026-08-30*: the gate does not flip on today's data — no
  published path has changed denotation. But with the "rare, believed
  never" premise gone (real base rate: twice in seven amendments), the
  pre-1.0 re-take **leans adopt**, decided in the second-jurisdiction
  bundle alongside GATE-2 and Q-10. Final call is the maintainer's at that
  point.
  *This gate is open on timing, not on outcome.* A real-world respelling —
  a citation keeping its spelling while denoting different text —
  **forces** the split: REQ-MODEL-10 forbids repointing and forbids reuse,
  so no third option exists. The re-take, if the trigger fires, is
  therefore predetermined:
  - The split lands and it is a **major version**.
  - Identifiers in the new major are **defined incompatible** with
    identifiers of the prior major. A consumer MUST NOT assume a
    same-spelled path denotes the same text across the boundary.
  - An optional **prior → new identifier mapping** MAY ship alongside.
    REQ-MODEL-11's deprecation registry, with its replacement pointers, is
    the seed of that mapping and exists for this reason.
  What remains open is only whether the trigger ever fires, and whether
  the split lands pre-emptively or on demand.
  *Re-take required before 1.0* (REQ-GATE-3), and re-checked in the
  second-jurisdiction bundle — justified by Q-11 and GATE-2, no longer by
  a cross-jurisdiction trigger route.

- **GATE-2 — instrument → edition → corpus as first-class layers**
  (ADR 0003, declined; the adopted 80% is REQ-LANG-10).
  *Closing event*: the second corpus of any one jurisdiction — which,
  read against ADR 0003's sequencing, means **the first non-English
  corpus**, not a distant milestone. A French or Finnish text of `intl`
  is a second corpus of `intl`. With one corpus, re-homing it under an
  edition parent is a single file move; the cost scales with
  corpora × languages immediately thereafter.
  *Trigger*: a jurisdiction publishing two editions in force
  concurrently — an old and a new text running in parallel through a
  transition period. REQ-LANG-10's declared amendment state makes such a
  pair machine-visible, which is what gives this trigger a foothold.
  *Re-take required before translation #1 lands* — the edition-layer
  decision is due at the first added translation, not at 1.0.

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
  the code (REQ-PROV-4). Tracked as Q-9; ADR 0004 settles the code licence
  and deliberately leaves this open.
  Two refinements the gate carries:
  - Already-published npm versions are irreversibly under the licence they
    shipped with. The gate governs future releases only.
  - The gate is **held open deliberately**, by the mechanism adopted in
    REQ-PROV-7: `CONTRIBUTING.md` terms, agreed by opening a pull request,
    carrying a DCO-style certification *and* a licence grant sufficient to
    relicense. The grant is the part that holds the gate open. Implied
    assent is weaker than recorded assent; a CLA-assistant bot is the
    upgrade path if contributors arrive (ADR 0004).
  *Expected to stay open indefinitely* — external contributors are
  unlikely short of major success. Recorded regardless: "unlikely" is not
  a closing event (REQ-GATE-1).

Gates whose closing event is "none" are recorded because a future reader
will otherwise re-ask whether they were merely deferred. They were not.

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
- **Q-3** — Jurisdiction licence terms are **unverified**: US public domain,
  UK OGL v3.0, AU CC BY 4.0, DE §5 UrhG *amtliche Werke*, CA Reproduction of
  Federal Law Order, EU/UNECE CEVNI unclear. REQ-PROV-2 blocks each until
  checked against the primary source. CEVNI is the one most likely to fail.
- **Q-4** — Two upstream SignalK spec asks are outstanding and independent of
  this package: a making-way indicator, and `design.maxSpeed`.
- **Q-5** — REQ-VERIFY-5 asks for boundary fixtures on every numeric gate.
  Three gates (`23a2`, `26b-mast`, `30c`'s `fact:length_m` thresholds) live only in
  `modality_by`, not in the entry's `when` — they flip `shall` to `may`, not
  which entries apply. The fixture format only asserts applying entry ids, not
  expected modality, so there is no way to fixture these three without
  extending the schema to carry expected modality per entry. Not done
  speculatively; blocks a clean REQ-VERIFY-5 pass on these three gates until
  decided.
  **Decided in pencil 2026-09-04** (PR #22), as part of the situation
  fixture schema: an element of `expect` is either a bare entry id, exactly as
  today, or `{entry, modality}`. The two forms are interchangeable and a bare
  id asserts nothing, so `applicability-fixtures.json` stays byte-identical
  and needs no migration; REQ-CAT-7 states the rule and
  `fixtures/situation-fixtures.json` carries the worked example. What is left
  is not a decision but the work: writing the boundary fixtures for `23a2`,
  `26b-mast` and `30c` in the new form. Pencil, so a session that finds a
  better shape may change it, logging the change; settled for good by those
  three fixtures actually landing.
- **Q-6** — The treaty-language facts behind §5 (en/fr authentic, es/ru
  deposited translations, ar/zh via IMO official languages) are recalled, not
  verified. Verify against the Convention's final clauses and IMO's current
  practice before the first non-English corpus lands.
  **Verified 2026-08-30** against the UNTS deposit (Vol. 1050, I-15824,
  Article IX) — en/fr authentic and es/ru deposited translations both
  confirmed verbatim; ar/zh confirmed as a mechanism (IMO's six official
  languages) with a catalogued Chinese edition, Arabic edition indicated but
  not independently re-fetched. See
  [docs/verification/2026-08-30-q6-q8.md](verification/2026-08-30-q6-q8.md#claim-3-q-6--verified-arabic-component-partially).
- **Q-7** — Reproduction terms per language corpus are unverified, and this —
  not translation effort — sequences the work. IMO's consolidated
  six-language editions are sold publications and probably NOT reproducible;
  the UNTS deposit (en/fr authentic texts) and national gazettes (Finlex,
  BOE, …) are the likely lawful sources. REQ-PROV-2 blocks each corpus until
  its source's terms are checked and recorded. Answerable **per language**,
  not only as a whole: clearing one candidate source unblocks that corpus
  alone, which is the cheap path when a demo needs a specific language
  early.
- **Q-8** — Does the paragraph path survive the first national amalgamation?
  GATE-1's accepted risk rests on paragraph paths being immutable
  (REQ-MODEL-10) — adding and deprecating are fine, but a path that keeps its
  spelling while changing what text it points at breaks every citation and
  every `cite` in `applicability.json`. The threat is not primarily a future
  amendment. It is the **second jurisdiction**: while `intl` is the only
  populated one, path and citation are trivially identical, and the question
  cannot fail. The US Inland rules deliberately parallel COLREGS rule
  numbering but are known to diverge below rule level (Rules 9, 15, 24 and
  34 are the usual examples). Check 33 CFR 83 against `rules.json` paragraph
  by paragraph **before `us/inland` lands**, not at 1.0.
  - If paths survive, GATE-1's accepted risk is earned rather than
    assumed, and the 1.0 re-take is a confirmation.
  - If they do not, GATE-1 flips to *adopt*, and the split must land
    before the second jurisdiction rather than after.
  - Secondary, and much weaker: whether any COLREGS amendment has ever
    renumbered a Part C paragraph. Recalled as never — the WIG amendment
    *inserted* 23(c) rather than renumbering around it — but 50 quiet
    years is not a guarantee about the next amendment. Worth a check
    against the IMO amendment resolutions, not worth blocking on.

  **Verified 2026-08-30**, both parts, against primary sources — see
  [docs/verification/2026-08-30-q6-q8.md](verification/2026-08-30-q6-q8.md).
  Primary claim (33 CFR 83 vs `data/rules.json`): of 90 Part C paths, 15
  are same-spelling-different-text mutations (`22(a)/(b)/(c)`, `24(c)`,
  `24(d)`, `24(f)`, `24(g)`, `24(i)`, `25(d)(i)`, `25(d)(ii)`, `25(e)`,
  `26(d)`, `30(e)`), plus one structural path-mismatch (`23(d)(i)` — the
  Inland equivalent sits at bare `23(d)`, not `23(d)(i)`), one whole-rule
  clean absence (`28`, "[Reserved]" in Inland), and two clean intl-only
  absences. Secondary claim (amendment history): also refuted — the WIG
  amendment (A.910(22), 2001) explicitly renumbers, displacing the
  pre-existing `23(c)` (small-vessel alternative lights) to `23(d)`; a 1981
  amendment (A.464(XII)) separately relettered `24(g)`→`24(h)` and
  `27(d)(iv)`→`27(d)(iii)`. Both findings feed the GATE-1 re-take, not
  decided here.
- **Q-12** — REQ-MODEL-10 has a **baseline off-by-one**, recorded here
  because the requirement as written forbids work already approved. It
  binds any identifier that "has shipped in a released version";
  `colregs@0.1.1` was published 2026-08-29, so every identifier in it is
  already bound — including the ones the identifier audit reviewed and
  cleared for change (type-prefixing the vocabulary class:
  `light:masthead`, `activity:nuc`). Fix by naming the baseline:
  immutability binds from a stated version forward, with 0.1.1 explicitly
  outside it and the reason recorded. The baseline itself MUST be
  immutable: stated exactly once, never moved. A movable baseline is the
  quiet escape hatch from REQ-MODEL-10 — one recorded exception is a
  correction; a second is a pattern. This is a defect in the requirement,
  not a reason to skip the rename; it must land in the same pre-1.0 PR as
  the rename it authorises, and before that PR renames anything. The audit
  itself — six findings, all verified against `data/*.json`, three kept
  with rationale (`nuc`/`cbd`/`ram` as terms of art, the entry-id suffix
  taxonomy, `24a-m2`/`24a-m3` whose cardinality is stated in 24(a)(i)
  itself) — is REQ-MODEL-10's recorded review of the identifiers it binds,
  and is on PR #4.

  **Resolved 2026-08-30.** REQ-MODEL-10 now states the baseline (`0.1.1`,
  outside it, with the reason) and the hardening that makes the exception
  safe: the baseline is set exactly once and MUST NOT be moved, raised,
  re-stated, or joined by a second clause. `test/data.test.mjs` pins the
  literal and asserts a single statement; the requirement records why the
  cross-version half is not asserted. The three accepted findings are
  written up as REQ-MODEL-10's recorded review rather than left on a pull
  request, and the changed one is `docs/identifiers.md`.
- **Q-10** — Split `rel:conditional_includes`, or add a discriminant?
  REQ-MODEL-12 records the overload; this is the unresolved half. Splitting
  it names each behaviour and lets a schema validate the shape, at the cost
  of a sixth and seventh relation verb in a vocabulary CLAUDE.md already
  warns is easy to confuse. A discriminant key is cheaper and keeps the
  verb count down. Neither is urgent: the trigger is the second
  jurisdiction, the same as GATE-2 and Q-8, so the three should be decided
  together rather than one at a time.
- **Q-9** — Is Apache-2.0 the right outbound licence for a *data*
  compilation, or should the data carry CC0 / CC BY 4.0 separately from
  the code (REQ-PROV-4)? ADR 0004 settles the code licence and leaves this
  open deliberately — the data question was never put. GATE-6's trigger;
  must be settled before the contribution path opens. The CLA/DCO half of
  that question is now answered by REQ-PROV-7.
- **Q-11** — What is the delta suppression mechanism? REQ-SCOPE-3's
  inheritance-by-absence is verified unsafe as stated: 33 CFR 83 leaves
  Rule 28 "[Reserved]" and has no counterpart for `23(d)(ii)`/`(iii)`
  ([verification](verification/2026-08-30-q6-q8.md), Claim 1), so a
  `us/inland` delta that is merely silent there would inherit the `intl`
  entries and assert international obligations on inland waters. A delta
  needs explicit suppression records (tombstones) alongside overrides —
  "this path/entry deliberately does not exist here", distinguishable from
  "not yet transcribed". Decide the mechanism in the second-jurisdiction
  bundle (GATE-1 re-take, GATE-2, Q-10); until then no non-`intl`
  jurisdiction lands.
  Also from the same verification pass, tracked on the global board rather
  than here: four transcription defects in `data/rules.json` itself
  (`21(a)`, `21(b)`, `23(b)`, `29(b)`) — a data fix, not a design
  question.

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
- **Q-15** — Which verification tool discharges each category (Alloy, Z3, TLA+,
  STL, Rocq)? Settled by building one proof per category, not by argument.
  *(engine)*
- **Q-16** — Are the invariant levels right as hard / safe / rule-level, and
  are procedural and physical levels needed? Settled by the first level-3
  invariant that does not fit. *(engine)*
- **Q-17** — What separation distance *d* defines the "safe" level? Fixed to
  one value to start; settled by the sensitivity matrix of Q-22. *(engine)*
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
  departing vessel bear the burden? Settled by reading the cases (*The Bywell
  Castle*, *Boy Andrew v St Rognvald*, both unverified), not by advocacy.
- **Q-24** — Are the four worked illustrations (R0, R1, R2,
  `inconclusive-in-model`) actually in the regions they are said to be in?
  They fix meanings, not numbers; settled by computing them. *(engine)*
- **Q-25** — Is the tractability tiering (findable under duress / with time /
  likely missed) a real axis, and do its proxies measure it? Settled by
  bridge-simulator or human-reliability evidence, not by the model. *(engine)*
- **Q-26** — How large is the relative-frame state space? The 10⁴–10⁶ figure
  is a back-of-envelope guess; settled by a worksheet. *(engine)*
- **Q-27** — What are the field names for `category`, `subjects`, `when`,
  `effect` and the widened `modality`? Settled when the first non-`display`
  entry lands, and cheap to change until then.
  Unchanged by PR #22, which names none of those five. The names it
  does fix — `situation`, the four classes, the three subjects — are
  REQ-CAT-6's and are equally pencil.
- **Q-28** — What namespace distinguishes the two subjects of a two-subject
  entry (`own:` / `other:` is the working proposal)? No such segment exists in
  `docs/identifiers.md`; settled before Rule 18 lands, and it is an
  identifier decision under REQ-MODEL-10.
  **Decided in pencil 2026-09-04** (PR #22): `<subject>:<class>:<key>`
  with subject `own`/`other`/`pair` and class `fact`/`kin`/`geo`/`hist`, and a
  bare key meaning `own:`. Written up in `docs/identifiers.md` §"Two
  subjects", required by REQ-CAT-6, and exercised by
  `fixtures/situation-fixtures.json`. Three things the working proposal did
  not have: a third subject, because range and in-sight belong to the
  encounter and not to either vessel; a class segment, so kinematics and
  history are new classes rather than new fact keys; and the bare-key default,
  which is what makes the whole thing additive under REQ-MODEL-10 — no
  existing identifier is renamed or repointed, and `own`/`other`/`pair` become
  reserved at the head of the identifier space, which is the only cost.
  Settled for good by Rule 18 being written against it.
- **Q-29** — What are the file names and schemas for the invariants file and
  the region grid, and how does a level-3 invariant carry `jurisdiction`?
  Settled when the first invariant is written down.
- **Q-30** — What does the `care`/`meta` registry look like as a file — its
  name, its schema, and its relationship to `known_omissions`? Settled by
  REQ-CAT-2's implementation, which is the next data change after this ADR.
