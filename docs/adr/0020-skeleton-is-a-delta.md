# ADR 0020 — The skeleton is a delta too: a jurisdiction's paragraphs are a merge patch over `intl`

Date: 2026-09-17
Status: proposed — merging this PR is the ruling; a revert undoes it

## Context

ADR 0018 made the entries table a delta over `intl`. The skeleton was not
one. `data/rules.json` keyed every paragraph by bare path, one record per
key, and every one of them was `intl`; the corpus test asserted that a
corpus paragraph's path belongs to the corpus's own jurisdiction. So a
`us/inland` corpus could not carry `21(a)`: the key existed and was
`intl`'s. The 2026-08-30 diff of 33 CFR 83 against Part C found 18 paths
where Inland spells the same path with different text, three it does not
spell at all, and a dozen it adds. None of the 18 could be stated. That,
not a licence, is why the Inland corpus stub had no paragraphs (issue
#161), and why every planning session stalled on "the second jurisdiction".

Solace ruled on issue #137 on 2026-09-17: `us/inland`, Part C, before v1.

## Decision

1. **`rules.json` gains `deltas`, keyed by jurisdiction.** A delta has
   `paragraphs` (own rows, keyed by path, each carrying its jurisdiction)
   and `suppressions` (paths the source does not spell, each with a `why`).
   `paragraphs` at the top level stays the `intl` base, untouched, so every
   existing consumer reads what it read.

2. **A jurisdiction's resolved skeleton is the RFC 7396 merge patch of its
   delta over the base**, the same statement ADR 0018 makes for entries: own
   rows present, suppressed paths `null`, an unmentioned path inherited
   whole. A restated path merges field by field, so an own row that says
   nothing about `images` inherits the base figure. The test builds the
   patch, applies a literal RFC 7396 implementation, and asserts the
   resolved skeleton is what corpora, entries and fixtures key into.

3. **A path is stated in a delta when its text differs from `intl` or has no
   `intl` counterpart; suppressed when the source does not spell it; silent
   otherwise.** A `[Reserved]` section is a spelled path with reserved text,
   so it is stated, not suppressed: Inland `28` and `26(d)` are rows whose
   corpus text will be `[Reserved]`.

4. **An entry in force under a jurisdiction cites a path in that
   jurisdiction's resolved skeleton.** An inherited `intl` entry whose path
   the delta suppresses cannot stand by silence: it is tombstoned, and where
   the norm survives under another path, replaced (ADR 0018 point 3).

5. **`us/inland` lands with its Part C skeleton delta**, every row from
   `docs/verification/2026-08-30-q6-q8.md`: 19 restated paths (the 18
   differing plus `28`), 17 Inland-only paths, and `23(d)(i)`, `23(d)(ii)`,
   `23(d)(iii)` suppressed. Sub-paragraphs are stated only where the diff
   names them; `24(f)`'s Inland `(iii)` waits for the corpus, as `intl`'s
   own `24(f)` is one row. `NRHB_23_e.png` and `NRHB_24_j.png` are mapped to
   `23(e)` and `24(j)` and stop being unmapped.

6. **The first replace lands with it.** Inland 83.23(d) is the under-12 m
   provision as one paragraph; `23(d)(i)` is not a path there. Point 4
   forces the branch ADR 0018 left unexercised: `rule:23d_i` is tombstoned
   under `us/inland` and `rule:23d`, same predicate and lights, cites
   `23(d)`. Fixtures show both sides.

## Consequences

- The Inland corpus can now be filled: every path it will carry resolves.
  Text is 17 U.S.C. 105, so REQ-PROV-2 does not gate it. That is the next PR.
- `us/inland` is now seven applicability records and a skeleton delta of 39
  rows. README's coverage statement says so; it is still not a model of the
  Inland Rules until the entries for the restated paths land.
- The skeleton edition `us/inland@2014` is declared and still recalled, not
  verified against the Federal Register (REQ-LANG-10). The corpus fetch
  verifies it or corrects it.
- GATE-1 is untouched: a path that differs across jurisdictions at one time
  is REQ-MODEL-1 working as designed, and this ADR gives it a home.
- **Cost to reverse.** Delete `deltas` from data and schema, the resolver and
  three tests, `rule:23d` and its tombstone, two fixtures; unmap two images.
  No consumer reads `deltas` yet. Pre-1.0, a revert.
