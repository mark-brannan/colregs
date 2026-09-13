# ADR 0013 — Rule text as corpus files under an edition registry (GATE-2 adopted)

Date: 2026-09-12
Status: proposed

## Context

ADR 0003 made language a dimension and sketched its layout, but nothing
landed, and its GATE-2 (an edition layer between instrument and corpus) is
due for re-take *before* the first non-English corpus. Finlex (`fi`) and BOE
(`es`) are both licence-clear (ADR 0001, 2026-09-12), so the next text to
land forces the key shape. This ADR fixes the keys and leaves the words for
issue #98. A sibling proposal (branch `multi-jurisdiction-schema`, option A)
confirms GATE-2 declined instead; the two are meant to be read side by side.

## Decision

1. **`data/rules.json` is the skeleton.** Per paragraph: `path`, `rule`,
   `jurisdiction`, `images`. No `text`, no `rule_title`, no source, and no
   amendment state of its own. It gains `24(g)(i)`: the Convention has the
   path; the USCG page lacks the words, which is the corpus's gap.
2. **`data/editions.json` is the registry: jurisdiction → instrument →
   editions.** An edition id is `<jurisdiction>@<tag>` (`intl@2016`,
   `us/inland@2014`), carrying `amended_through`, `in_force` and optionally
   `superseded_by`. Each jurisdiction names the edition the skeleton
   consolidates. Two editions of one jurisdiction may be registered at once,
   which is GATE-2's trigger case expressed as data rather than as a diff
   between strings.
3. **One file per corpus**,
   `data/text/<jurisdiction>/<tag>/<language>.<source_id>.json`, identity
   `<edition>.<language>.<source_id>`. A corpus names its `edition` and
   nothing about jurisdiction or amendment state: both are the edition's.
   CI checks the edition is registered and the filename agrees.
4. **A corpus paragraph is `rule_title` + `text`** (or ADR 0010's withheld
   fields). Corpus metadata otherwise as in option A: `tier`,
   `normalization`, `source` (REQ-PROV-6), `rights` (three statements),
   `gaps`, optional `translation_of`.
5. **`data/corpora.json` indexes the files**, derived and drift-checked.
6. **GATE-2 is re-taken and adopted.** The cost is one registry file and
   one extra path segment; the gain is that "which consolidated state" is an
   identifier compared by equality, not free text compared by eye, and a
   stub must name an edition before it names anything else.

## What the stubs show

Four corpora ship: `intl@2016.en-US.uscg` (today's text, moved verbatim),
`intl@2016.fi.finlex`, `intl@2016.es.boe` and `us/inland@2014.en-US.ecfr`,
the last three empty. The edition layer forces a claim option A lets a stub
defer: the Finnish and Spanish stubs assert they reflect `intl@2016` before
anyone has checked, and the `us/inland@2014` edition is recalled, not
verified, and says so. That is the honest cost of this option and the reason
to look at both.

## Consequences

- Breaking file layout (REQ-PKG-4): `data/rules.json` no longer carries
  text. colregs-engine's conformance research reads only `paragraphs` keys
  and is unaffected; anything reading `.text` moves to the en-US corpus.
- ADR 0010's withheld mechanics move to the corpus paragraph, where the
  text is; the skeleton has nothing to withhold.
- A new IMO amendment is a new registered edition, a new skeleton pointer,
  and new corpus files under a new directory; the old ones may stay until
  the last consumer moves, marked `superseded_by`. Under option A the same
  event is an in-place edit of every corpus's `amendment_state`.
- REQ-LANG-1, -3, -5, -9, -10 and REQ-PROV-6 move from unimplemented to
  implemented for the data on file; catalogs (REQ-LANG-6) are untouched.
- Landing Finnish or Spanish words is an edit to one file and one number in
  the index, and still waits on this ADR being accepted (REQ-GATE-2).
