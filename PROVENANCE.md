# Provenance

Everything in this package is transcribed or copied from US Government
publications. Nothing here is authoritative: consult the published rules.

## Rule text — `data/text/intl/2016/en-US.uscg.json`

- **Source:** USCG Navigation Center, *Navigation Rules, International —
  Inland* (amalgamated), <https://www.navcen.uscg.gov/navigation-rules-amalgamated>
- **Retrieved:** 2026-09-17 (re-fetched to add Part D; 2026-09-04 for Rules
  1-19; originally 2026-08-29 for Part C)
- **Scope:** the **International** text only, covering Parts A and B
  (Rules 1-19), Part C (Rules 20-31) and Part D (Rules 32-37). The
  amalgamated page marks inland-only inserts and international-only variants
  inline; inland text was removed and international variants kept. Nothing
  was paraphrased. Rule 35(l) is Inland-only and absent for that reason, as
  are Rule 34(g) and 34(h).
- **Rights:** a work of the US Government, not subject to copyright in the
  United States (17 U.S.C. 105).
- **Known hole:** Rule 24(g)(i) is absent from the source page. Rather than
  reconstruct it from memory, the corpus records it under `gaps` and carries
  no text for it; the skeleton still has the path. 24(g) covers inconspicuous, partly submerged tows and
  is outside the applicability table in this release.
- **Withheld text is not a gap.** A `gaps` entry is a paragraph we could not
  obtain. A paragraph with `text_status: withheld` is one we hold but may not
  publish, under a licence bar recorded in `withheld_reason` — see ADR 0010.
  None exist yet; `intl` is entirely verbatim.
- **Known quirks kept verbatim:** the source's own text of Rule 1(c) repeats
  "special rules ... special rules made" and Rule 13(b) reads "coming up with
  a another vessel" (sic), and Rule 10(c) reads "A vessel, shall so far as
  practicable, avoid crossing traffic lanes" — comma placement that doesn't
  match the official COLREGS text. All three are transcribed exactly as the
  source HTML has them rather than silently corrected; confirmed by
  re-fetching and grepping the raw source HTML directly (not the rendered
  page) on 2026-09-05. Rule 3(l)'s quoted term ("restricted visibility") is
  also curly in the source and transcribed as such — that part of this note
  previously and incorrectly claimed it was the only curly-quoted term in the
  corpus; Rule 3(m)'s quoted term (“Wing-In-Ground (WIG)”, with `craft`
  outside the quotes) is the other, corrected to match the source on
  2026-09-05 after having been transcribed with straight quotes and `craft`
  inside the term.
- **Part D's Rule 34 is a two-column table, not prose.** Rules 32, 33 and
  35-37 run as prose on the source page; Rule 34 lays the International and
  Inland texts side by side, and splits each blast and its meaning across
  separate rows, some of which span both columns. The International column
  was read cell by cell out of the raw HTML and rejoined, keeping the
  source's own en-dash as the separator between list items so that no
  punctuation was introduced. 34(b)'s `(i)`-`(iii)` and 34(c)'s `(i)`-`(ii)`
  are their own paragraph paths; the unnumbered blast items are inlined into
  the paragraph that introduces them, as Rule 30(a)'s are.
- **Two defects in the source's Rule 34(a), kept verbatim:** it reads "When
  vessels are in sight of one," where the published COLREGS text reads "of
  one another", and "One short blasts to mean" where the signal is one blast.
  Both are transcribed as the source HTML has them rather than silently
  corrected, on the same principle as the Rule 1(c) and 13(b) quirks above.
  A reader who needs 34(a) should consult the published rules; this is the
  clearest case in the corpus of why the note at the top of this file is
  there.
- **Inland-only inserts deliberately absent:** the source marks Inland
  text with `‹‹ ››`. Rule 21(a) and 21(b)'s "vessel of less than 12 meters
  … as nearly as practicable to the fore and aft centerline" clauses and
  Rule 23(b)'s "where it can best be seen" are such inserts and are not in
  `rules.json`; Rule 29(b)'s "similar" is in the International text and is
  kept. Verified 2026-09-05 against the raw source HTML, 33 CFR 83 (eCFR)
  and the 1972 treaty text (UNTS Vol. 1050) — see
  `docs/verification/2026-08-30-q6-q8.md`, Claim 1 correction.

## Diagrams — `images/NRHB_*.png`

- **Source:** the same USCG page, at
  `https://www.navcen.uscg.gov/sites/default/files/images/navrules/<name>`
- **Retrieved:** 2026-08-29 — fetched from the live USCG server, not scanned
  from the PDF handbook and not recovered from an archive.
- **Rights:** US Government work, public domain (17 U.S.C. 105).
- Per-file URL, byte count, SHA-256 and pixel dimensions are recorded in
  `data/images.json`, along with the USCG's own caption text and the
  paragraphs and applicability entries each image illustrates.

Two of the 38 (`NRHB_25_b.png`, `NRHB_27_ei.png`) are served by the USCG but
not linked from the page; they were fetched by name. Two more
(`NRHB_23_e.png`, `NRHB_24_j.png`) illustrate Great Lakes and Western Rivers
paragraphs and are unmapped in this international-only release — they are kept
because the `us/inland` jurisdiction will want them.

### The `NR_*` / `NRHB_*` prefix question, resolved

`mark-brannan/signalk-auto-nav-lights` carried images under two prefixes with
no provenance recorded. `NR_25_b.png` and `NR_27_ei.png` are the same two
diagrams the USCG now serves as `NRHB_25_b.png` and `NRHB_27_ei.png` — an
older filename for the same images, not a different source. This package uses
the current USCG names throughout.

## Arc diagrams — `images/*arc.gif`

- **Source:** USCG Navigation Center, *Navigation Rules Arcs of Visibility*,
  <https://www.navcen.uscg.gov/navigation-rules-arcs-of-visibility>, which
  serves the five files at
  `https://www.navcen.uscg.gov/sites/default/files/images/nr_pics/Arcs/<name>`
  as the rollover states of its Rule 21/22 diagram.
- **Retrieved:** 2026-09-05 — fetched from the live USCG server and compared
  byte-for-byte (`cmp` and SHA-256) against the copies carried over from
  `signalk-auto-nav-lights`: identical, all five.
- **Rights:** US Government work, public domain (17 U.S.C. 105).
- Captions are the page's own image-map `alt` text; each file is mapped to
  the Rule 21 definition it illustrates (`21(a)` masthead, `21(b)`
  sidelights, `21(c)` sternlight, `21(d)` towing light, plus `24(a)(iv)`
  for the towing light's placement).

The same filenames existed on the pre-Drupal site under
`navcen.uscg.gov/mwv/navrules/` (Wayback has `mastheadarc.gif` from
2004-10-15), which is why an earlier release could not locate the page and
recorded them as unresolved. They remain decorative: the arcs themselves are
data, in `data/lights.json` under each light's `arc`.

## SignalK paths

`data/facts.json` records which SignalK path, if any, publishes each fact.
Verified 2026-08-29 against the installed `@signalk/signalk-schema`
(`schemas/groups/navigation.json`, `schemas/groups/design.json`). The
`navigation.state` enum values in the decode table are copied verbatim from
that schema, spelling included.
