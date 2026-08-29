# colregs — design requirements

Status: **draft**, seeded 2026-08-29. This is the source of truth for what the
package must do. Coding sessions work against these IDs; tests cite them.

Requirement IDs are stable and never reused. If a requirement is dropped it is
struck through and kept, not deleted — a spec whose IDs shift silently cannot
be cited by a test.

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
  NOT require restating the whole body of rules.
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
- **REQ-PART-4** — Steering and sailing rules (Part B) are OUT of v1 scope and
  MAY never be modelled; they govern conduct between two vessels, not the
  appearance of one, and the fact record is single-vessel by construction.

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
  - `propulsion` ∈ power / sail / oars
  - `activity` ∈ none / fishing / trawling / towing / pushing / being-towed /
    nuc / ram / cbd / mine / pilot / diving
  - `position` ∈ underway / anchored / aground / moored
  plus `making_way` as a boolean refining `position=underway`, and numeric and
  boolean facts (`length_m`, `tow_length_m`, `max_speed_kn`, `composite_unit`,
  and the education-only facts).
- **REQ-MODEL-4** — **Applicability entries**: `when` (predicate over facts) →
  lights or refs → modality → citation → jurisdiction. Every entry MUST have a
  stable id derived from its paragraph path (`25b`, `25d1`).
- **REQ-MODEL-5** — Gates MUST be expressed as predicates over facts
  (`length_m < 7`), never as pre-enumerated tuples or configuration counts. Any
  count of "configurations" is an output of evaluation, never an input to the
  data.
- **REQ-MODEL-6** — Entries MUST compose. Multiple entries applying to one fact
  record is the normal case, not an error (Rule 28 is "in addition to" Rule 23).
- **REQ-MODEL-7** — Three relations MUST be supported:
  - `includes` — import another entry's **lights only**, never its predicate;
  - `in_lieu_of` — legal alternatives for the same fact record;
  - `excludes` — mutual exclusion, including across rules.
- **REQ-MODEL-8** — Alternatives MUST be first-class. Where the rules permit a
  choice, the data MUST express all lawful options with their differing
  modalities and gates, and MUST NOT pick one.
- **REQ-MODEL-9** — A decode table from SignalK `navigation.state` to the three
  axes MUST ship with the package. Its lossy cases MUST be enumerated in data,
  not prose — at minimum, the flat enum cannot express fishing-at-anchor.

---

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
  paragraph paths, relation names — MUST be language-neutral and MUST NOT
  be localized. Translations attach to identifiers; they never replace them.
  Identifiers are schema keywords, not display strings: each vocabulary
  distinguishes machine identifier, display label (catalog), and definition,
  and renaming an identifier is a breaking change (REQ-PKG-4).
- **REQ-LANG-3** — Rule text MUST be storable as a **corpus** per
  (jurisdiction × language × source), keyed by paragraph path, holding at
  most one text per path, with corpus-level provenance and one declared
  status tier:
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
- **REQ-LANG-6** — Display strings for the identifier vocabularies (light
  names, fact-value labels, modality labels, image captions) MUST be
  addressable via stable string keys with per-language catalogs, separate
  from legal corpora. Catalog entries are static strings: no interpolation,
  plural or gender grammar — message composition belongs to the consumer's
  i18n system, and this package MUST NOT grow one. Each catalog MUST carry
  lightweight provenance: contributors, reviewers, review date, licence.
  Maintainer notes inside structural files are working documentation, not
  display strings, not part of the localization surface, and stay
  untranslated.
- **REQ-LANG-7** — The package MUST NOT encode a language fallback policy,
  and MUST NOT silently substitute one corpus for another. Text is only
  addressable inside a corpus, so every textual unit a consumer retrieves is
  attributable to its corpus; package documentation MUST state that a
  mixed-corpus rendering is never a single authoritative edition. Choice and
  fallback beyond that are the consumer's (the language mirror of
  REQ-CONS-3).
- **REQ-LANG-8** — A `community`-tier corpus MUST record who produced and
  who reviewed it. Machine translation without named human review MUST NOT
  be accepted.
- **REQ-LANG-9** — Verbatim (REQ-MODEL-1) is defined at the Unicode level:
  each corpus MUST declare the normalization form applied to its text (NFC
  unless declared otherwise) and MUST NOT insert or strip bidi control
  characters, localize numerals, punctuation, units or quotation marks, or
  otherwise "fix" the source text. Rendering direction is a consumer
  concern and MUST stay out of the data.
- **REQ-LANG-10** — The structural skeleton MUST declare, as data, the
  amendment state it consolidates (e.g. "COLREGS 72 as amended through
  …"). Every corpus MUST declare the amendment state its source reflects.
  The two MAY differ — a corpus transcribed from an older consolidation is
  legitimate — but the difference MUST be machine-visible, never silent.

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
- **REQ-PROV-6** — Source identity MUST be structured data — publisher, title,
  edition, publication and effective dates, URL, retrieval date — not a prose
  string. Rights MUST be recorded separately for the source text, for the
  basis on which this package redistributes it, and for the licence the
  package distributes under; one flat `licence` field MUST NOT stand in for
  all three. A translation MAY carry translator rights even where the
  underlying instrument is public domain, and that check is part of
  REQ-PROV-2.

---

## 7. Verification

- **REQ-VERIFY-1** — Fixtures MUST pair fact records with the entries that apply,
  and MUST be consumable by an implementation in any language.
- **REQ-VERIFY-2** — A **drift test** MUST cross-check the forward direction
  (fact record → lights) against a reverse direction (observed lights →
  candidate fact records), so the two cannot silently disagree.
- **REQ-VERIFY-3** — Every applicability entry MUST be covered by at least one
  fixture that exercises it, and at least one that excludes it.
- **REQ-VERIFY-4** — Every `in_lieu_of` and `excludes` relation MUST have a
  fixture demonstrating it.
- **REQ-VERIFY-5** — Predicates MUST be tested at their boundaries. Every numeric
  gate MUST have fixtures immediately either side of the threshold.
- **REQ-VERIFY-6** — CI MUST fail on a fixture that references an entry id, a
  light definition or a paragraph path that does not exist.

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

## 10. Open questions

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
  Three gates (`23a2`, `26b-mast`, `30c`'s `length_m` thresholds) live only in
  `modality_by`, not in the entry's `when` — they flip `shall` to `may`, not
  which entries apply. The fixture format only asserts applying entry ids, not
  expected modality, so there is no way to fixture these three without
  extending the schema to carry expected modality per entry. Not done
  speculatively; blocks a clean REQ-VERIFY-5 pass on these three gates until
  decided.
- **Q-6** — The treaty-language facts behind §5 (en/fr authentic, es/ru
  deposited translations, ar/zh via IMO official languages) are recalled, not
  verified. Verify against the Convention's final clauses and IMO's current
  practice before the first non-English corpus lands.
- **Q-7** — Reproduction terms per language corpus are unverified, and this —
  not translation effort — sequences the work. IMO's consolidated
  six-language editions are sold publications and probably NOT reproducible;
  the UNTS deposit (en/fr authentic texts) and national gazettes (Finlex,
  BOE, …) are the likely lawful sources. REQ-PROV-2 blocks each corpus until
  its source's terms are checked and recorded.
