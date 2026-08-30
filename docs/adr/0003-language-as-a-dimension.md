# ADR 0003 — Language as a dimension, text corpora, and display catalogs

Date: 2026-08-29
Status: proposed

## Context

COLREGS is not an English-language document with translations. The 1972
Convention was done in English and French, **both texts equally authentic**,
with official Spanish and Russian translations deposited alongside the
original; Arabic and Chinese texts exist because they are IMO official
languages and the consolidated editions are published in all six. On top of
that, many states gazette their own translation as legally binding national
law (Finland via Finlex, Germany, Spain via the BOE, …). A package that
treats English as the text and everything else as decoration has the legal
reality backwards. (Each of these claims must still be verified against the
primary source before the corresponding text lands — REQ-PROV-2 applies to
languages exactly as it does to jurisdictions; see Q-6/Q-7.)

The current `data/rules.json` already demonstrates the problem. Its text is
the **USCG amalgamated rendition** of the international rules, with US
spelling — "maneuver" where the authentic treaty English reads "manoeuvre".
So the repo today holds a *national-tier, en-US* corpus of the *intl*
jurisdiction's rules. "Which jurisdiction's rules" and "which text of them"
are demonstrably independent questions, and the file-format conflates them:
`text` is a bare string with one file-level source.

Non-legal strings have the same problem one layer down: light names,
placement prose, and fact-axis labels are inline English inside files the
requirements call language-neutral.

There is also a downstream motive: SignalK's contributor base is heavily
non-US (Finland especially), and consumers of this package — the educational
app in particular — will want localized UI in markets that are maritime
nations first and English-speaking second. The data model should make a
community-contributed language a single additive pull request.

## Decision

**Language is a first-class dimension orthogonal to jurisdiction**, tagged
with BCP 47 codes, structured as three layers:

1. **Structural skeleton (language-neutral).** Paragraph paths, rule
   numbers, jurisdictions, entry ids, fact values, light ids, relations,
   predicates, fixtures. None of this ever translates. Translations attach
   to identifiers; they never replace them.

2. **Rule-text corpora (legal text).** One corpus per
   (jurisdiction × language × source), keyed by the same paragraph paths as
   the skeleton, carrying `text` and `rule_title` plus corpus-level
   provenance. "Corpus" is the term, not "translation": a corpus may be an
   original text, an official translation, or an independently promulgated
   national instrument — where one is in fact a translation of another,
   that is recorded as explicit `translation_of` metadata. `rule_title` is
   verbatim source material like `text`, not a UI string. Every corpus declares a **status tier**:

   | tier | meaning | examples |
   |---|---|---|
   | `authentic` | identified by the governing instrument *itself* as an equally authentic text — the instrument's claim, never this repo's assessment | en and fr per the Convention |
   | `official` | official translation published or deposited through the instrument's depositary organization | es, ru, ar, zh |
   | `national` | a state's legally binding published text | USCG amalgamation, Finlex, BOE |
   | `community` | informational translation, no legal standing | contributed |

   Tier is a property of the *source*, not the language — today's English
   text is `national` (USCG), and an `authentic` English corpus from the
   UNTS original can be added later beside it. The tier deliberately ranks
   *legal authority*; translation provenance (who translated, reviewed,
   from what) is separate structured metadata on the corpus, not folded
   into the tier. A corpus holds at most one text per paragraph path.
   REQ-MODEL-1's verbatim rule applies per corpus: text is verbatim from
   *its* source at the Unicode level (declared normalization form, no bidi
   control insertion, no localized numerals or punctuation — REQ-LANG-9);
   a `community` corpus must record who produced and reviewed it, and
   machine output without named human review is not accepted.

   **Amendment state, not a temporal model.** COLREGS has been amended
   repeatedly (Rule 23(c)'s WIG craft arrived in 2001), and national texts
   consolidate on their own schedules. The package models the *current
   consolidated state*: the skeleton declares, as data, the amendment state
   it consolidates, and every corpus declares the amendment state its
   source reflects (REQ-LANG-10). A mismatch is legitimate but
   machine-visible — declared staleness, never silence. Historical states
   are prior package versions, not an in-data version dimension. A
   renumbering amendment is a major version under REQ-PKG-4 — but it is
   resolved by *issuing new paragraph paths and deprecating the old ones*
   (REQ-MODEL-10/11), never by repointing an existing path at different
   text. Repointing is forbidden outright: no version signal expresses it,
   so a consumer cannot detect it.

3. **Display catalogs (UI strings, not law).** Per-language message
   catalogs keyed by stable string keys for the identifier vocabularies:
   light names, fact-axis value labels, modality labels, image captions.
   These are what a demo app renders in its UI; they deliberately do *not*
   share a file with legal corpora, because a UI label needs review for
   idiom, while legal text needs provenance and verbatimness. Catalog
   entries are **static strings** — no interpolation, plurals or gender
   grammar; message composition belongs to the consumer's i18n system
   (ICU, gettext, whatever), and this package will not grow a homemade
   one. Catalogs carry lightweight provenance (contributors, reviewers,
   review date, licence): maritime terminology is load-bearing even in a
   UI label, and a translation of a public-domain instrument still has a
   translator holding rights. Maintainer `note` fields inside structural
   files remain untranslated working documentation — not display strings,
   not part of the localization surface.

Corpora and catalogs are **additive**: adding a language changes no schema
and does not edit existing corpora or catalogs (the mirror of REQ-SCOPE-4
for jurisdictions); required coverage manifests and release documentation
update as needed.
Coverage is declared machine-readably — a manifest of which paragraph paths
each corpus contains — and CI checks every corpus key resolves to a
skeleton path. Partial corpora are legal and expected; silence never implies
coverage (the language analogue of REQ-SCOPE-6).

The package declares what exists and **never encodes a fallback policy,
and never silently substitutes one corpus for another**. Text is only
addressable inside a corpus, so anything a consumer retrieves is
attributable; a consumer may assemble a mixed-corpus view (Finnish where it
exists, English where it doesn't), but a mixed view is never a single
authoritative edition, and the docs say so. Which language to show, and
what to do when a paragraph is missing from the chosen corpus, is the
consumer's call (the spirit of REQ-CONS-3).

### Sketch (illustrative, not binding on filenames)

```text
data/rules.json                     # skeleton: paths, rule numbers, gaps
data/text/intl.en-US.uscg.json      # today's text, relabeled for what it is
data/text/intl.fr.unts.json         # authentic French, when licensed+landed
data/text/intl.fi.finlex.json       # Finnish national text, contributable
data/i18n/en.json                   # display catalog
data/i18n/fi.json
```

Authoritative metadata lives *inside* each corpus file; the filename is a
convenience, and CI checks the two agree. Source identity is structured
(publisher, title, edition, publication/effective dates, URL, retrieved —
REQ-PROV-6), with rights recorded separately for the source text, the basis
for redistribution, and the package's own distribution licence. The BCP 47
tag carries the language of the text and nothing else — `en-US` on the
USCG corpus means US-spelled English, not "US law" and not "for US users";
provenance and legal applicability live in the metadata, never in the tag.

## Sequencing

Nothing lands with this ADR. The order later:

1. Split `data/rules.json` into skeleton + the existing text as an
   `intl / en-US / uscg / national` corpus. Pure refactor, fixtures
   untouched (they never contained text).
2. Extract display catalogs for the existing identifier vocabularies (en).
3. First non-English corpus — chosen by which licence check under Q-6/Q-7
   clears first, not by market size. French (authentic, UNTS) and Finnish
   (national, Finlex) are the likely front of the queue.
4. Community-contribution path documented in README (one corpus file + one
   catalog file per PR).

## Consequences

- REQ-PROV-2's licence gate applies per corpus. The IMO consolidated
  six-language editions are sold publications and likely **not**
  reproducible; national gazettes and the UNTS deposit are the probable
  lawful sources. This — not translation effort — is the sequencing
  constraint, recorded as Q-6/Q-7.
- The README coverage statement (REQ-SCOPE-6) gains a language column:
  jurisdictions × parts × languages, each with its tier.
- `data/rules.json` as published today is unaffected until step 1 of the
  sequencing lands; the split is a breaking change to the published file
  layout and versions accordingly (REQ-PKG-4).
- Arabic makes the corpora bidirectional-text-bearing. Plain JSON strings
  carry RTL text fine; the data layer never inserts or strips bidi control
  characters (REQ-LANG-9), and rendering direction is a consumer concern
  that stays out of the data.

## Considered and declined (external review, 2026-08-29)

Two external reviews (PR #4 comments) shaped the revision above. What they
changed: tag-carries-language-only, tier definitions as legal claims,
amendment-state declaration, one-text-per-path, static catalogs with
provenance, Unicode-level verbatimness, structured source identity with the
three-rights split, no-silent-substitution phrasing, filename/metadata CI
check. What was declined, and why — recorded so it isn't re-argued:

- **A CI-enforced terminology glossary for translations.** (GATE-5) For legal
  corpora it contradicts verbatimness: the source says what it says, and
  if a national text uses inconsistent terms, so does our copy. A glossary
  as *contributor guidance* for display catalogs may come with the
  contribution docs; it is not schema and not CI.
- **ICU MessageFormat / interpolation in catalogs.** This is a data
  package, not an i18n runtime. Static labels only; a homegrown message
  system incompatible with real i18n libraries is the failure mode, not
  the feature.
- **A package-encoded fallback chain** (e.g. `es-MX → es → en`; GATE-4).
  Encoding a preferred substitute for legal text is exactly the
  preference-taking REQ-CONS-3 forbids elsewhere. The stronger, narrower
  rule replaced it: no silent substitution, full attributability, consumer
  decides.
- **Splitting `paragraph_id` from `citation_path`.** (GATE-1) The paragraph
  path *is* the shared citation across the treaty languages and the
  harmonised national texts (ADR 0001); a second synthetic id would double
  every cross-reference for a renumbering event that is rare, already a
  major version under REQ-PKG-4, and resolvable by deprecation rather than
  repointing (REQ-MODEL-10). Accepted risk, revisit only when a real
  renumbering lands — or when Q-8's check of the first national
  amalgamation shows paragraph paths do not survive it.
- **A full temporal/legal-version model** (instrument → edition → corpus as
  first-class layers; GATE-2). The package models current consolidated law;
  history lives in package versions. The cheap 80% — declared amendment
  state on skeleton and corpus, machine-visible mismatch — is adopted
  instead. If a jurisdiction ever requires multiple concurrent editions,
  that is a new ADR.
- **`dir: ltr|rtl` metadata per language.** Derivable from the language
  tag via CLDR by any consumer that needs it; storing it invites drift.

Four of these are declined *for now* rather than on principle, and the
difference matters: each is recorded in requirements §10 as a timed gate,
with the event that ends its cheap reversibility and the fact that would
reopen it. GATE-1 (the `paragraph_id` split) is the one that must be
re-taken deliberately before 1.0; GATE-3 covers the half-adopted
legal-status × translation-status split.
