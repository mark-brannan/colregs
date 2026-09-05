# Provenance

Everything in this package is transcribed or copied from US Government
publications. Nothing here is authoritative: consult the published rules.

## Rule text — `data/rules.json`

- **Source:** USCG Navigation Center, *Navigation Rules, International —
  Inland* (amalgamated), <https://www.navcen.uscg.gov/navigation-rules-amalgamated>
- **Retrieved:** 2026-09-04 (re-fetched to add Rules 1-19; originally 2026-08-29
  for Part C)
- **Scope:** the **International** text only, now covering Parts A and B
  (Rules 1-19) and Part C (Rules 20-31). The amalgamated page marks
  inland-only inserts and international-only variants inline; inland text was
  removed and international variants kept. Nothing was paraphrased.
- **Rights:** a work of the US Government, not subject to copyright in the
  United States (17 U.S.C. 105).
- **Known hole:** Rule 24(g)(i) is absent from the source page. Rather than
  reconstruct it from memory, `rules.json` records it under `gaps` and the
  paragraph is omitted. 24(g) covers inconspicuous, partly submerged tows and
  is outside the applicability table in this release.
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
