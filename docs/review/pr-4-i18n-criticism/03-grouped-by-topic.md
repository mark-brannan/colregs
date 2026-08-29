# PR #4 i18n criticism, grouped by topic

Both source critiques ([01](01-general-i18n-critique.md),
[02](02-adr-0003-detailed-review.md)) are unedited here — every quoted block
below is verbatim from its source file. This document only *groups*
overlapping and related sections under shared headings; it does not merge,
reconcile, paraphrase, or pick a side. Where the two reviewers disagree
(see "Fallback policy" below), both positions are presented in full and
unresolved — that debate belongs on the PR, not in this file.

Labels: **Reviewer A** = doc 01 (general i18n critique). **Reviewer B** =
doc 02 (detailed ADR-0003 review).

Not posted anywhere yet.

---

## Topic: Locale vs. jurisdiction

**Reviewer A** (§1, "Conflating Language Localization with Jurisdictional Variance"):

> A common failure mode in regulatory data modeling is treating national or regional regulatory variations as mere "language translations."
>
> * **Language (`locale`):** Translating the 1972 IMO COLREGs text into French (`fr`), Spanish (`es`), or Mandarin (`zh`). The underlying rules are identical; only the language changes.
> * **Jurisdiction (`authority` / `region`):** Modifying or appending rules for specific waters (e.g., **US Coast Guard Inland Navigation Rules**, **Canadian Modifications**, or local harbor bylaws).
>
> If a user requests `en-US` data, does the system return the **IMO international text localized in US English spelling**, or does it return the **US Inland Rules** (which differ significantly in Rule 14, Rule 24, lights, and sound signals)?
>
> Strictly decouple **`locale`** (language/formatting) from **`jurisdiction`** (legal authority):
>
> ```json
> {
>   "rule_id": "RULE_14_HEAD_ON",
>   "jurisdiction": "IMO_1972",  // or "USCG_INLAND", "CCG_CANADA"
>   "locale": "en-US",
>   "title": "Head-on Situation"
> }
> ```

**Reviewer B** (§1, "The biggest issue: 'language' is doing several different jobs"):

> The ADR says language is a dimension orthogonal to jurisdiction, which is correct, but then collapses several concepts into a single BCP 47 language tag:
>
> - language of the legal source
> - language of a translation
> - language of a UI catalog
> - potentially language requested by a consumer
> - potentially locale/variant (en-US, en-GB, zh-Hans, etc.)
>
> Those aren't necessarily equivalent.
>
> For example, the current corpus is proposed as:
>
> ```
> intl.en-US.uscg.json
> ```
>
> But this isn't really an "en-US translation" of the international rules. It's a USCG-produced English-language national rendition of international rules. The distinction matters because en-US can imply a localization rather than simply identifying the language.
>
> I'd consider modeling at least:
>
> ```json
> {
>   "language": "en",
>   "locale": "en-US",
>   "jurisdiction": "intl",
>   "source_jurisdiction": "US",
>   "tier": "national"
> }
> ```
>
> or, if locale isn't useful, don't use it at all.
>
> Otherwise you eventually get awkward questions such as:
>
> Is a Finnish government's Finnish translation fi, fi-FI, or something else?
>
> Is a UK English version a separate corpus from an international English version?
>
> Is en-US describing the language, the source jurisdiction, or the intended audience?
>
> BCP 47 is excellent for language tags, but it doesn't by itself model provenance or legal applicability.
>
> **Related concern**
>
> The ADR explicitly says neither jurisdiction nor language should be inferred from the other.
>
> Good. I'd extend that principle to:
>
> No semantic property should be inferred from the BCP 47 tag.
>
> In particular, don't let en-US implicitly mean "US law", fi-FI mean "Finnish COLREGS", etc.

---

## Topic: Invariant machine identifiers vs. display strings

**Reviewer A** (§2, "Machine-Readable Keys vs. Localized Display Strings"):

> Hardcoding localized strings into structured rule logic (e.g., placing localized names directly inside condition objects or enumerated values).
>
> Upstream systems (such as automated collision avoidance algorithms, AIS alert engines, or quiz apps) need immutable, language-agnostic enums to evaluate state. If `vessel_type` is stored as `"Sailing vessel"` in English and `"Navire à voiles"` in French inside the core rule model, queries break across languages.
>
> * Core domain concepts **must** use invariant, snake_case/SCREAMING_SNAKE_CASE identifiers (e.g., `RESTRICTED_IN_ABILITY_TO_MANEUVER`, `MASTHEAD_LIGHT`, `GIVE_WAY`).
> * Translatable string maps should attach to or reference these invariant IDs.
>
> ```json
> {
>   "id": "RULE_18_a",
>   "give_way_vessel_type": "POWER_DRIVEN",
>   "stand_on_vessel_type": "SAILING",
>   "i18n": {
>     "en": {
>       "summary": "A power-driven vessel underway shall keep out of the way of a sailing vessel."
>     },
>     "fr": {
>       "summary": "Un navire à propulsion mécanique en route doit s'écarter de la route d'un navire à voiles."
>     }
>   }
> }
> ```

**Reviewer B** (§4, "The 'skeleton' isn't actually entirely language-neutral"):

> The ADR says:
>
> "Structural skeleton (language-neutral). Paragraph paths, rule numbers, jurisdictions, entry ids, fact values, light ids..."
>
> But there are at least two categories worth questioning:
>
> **Fact values**
>
> A value such as:
>
> ```
> "activity": "fishing"
> ```
>
> isn't itself a translation, so that's fine.
>
> But the semantic choice of the identifier is already an English conceptualization.
>
> That's okay if these are canonical machine identifiers, but I'd make that explicit. Otherwise contributors may eventually decide that:
>
> ```
> "not_under_command"
> ```
>
> is a user-visible string because it is "the name of the fact."
>
> I'd distinguish:
>
> machine identifier
> display label
> definition
>
> for every vocabulary.
>
> **Relation names**
>
> The ADR explicitly says relation names don't translate.
>
> That's right, but I'd be very explicit that they're schema keywords, not merely "labels." Once something is a schema keyword, changing:
>
> ```
> in_lieu_of
> ```
>
> is a breaking schema change.
>
> That distinction will help future contributors understand why a translated JSON key is unacceptable.

---

## Topic: Translation/corpus provenance and authority tiers

**Reviewer A** (§3, "Translation Provenance, Authority & Legal Disclaimers"):

> Treating all language translations as equally authoritative without tracking their origin.
>
> The IMO publishes official text in **6 official languages** (Arabic, Chinese, English, French, Russian, Spanish). Official working languages are English, French, and Spanish. Community-contributed translations for other languages (e.g., German, Dutch, Portuguese) or unofficial machine translations may carry subtle inaccuracies that could lead to liability or confusion in maritime safety apps.
>
> Include provenance metadata for every localized payload:
>
> * `authority_tier`: `"IMO_OFFICIAL"` | `"NATIONAL_AUTHORITY"` | `"COMMUNITY_TRANSLATION"`
> * `source_url`: Link to official gazette or IMO publication.
> * Mandatory legal disclaimers stating whether the data is suitable for navigation or restricted to training/education.

**Reviewer B** (§5, "You're missing a formal concept of translation provenance"):

> This is probably the biggest omission in the actual i18n model.
>
> You have excellent provenance requirements for legal corpora, and community corpora must record producer/reviewer.
>
> But display catalogs are treated rather more casually.
>
> Suppose fi.json contains:
>
> ```json
> {
>   "light.masthead": "..."
> }
> ```
>
> Who translated it?
>
> Who reviewed it?
>
> When?
>
> Against which English/source terminology?
>
> Was it translated by a native speaker, a maritime professional, an IMO translator, or an LLM?
>
> For a general UI string that may not matter much. But this package is maritime regulatory data, so terminology is unusually important.
>
> I'd give catalogs at least lightweight metadata:
>
> ```json
> {
>   "language": "fi",
>   "source": "...",
>   "contributors": [...],
>   "reviewers": [...],
>   "last_reviewed": "...",
>   "license": "...",
>   "strings": {...}
> }
> ```
>
> Not necessarily the full legal-corpus provenance model, but enough to establish accountability.

**Reviewer B** (§6, "'Community translation' and 'community corpus' aren't quite the same thing"):

> REQ-LANG-8 says:
>
> A community-tier corpus must record who produced and reviewed it.
>
> But there are two substantially different cases:
>
> Someone translates an existing authoritative legal text.
> Someone contributes a localized explanatory/UI catalog.
>
> The first has legal/terminological consequences; the second doesn't.
>
> I'd avoid making community a catch-all concept.
>
> Potentially:
>
> ```
> legal status:
>   authentic
>   official
>   national
>   unofficial
>
> translation status:
>   source-original
>   official-translation
>   community-translation
>   ...
> ```
>
> Because "community" currently mixes legal authority and translation provenance.

**Reviewer B** (§11, "'Authentic' is a legal claim and deserves a stricter definition"):

> The tier taxonomy is useful:
>
> authentic
> official
> national
> community
>
> But "authentic" is a loaded word.
>
> I'd define it in terms of the legal instrument, not the repository's assessment.
>
> For example:
>
> authentic: text identified by the relevant instrument as equally authentic.
>
> rather than:
>
> original text / source text.
>
> That distinction matters because a government publication can be authoritative without being an "authentic treaty text."
>
> Also, the ADR currently contains several assertions about which COLREGS languages have what legal status while simultaneously saying those assertions still need verification.
>
> I'd be careful not to encode those claims as requirements until verified.

---

## Topic: Centralized terminology / glossary

**Reviewer A** (§4, "Nautical Terminology & Centralized Concept Dictionary") — no corresponding section in Reviewer B:

> Translating rule text piecemeal without a shared domain glossary/lexicon.
>
> Maritime terms have legally defined meanings that must remain consistent across rule descriptions, definitions, light specifications, and UI labels. For example:
>
> * `"Underway"` vs. `"Making way"` (*En route* vs. *Ayant de l'air*).
> * `"Give-way vessel"` vs. `"Stand-on vessel"` (*Navire non-privilégié* vs. *Navire privilégié*).
>
> If different contributors translate Rule 16 and Rule 17 independently, they might use conflicting terms for "Stand-on" or "Give-way".
>
> Maintain a **Centralized i18n Glossary / Terminology Map** within the package that maps concept keys to exact localized terms. Require CI validation to ensure rule translations reference these standard glossary terms.

---

## Topic: Interpolation / message formatting

**Reviewer A** (§5, "String Concatenation & Dynamic Interpolation"):

> Constructing localized descriptions by concatenating string fragments (e.g., `"Rule " + rule.number + ": " + rule.title + " applies to " + vessel.type`).
>
> Word order and grammatical agreement vary drastically between languages (e.g., adjectives following nouns in French/Spanish, verb placement in German, or right-to-left layout in Arabic).
>
> Use structured interpolation formatters like **ICU MessageFormat** or structured node references rather than string concatenation:
>
> ```json
> {
>   "key": "rule_applies_to_vessel",
>   "text": "{rule_number, selectordinal, =1 {Rule 1} other {Rule #}} applies when operating a {vessel_type}."
> }
> ```

**Reviewer B** (§17, "Display catalogs need plural/select support—or an explicit statement that they don't"):

> The current catalog idea is basically:
>
> key → translated string
>
> which is fine for:
>
> light names
> fact labels
> modality labels
> captions.
>
> But eventually you may want:
>
> "1 light"
> "2 lights"
>
> or:
>
> "1 vessel"
> "2 vessels"
>
> or gender/context-dependent labels.
>
> I'd either:
>
> explicitly keep this package to static labels only, or
> design catalog entries so they can eventually represent ICU/CLDR-style message formatting.
>
> Don't accidentally invent a home-grown localization system that becomes incompatible with every normal i18n library.
>
> Given that this is a data package rather than an i18n runtime, I'd probably choose the former.

---

## Topic: Units, numbers, and localized formatting

**Reviewer A** (§6, "Numeric Values, Units & Spatial Formatting"):

> Hardcoding unit strings (e.g., `"2 nautical miles"`, `"22.5 degrees"`, `"6 seconds"`) into translatable text fields.
>
> 1. **Conversion Needs:** Consumers may want to display metric meters (`m`) vs. feet (`ft`) for vessel length depending on target audience, while maintaining canonical values (`meters`, `nautical_miles`, `degrees`) in data.
> 2. **Localized Unit Formatting:** Number separators (`2.5 nm` in US vs. `2,5 nm` in French) and translated unit symbols (e.g., `M` for nautical miles in German/English vs `m` in French, where `m` can conflict with meters).
>
> Store numeric thresholds in **canonical SI / Maritime standard units** as numbers, separate from formatting logic:
>
> ```json
> {
>   "visibility_range": {
>     "value": 2.0,
>     "unit": "nautical_mile"
>   },
>   "arc_of_visibility": {
>     "start_deg": 225.0,
>     "end_deg": 315.0,
>     "phrase_key": "ABAFT_THE_BEAM_PORT"
>   }
> }
> ```

**Reviewer B** (§18, "Locale-specific typography isn't necessarily a legal-text concern, but numeric data is"):

> There is an interesting boundary here.
>
> The package has actual structured numeric data:
>
> arc_deg
> height
> spacing
> range
> intensity
>
> Those should obviously remain numeric and locale-neutral.
>
> But if translated text contains:
>
> 1,000 metres
> 1 000 metres
> ١٠٠٠ متر
>
> that's source text and must remain as sourced.
>
> I'd explicitly state:
>
> Localization MUST NOT be applied to values embedded in legal corpora.
>
> Otherwise a well-meaning contributor might "localize" numbers, units, punctuation, or quotation marks in a purportedly verbatim corpus.

---

## Topic: RTL / bidi / script support and Unicode verbatim-ness

**Reviewer A** (§7, "Bi-directional (RTL) & Script Support (Arabic)"):

> Assuming all text flows Left-to-Right (LTR).
>
> Arabic is one of the 6 official IMO languages. When rendering mixed content (such as Arabic text combined with numeric rule numbers, degree symbols like `22.5°`, or technical identifiers like `Rule 15`), text ordering can scramble without explicit BIDI markers.
>
> * Ensure JSON string encodings strictly enforce **UTF-8**.
> * Include text directionality metadata (`dir: "ltr" | "rtl"`) at the locale package level.

**Reviewer B** (§14, "RTL is more than 'JSON carries it fine'"):

> The ADR correctly notes that JSON strings can carry Arabic and that rendering is a consumer concern.
>
> But Arabic/Chinese/etc. introduce another issue: embedded structured references.
>
> Legal text may contain things like:
>
> Rule 21
> 27(a)
> 5 knots
> 10°
>
> inside RTL prose.
>
> Bidirectional rendering can become surprisingly tricky.
>
> The package probably shouldn't solve presentation, but I would add a requirement that:
>
> Legal text MUST be stored exactly as sourced, with no Unicode bidi/control-character normalization or insertion by the data layer.
>
> And perhaps explicitly prohibit the package from "fixing" visual RTL presentation inside legal text.
>
> That keeps the corpus genuinely verbatim.

**Reviewer B** (§15, "Unicode normalization deserves a decision") — no corresponding section in Reviewer A:

> Related to the above: if the package promises verbatim text, what does that mean at the byte/code-point level?
>
> Are these considered equivalent?
>
> é
> e + combining acute
>
> If a corpus is checked against a source hash, normalization could matter.
>
> You don't necessarily need to preserve source bytes, but I'd define whether "verbatim" means:
>
> visually/verbatim textual content,
> Unicode code-point equivalent,
> exact extracted byte sequence.
>
> For a legal corpus, I'd lean toward explicitly recording an extraction hash and stating the normalization policy.

---

## Topic: Fallback policy — REVIEWERS DISAGREE, unresolved here

**Reviewer A** (§8, "Fallback Chains & Packaging Strategy") — argues the package *should* define a fallback chain:

> Either bundling all languages into a single giant JSON file or lacking a deterministic fallback policy for incomplete translations.
>
> * **Bundle Bloat:** If a browser or embedded marine device (e.g., Signal K server, Raspberry Pi chartplotter) imports `@colregs/data`, forcing them to load 20 languages at once causes unnecessary memory and bandwidth usage.
> * **Missing Key Crash:** If a localized key is missing in Spanish, the package should gracefully fall back to `es` (base) -> `en` (or official IMO English).
>
> 1. **Modular Packaging:** Split locale files into dynamic loadable chunks/modules (e.g., `@colregs/data/locales/en.json`, `@colregs/data/locales/fr.json`).
> 2. **Explicit Fallback Policy:**
>
> ```
> [Requested Locale: es-MX] ➔ [es] ➔ [en (Default IMO Source)]
> ```
>
> 3. **Type Safety:** Provide generated TypeScript definitions or JSON Schemas that enforce full coverage or mark fallback properties clearly.

**Reviewer B** (§8, "Fallback being entirely the consumer's responsibility may be too strict") — argues against the package prescribing a fallback chain, while still wanting more than nothing:

> I agree with the principle that the data package shouldn't silently choose a legal text.
>
> But "no fallback policy whatsoever" may be throwing away useful metadata.
>
> The ADR says the package declares what exists but never encodes fallback policy.
>
> I'd separate:
>
> **Bad**
>
> ```
> fi → en → fr
> ```
>
> hard-coded as the package's preferred UX.
>
> **Useful**
>
> ```json
> {
>   "language": "fi",
>   "fallback_languages": ["sv", "en"]
> }
> ```
>
> if the package explicitly defines this as metadata, not a legal selection rule.
>
> Even better, don't prescribe fallback, but expose enough information for consumers to implement it safely:
>
> available languages
> available corpora
> coverage
> tier
> source
>
> Then consumers can make informed choices.
>
> The critical rule should probably be:
>
> The package MUST NOT silently substitute a different legal corpus merely because the requested language is unavailable.
>
> That's stronger and more precise than simply saying "fallback is the consumer's call."

**Reviewer B** (§9, "The design needs an explicit rule for mixing languages") — related, no corresponding section in Reviewer A:

> This is a particularly important downstream question.
>
> Suppose a user asks for Finnish.
>
> Finnish corpus has:
>
> 27(a)
> 27(b)
> 27(c)
>
> but is missing:
>
> 27(d)
>
> The English corpus has all four.
>
> Can the consumer display:
>
> 27(a) Finnish
> 27(b) Finnish
> 27(c) Finnish
> 27(d) English
>
> ?
>
> The current design technically leaves that to the consumer.
>
> But for a legal document, that's a dangerous ambiguity.
>
> I'd explicitly define that the package can represent mixed-language retrieval but does not claim that such a mixed result constitutes a coherent "Finnish edition."
>
> Something like:
>
> A resolved document view MUST identify the corpus used for every textual unit; consumers MUST NOT represent a mixed-corpus result as a single authoritative translation.
>
> That would prevent subtle UI/legal problems.

---

## Topic: Corpus identity, legal versioning, and paragraph-path stability

No corresponding sections in Reviewer A. Reviewer B only:

**§2, "'Corpus per jurisdiction × language × source' is probably underspecified":**

> This is the second thing I'd nail down.
>
> The proposed identity is effectively:
>
> (jurisdiction × language × source)
>
> But "source" itself has multiple dimensions.
>
> Suppose you eventually have:
>
> UNTS original English
> UNTS original French
> IMO consolidated English
> USCG English
> USCG Spanish
> a Finnish statute
> an amended Finnish statute
> a later consolidated Finnish statute
>
> These aren't merely different sources of the same corpus. Some represent different legal versions.
>
> The design currently has good provenance fields (source, retrieved, licence, etc.), but I don't see a sufficiently strong concept of source/version/edition.
>
> I'd strongly recommend a first-class distinction between:
>
> ```
> legal instrument
>     ↓
> source/edition
>     ↓
> corpus
>     ↓
> paragraph text
> ```
>
> because otherwise you'll eventually have two corpora both claiming to represent:
>
> jurisdiction=intl
> language=en
> tier=authentic
>
> but with different amendment states.
>
> That gets especially nasty if the structural skeleton is shared between them.

**§3, "Paragraph paths are being treated as more stable than they really are":**

> The design makes the paragraph path (27(a)(i)) the fundamental key for text and citation. That's elegant and fits the existing model.
>
> But I think there's a lurking versioning problem.
>
> A paragraph path is a human/legal citation, not necessarily an immutable identifier.
>
> Consider an amendment that:
>
> inserts a paragraph,
> renumbers paragraphs,
> splits one paragraph into two,
> removes one,
> changes the numbering in a national implementation.
>
> Now what happens to:
>
> "27(a)(i)"
>
> ?
>
> You have two competing requirements:
>
> Consumers need stable identifiers.
> Legal citations need to reproduce the source's actual numbering.
>
> Those aren't necessarily the same thing.
>
> I'd consider making the distinction explicit:
>
> paragraph_id: stable internal identity
> citation_path: "27(a)(i)"
>
> or explicitly declaring that paragraph paths are source-version-specific identifiers, and accepting that they're not stable across legal revisions.
>
> This matters enormously once the package starts modeling amended national law.

**§10, "You need to model amendments and consolidation sooner than later":**

> This is the thing I'd worry about most from the perspective of the broader project.
>
> The design is beautifully structured around:
>
> jurisdiction
> language
> source
> paragraph
>
> but maritime rules are not static documents.
>
> A national implementation may have:
>
> the original Convention
> amendments
> implementing regulations
> consolidated text
> superseded text
> effective dates
> publication dates
>
> If rules.json becomes the stable skeleton and corpora attach text to it, you're implicitly assuming the skeleton itself is invariant.
>
> That won't hold forever.
>
> I'd introduce the concept of a textual/legal version now, even if the current data only has one.
>
> For example:
>
> instrument
>   source
>   publication
>   version/effective date
>   corpus
>
> Otherwise the schema may need another breaking redesign later.

**§16, "Translation shouldn't be assumed to preserve paragraph boundaries":**

> The design keys translations to the same paragraph paths, which is sensible. But a translation may have:
>
> reordered clauses,
> translator notes,
> footnotes,
> different typography,
> different paragraph numbering,
> editorial additions.
>
> This is another reason to distinguish:
>
> source paragraph identity
>
> from:
>
> translation text attachment
>
> The schema should permit a translation to say something like:
>
> source paragraph: 27(a)
> translation unit: 27(a)
>
> but not assume that every source text has exactly one textual representation per paragraph forever.
>
> Even a simple rule like "a corpus entry may contain zero or one text value per skeleton paragraph" should be a conscious constraint, not an accidental property.

---

## Topic: Licensing and source-identity structure

No corresponding sections in Reviewer A. Reviewer B only:

**§12, "Source identity should probably be machine-readable, not just prose metadata":**

> "Source" is going to become important enough that a URL + publisher name probably won't be sufficient.
>
> I'd want something resembling:
>
> ```json
> "source": {
>   "publisher": "...",
>   "title": "...",
>   "identifier": "...",
>   "edition": "...",
>   "publication_date": "...",
>   "effective_date": "...",
>   "retrieved": "...",
>   "url": "...",
>   "license": "..."
> }
> ```
>
> The exact schema can wait, but I'd establish that source identity is structured data.
>
> Otherwise provenance is technically present but hard for downstream software to reason about.

**§13, "Licensing needs to distinguish source rights from repository rights":**

> The ADR is correctly thinking about this; I think it needs to go one level further.
>
> For each corpus there are potentially three distinct things:
>
> copyright/licensing status of the source text;
> rights to redistribute the extracted text;
> license under which the repository distributes its copy.
>
> Those aren't necessarily the same.
>
> Likewise, a translator may have rights in a translation even if the underlying treaty is public domain.
>
> So I'd avoid a single:
>
> "licence": "..."
>
> field eventually becoming a false sense of completeness.

---

## Topic: Terminology, filenames, and other smaller inconsistencies

No corresponding sections in Reviewer A. Reviewer B only:

**"A few smaller inconsistencies":**

> **The terminology "translation"**
>
> The design sometimes speaks as though all non-English corpora are translations. But an English USCG rendition isn't a translation, and a national text may itself be an independently promulgated legal instrument.
>
> I'd use "text corpus" consistently, with translation_of only where applicable.
>
> **rule_title**
>
> Is rule_title legal text or display text?
>
> It currently lives in the legal corpus. That's probably correct if it's verbatim source material—but I'd state that explicitly, because "title" sounds like a UI string.
>
> **note**
>
> The ADR says structural note fields remain untranslated working documentation.
>
> I'd worry that consumers will eventually expose those fields. If there is any possibility they're part of the public data API, "working documentation" isn't a strong enough boundary.
>
> Perhaps rename them to something explicitly maintainer-only, or move them into separate documentation.
>
> **Filename conventions**
>
> The document says filenames are convenience and metadata inside the file is authoritative.
>
> Good—but then CI should verify that filename metadata and internal metadata agree. Otherwise you'll eventually have:
>
> intl.fi.finlex.json
>
> whose contents say language: sv.

---

## Reviewer B's own architectural proposal (not a critique of a specific section — stands alone)

**"One architectural change I'd seriously consider":**

> I'd make the model conceptually four layers rather than three:
>
> ```
> 1. Semantic model
>    - IDs
>    - predicates
>    - facts
>    - relations
>    - geometry
>
> 2. Legal instrument/version
>    - instrument identity
>    - jurisdiction
>    - amendments
>    - effective/publication dates
>
> 3. Text corpus
>    - language
>    - source/edition
>    - legal status
>    - provenance
>    - paragraph → verbatim text
>
> 4. Display localization
>    - language/locale
>    - stable UI key → localized message
>    - translation metadata
> ```
>
> The PR currently has 1 + 3 + 4, with legal instrument/version implicitly hiding inside 2/3.
>
> That's the part I'd fix now.

---

## Reviewer A's checklist (stands alone)

**"Actionable Checklist for PR Review":**

| Category | Item to Verify in Design Doc |
| --- | --- |
| **Jurisdiction** | Are language locales (`fr`, `es`) separated from regulatory authorities (`IMO`, `USCG`)? |
| **Data Integrity** | Are rule IDs, light patterns, and vessel states represented as invariant enums? |
| **Glossary** | Is there a unified domain terminology lexicon to ensure consistency across rules? |
| **Units** | Are numbers/units canonicalized rather than embedded in translated strings? |
| **Provenance** | Is metadata included to distinguish official IMO text from community translations? |
| **Package Size** | Can consumers import individual locales on-demand (tree-shaking/split JSON)? |
| **Fallbacks** | Is there a defined resolution chain when a locale string is missing? |

## Reviewer B's priority ranking (stands alone)

**"My priority ranking":**

> If I were reviewing this PR, I'd classify the issues as:
>
> Must resolve before schema implementation
> Legal-version/source identity
> What exactly makes a paragraph ID stable
> Corpus identity and provenance
> Exact semantics of partial coverage
> Whether/when mixed-language results are permissible
> Precise meaning of authentic / official / national / community
>
> Should resolve before first translation lands
> Translation/catalog provenance
> Source licensing vs repository licensing
> BCP 47 vs locale/source-jurisdiction semantics
> Verbatim/Unicode normalization policy
> RTL/bidi preservation rules
> Filename-vs-internal metadata validation
>
> Nice to resolve now, but not blockers
> Pluralization/message-format scope
> rule_title semantics
> maintainer note fields
> numeric/units localization policy

## Reviewer B's "what's already good" and bottom line (stands alone)

> There are several decisions I'd preserve.
>
> Language orthogonal to jurisdiction. Absolutely right.
> Stable machine identifiers rather than translated identifiers. Essential for cross-language consumers.
> Legal text separated from UI strings. Very good boundary.
> Per-corpus provenance. Much better than a global "source language" concept.
> Partial translations explicitly represented. Good, provided the coverage semantics are tightened.
> No automatic legal-text fallback. Good instinct, although I'd rephrase it as "no silent substitution."
> Community translations requiring human review. Exactly the right instinct for this domain.
> Additive language contributions. Excellent contributor model.
> Thinking about licensing before accumulating translations. This could save a major cleanup later.
>
> The general philosophy also lines up with good i18n architecture: keep locale-dependent data modular and make behavior independent of which locale data happens to be loaded. That's a principle used in mature i18n systems such as ICU4X.
>
> Bottom line: I think the PR has the right decomposition, but it's currently more of an i18n architecture than a complete multilingual legal-text data model. The missing piece is temporal/source identity: once you add real national implementations and amended/consolidated texts, "jurisdiction × language × source × paragraph" is likely not enough to unambiguously identify a piece of law.
>
> If I were making one change before approving the ADR, I'd introduce an explicit legal instrument/source-version identity and make the corpus attach to that. That gives you a much stronger foundation for the inevitable combination of jurisdiction × legal version × language × translation/source × paragraph without having to redesign the model after contributors have already started producing translations.
