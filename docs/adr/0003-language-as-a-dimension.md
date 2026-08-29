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
   provenance. Every corpus declares a **status tier**:

   | tier | meaning | examples |
   |---|---|---|
   | `authentic` | equally authentic treaty text | en and fr per the Convention |
   | `official` | translation deposited by / published through IMO | es, ru, ar, zh |
   | `national` | a state's legally binding published text | USCG amalgamation, Finlex, BOE |
   | `community` | informational translation, no legal standing | contributed |

   Tier is a property of the *source*, not the language — today's English
   text is `national` (USCG), and an `authentic` English corpus from the
   UNTS original can be added later beside it. REQ-MODEL-1's verbatim rule
   applies per corpus: text is verbatim from *its* source; a `community`
   corpus must record who produced and reviewed it, and machine output
   without named human review is not accepted.

3. **Display catalogs (UI strings, not law).** Per-language message
   catalogs keyed by stable string keys for the identifier vocabularies:
   light names, fact-axis value labels, modality labels, image captions.
   These are what a demo app renders in its UI; they deliberately do *not*
   share a file with legal corpora, because a UI label needs review for
   idiom, while legal text needs provenance and verbatimness. Maintainer
   `note` fields inside structural files remain untranslated working
   documentation, not display strings.

Corpora and catalogs are **additive**: adding a language changes no schema
and touches no existing file (the mirror of REQ-SCOPE-4 for jurisdictions).
Coverage is declared machine-readably — a manifest of which paragraph paths
each corpus contains — and CI checks every corpus key resolves to a
skeleton path. Partial corpora are legal and expected; silence never implies
coverage (the language analogue of REQ-SCOPE-6).

The package declares what exists and **never encodes a fallback policy**.
Which language to show, and what to do when a paragraph is missing from the
chosen corpus, is the consumer's call (the spirit of REQ-CONS-3).

### Sketch (illustrative, not binding on filenames)

```
data/rules.json                     # skeleton: paths, rule numbers, gaps
data/text/intl.en-US.uscg.json      # today's text, relabeled for what it is
data/text/intl.fr.unts.json         # authentic French, when licensed+landed
data/text/intl.fi.finlex.json       # Finnish national text, contributable
data/i18n/en.json                   # display catalog
data/i18n/fi.json
```

Authoritative metadata (jurisdiction, lang, tier, source, retrieved,
licence) lives *inside* each corpus file; the filename is a convenience.

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
  carry RTL text fine; rendering direction is a consumer concern and stays
  out of the data.
