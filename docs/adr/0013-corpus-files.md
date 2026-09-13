# ADR 0013 — Rule text as corpus files, keyed (jurisdiction × language × source)

Date: 2026-09-12
Status: proposed

## Context

ADR 0003 made language a dimension and sketched its layout, but nothing
landed, and its GATE-2 (an edition layer between instrument and corpus) is
due for re-take *before* the first non-English corpus. Finlex (`fi`) and BOE
(`es`) are both licence-clear (ADR 0001, 2026-09-12), so the next text to
land forces the key shape. This ADR fixes the keys and leaves the words for
issue #98. A sibling proposal (ADR 0013-alt, branch `corpus-editions-layer`)
adopts GATE-2 instead; the two are meant to be read side by side.

## Decision

1. **`data/rules.json` is the skeleton.** Per paragraph: `path`, `rule`,
   `jurisdiction`, `images`. No `text`, no `rule_title`, no source. It
   declares, per jurisdiction, the `amendment_state` it consolidates
   (REQ-LANG-10). It gains `24(g)(i)`: the Convention has the path; the
   USCG page lacks the words, which is the corpus's gap, not the skeleton's.
2. **One file per corpus**, `data/text/<jurisdiction>/<language>.<source_id>.json`,
   identity `<jurisdiction>.<language>.<source_id>` inside the file. The
   filename is a convenience; CI checks it agrees with the metadata.
3. **A corpus paragraph is `rule_title` + `text`** (or ADR 0010's withheld
   fields). Everything structural stays in the skeleton, so a corpus is small
   and a community contribution is one file.
4. **Corpus metadata** is the ADR 0003 list, structured: `tier`,
   `normalization`, `amendment_state` (`amended_through`, `in_force`; free
   text for the instrument because national amalgamations cite their own
   amending acts), `source` (REQ-PROV-6), `rights` (three statements, never
   one flat licence), `gaps`, optional `translation_of`.
5. **`data/corpora.json` indexes the files** for consumers that cannot list
   a directory. It is derived, and the test fails on drift.
6. **GATE-2 is re-taken and confirmed declined.** Concurrent editions are
   expressed by two corpora of one jurisdiction with different
   `amendment_state`; the comparison is machine-visible, which is the 80%
   REQ-LANG-10 asked for. An edition registry would be a third file whose
   only job is to name a string both sides already carry.

## What the stubs show

Four corpora ship with this ADR: `intl.en-US.uscg` (today's text, moved
verbatim), `intl.fi.finlex`, `intl.es.boe` and `us/inland.en-US.ecfr`, the
last three empty. Two languages of one jurisdiction and one language of two
jurisdictions is the smallest set that exercises both axes. An empty stub may
leave `amendment_state` and `retrieved` null; a corpus with text may not.
The `es` stub records that its BOE instrument id is not yet located.

## Consequences

- Breaking file layout (REQ-PKG-4): `data/rules.json` no longer carries
  text. colregs-engine's conformance research reads only `paragraphs` keys
  and is unaffected; anything reading `.text` moves to the en-US corpus.
- The withheld mechanics of ADR 0010 move to the corpus paragraph, where the
  text is; the skeleton has nothing to withhold.
- REQ-LANG-1, -3, -5, -9, -10 and REQ-PROV-6 move from unimplemented to
  implemented for the data on file; catalogs (REQ-LANG-6) are untouched.
- Landing Finnish or Spanish words is now an edit to one file and one number
  in the index, and still waits on this ADR being accepted (REQ-GATE-2).
