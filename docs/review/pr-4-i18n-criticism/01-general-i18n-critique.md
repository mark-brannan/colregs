# External critique 1: general i18n design gaps

Source: pasted by Mark, Gemini, 2026-08-29.
Context: review of [PR #4](https://github.com/mark-brannan/colregs/pull/4)
(ADR 0003 / REQ-LANG), unsolicited — not a GitHub comment on the PR itself.
Landed verbatim for triage; not yet synthesized or endorsed.

---

Designing internationalization (i18n) for an open-source data package that models regulatory text like the **COLREGs (International Regulations for Preventing Collisions at Sea)** introduces unique challenges. Unlike standard UI software, COLREGs data combines **legally binding regulatory prose**, **strict nautical domain terminology**, **geographic/jurisdictional variants**, and **machine-readable spatial/logical rules**.

Here is a comprehensive critique highlighting the critical gaps, oversights, architectural traps, and edge cases to address in your i18n design.

---

## 1. Conflating Language Localization with Jurisdictional Variance

### The Pitfall

A common failure mode in regulatory data modeling is treating national or regional regulatory variations as mere "language translations."

* **Language (`locale`):** Translating the 1972 IMO COLREGs text into French (`fr`), Spanish (`es`), or Mandarin (`zh`). The underlying rules are identical; only the language changes.
* **Jurisdiction (`authority` / `region`):** Modifying or appending rules for specific waters (e.g., **US Coast Guard Inland Navigation Rules**, **Canadian Modifications**, or local harbor bylaws).

### The Risk

If a user requests `en-US` data, does the system return the **IMO international text localized in US English spelling**, or does it return the **US Inland Rules** (which differ significantly in Rule 14, Rule 24, lights, and sound signals)?

### Recommendation

Strictly decouple **`locale`** (language/formatting) from **`jurisdiction`** (legal authority):

```json
{
  "rule_id": "RULE_14_HEAD_ON",
  "jurisdiction": "IMO_1972",  // or "USCG_INLAND", "CCG_CANADA"
  "locale": "en-US",
  "title": "Head-on Situation"
}
```

---

## 2. Machine-Readable Keys vs. Localized Display Strings

### The Pitfall

Hardcoding localized strings into structured rule logic (e.g., placing localized names directly inside condition objects or enumerated values).

### The Risk

Upstream systems (such as automated collision avoidance algorithms, AIS alert engines, or quiz apps) need immutable, language-agnostic enums to evaluate state. If `vessel_type` is stored as `"Sailing vessel"` in English and `"Navire à voiles"` in French inside the core rule model, queries break across languages.

### Recommendation

* Core domain concepts **must** use invariant, snake_case/SCREAMING_SNAKE_CASE identifiers (e.g., `RESTRICTED_IN_ABILITY_TO_MANEUVER`, `MASTHEAD_LIGHT`, `GIVE_WAY`).
* Translatable string maps should attach to or reference these invariant IDs.

```json
{
  "id": "RULE_18_a",
  "give_way_vessel_type": "POWER_DRIVEN",
  "stand_on_vessel_type": "SAILING",
  "i18n": {
    "en": {
      "summary": "A power-driven vessel underway shall keep out of the way of a sailing vessel."
    },
    "fr": {
      "summary": "Un navire à propulsion mécanique en route doit s'écarter de la route d'un navire à voiles."
    }
  }
}
```

---

## 3. Translation Provenance, Authority & Legal Disclaimers

### The Pitfall

Treating all language translations as equally authoritative without tracking their origin.

### The Risk

The IMO publishes official text in **6 official languages** (Arabic, Chinese, English, French, Russian, Spanish). Official working languages are English, French, and Spanish. Community-contributed translations for other languages (e.g., German, Dutch, Portuguese) or unofficial machine translations may carry subtle inaccuracies that could lead to liability or confusion in maritime safety apps.

### Recommendation

Include provenance metadata for every localized payload:

* `authority_tier`: `"IMO_OFFICIAL"` | `"NATIONAL_AUTHORITY"` | `"COMMUNITY_TRANSLATION"`
* `source_url`: Link to official gazette or IMO publication.
* Mandatory legal disclaimers stating whether the data is suitable for navigation or restricted to training/education.

---

## 4. Nautical Terminology & Centralized Concept Dictionary

### The Pitfall

Translating rule text piecemeal without a shared domain glossary/lexicon.

### The Risk

Maritime terms have legally defined meanings that must remain consistent across rule descriptions, definitions, light specifications, and UI labels. For example:

* `"Underway"` vs. `"Making way"` (*En route* vs. *Ayant de l'air*).
* `"Give-way vessel"` vs. `"Stand-on vessel"` (*Navire non-privilégié* vs. *Navire privilégié*).

If different contributors translate Rule 16 and Rule 17 independently, they might use conflicting terms for "Stand-on" or "Give-way".

### Recommendation

Maintain a **Centralized i18n Glossary / Terminology Map** within the package that maps concept keys to exact localized terms. Require CI validation to ensure rule translations reference these standard glossary terms.

---

## 5. String Concatenation & Dynamic Interpolation

### The Pitfall

Constructing localized descriptions by concatenating string fragments (e.g., `"Rule " + rule.number + ": " + rule.title + " applies to " + vessel.type`).

### The Risk

Word order and grammatical agreement vary drastically between languages (e.g., adjectives following nouns in French/Spanish, verb placement in German, or right-to-left layout in Arabic).

### Recommendation

Use structured interpolation formatters like **ICU MessageFormat** or structured node references rather than string concatenation:

```json
{
  "key": "rule_applies_to_vessel",
  "text": "{rule_number, selectordinal, =1 {Rule 1} other {Rule #}} applies when operating a {vessel_type}."
}
```

---

## 6. Numeric Values, Units & Spatial Formatting

### The Pitfall

Hardcoding unit strings (e.g., `"2 nautical miles"`, `"22.5 degrees"`, `"6 seconds"`) into translatable text fields.

### The Risk

1. **Conversion Needs:** Consumers may want to display metric meters (`m`) vs. feet (`ft`) for vessel length depending on target audience, while maintaining canonical values (`meters`, `nautical_miles`, `degrees`) in data.
2. **Localized Unit Formatting:** Number separators (`2.5 nm` in US vs. `2,5 nm` in French) and translated unit symbols (e.g., `M` for nautical miles in German/English vs `m` in French, where `m` can conflict with meters).

### Recommendation

Store numeric thresholds in **canonical SI / Maritime standard units** as numbers, separate from formatting logic:

```json
{
  "visibility_range": {
    "value": 2.0,
    "unit": "nautical_mile"
  },
  "arc_of_visibility": {
    "start_deg": 225.0,
    "end_deg": 315.0,
    "phrase_key": "ABAFT_THE_BEAM_PORT"
  }
}
```

---

## 7. Bi-directional (RTL) & Script Support (Arabic)

### The Pitfall

Assuming all text flows Left-to-Right (LTR).

### The Risk

Arabic is one of the 6 official IMO languages. When rendering mixed content (such as Arabic text combined with numeric rule numbers, degree symbols like `22.5°`, or technical identifiers like `Rule 15`), text ordering can scramble without explicit BIDI markers.

### Recommendation

* Ensure JSON string encodings strictly enforce **UTF-8**.
* Include text directionality metadata (`dir: "ltr" | "rtl"`) at the locale package level.

---

## 8. Fallback Chains & Packaging Strategy

### The Pitfall

Either bundling all languages into a single giant JSON file or lacking a deterministic fallback policy for incomplete translations.

### The Risk

* **Bundle Bloat:** If a browser or embedded marine device (e.g., Signal K server, Raspberry Pi chartplotter) imports `@colregs/data`, forcing them to load 20 languages at once causes unnecessary memory and bandwidth usage.
* **Missing Key Crash:** If a localized key is missing in Spanish, the package should gracefully fall back to `es` (base) -> `en` (or official IMO English).

### Recommendation

1. **Modular Packaging:** Split locale files into dynamic loadable chunks/modules (e.g., `@colregs/data/locales/en.json`, `@colregs/data/locales/fr.json`).
2. **Explicit Fallback Policy:**

```
[Requested Locale: es-MX] ➔ [es] ➔ [en (Default IMO Source)]
```

3. **Type Safety:** Provide generated TypeScript definitions or JSON Schemas that enforce full coverage or mark fallback properties clearly.

---

## Actionable Checklist for PR Review

| Category | Item to Verify in Design Doc |
| --- | --- |
| **Jurisdiction** | Are language locales (`fr`, `es`) separated from regulatory authorities (`IMO`, `USCG`)? |
| **Data Integrity** | Are rule IDs, light patterns, and vessel states represented as invariant enums? |
| **Glossary** | Is there a unified domain terminology lexicon to ensure consistency across rules? |
| **Units** | Are numbers/units canonicalized rather than embedded in translated strings? |
| **Provenance** | Is metadata included to distinguish official IMO text from community translations? |
| **Package Size** | Can consumers import individual locales on-demand (tree-shaking/split JSON)? |
| **Fallbacks** | Is there a defined resolution chain when a locale string is missing? |
