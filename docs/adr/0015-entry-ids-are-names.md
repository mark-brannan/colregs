# ADR 0015 — Entry ids are names, not citations

Date: 2026-09-16
Status: proposed; accepted by the merge of the PR that carries it (#121, ruling C)

## Context

Every entry in `data/applicability.json` had an id derived from the
paragraph it cites: `24a-m2` was Rule 24(a)(i), second variant. Every other
identifier in the package is a name in a declared namespace
(`light:masthead`, `activity:nuc`, `rel:in_lieu_of`). Issue #121 laid out
what the exception cost: six pairs of entries sharing one cite and
distinguished only by a suffix, twenty-two suffixes doing three different
jobs with nothing saying which, and one rename already paid — `14a` became
`14b` when the package's reading of *which paragraph the entry cites*
moved from 14(a) to 14(b). Nothing about the entry changed.

Read by cost of change (the identifiers → API → data → architecture
ordering): an entry id is an identifier, the layer nobody outside this
repository can change. The `cite` is a data field, revised whenever the
package reads the Rules better. A data field inside an identifier means
the identifier is renamed every time the field is. The `14a` retirement
was that inversion paying out for the first time, and it would not have
been the last: every re-reading of a cite, every collapse or split of a
paragraph into entries, would have gone through `retired_entry_ids` and
the deprecation registry.

## Decision

1. **An entry id is `entry:<name>`**, name `[a-z][a-z0-9_]*`. It is a
   vocabulary identifier like the others, carries its namespace, and joins
   words with underscores like every other identifier here. The token was
   already in use: the deprecation registry keyed entries as `entry:14a`.
2. **A name says what the paragraph addresses**, in the words of the rule
   text or of this package's own vocabulary, and where one paragraph
   yields several entries, the axis the law splits them on:
   `entry:anchored`, `entry:towing_mastheads_long_tow`,
   `entry:power_gives_way_to_nuc`, `entry:being_overtaken`.
3. **A name never contains a field the entry carries.** The paragraph
   number is `cite`. The category is a field, and pencil under ADR 0005 —
   Rule 12 has already moved from `classification` to `precedence`, and a
   category prefix would have renamed three entries for it. Jurisdiction
   and modality are fields. The subject word (`own`) is fixed by
   construction: every entry is evaluated from own's side, so
   `entry:overtaking` / `entry:being_overtaken` say it without saying it.
4. **Numbers appear only where the Convention's own threshold is the sole
   thing separating siblings**: `entry:power_under_12m`,
   `entry:anchored_under_50m`. Where the law gives a word, the word wins:
   `long_tow`, not `m3`; `combined_lantern`, not `under_20m`.
5. **A display may be named by what a mariner calls it**:
   `entry:nuc_red_over_red`, `entry:trawling_green_over_white`. That is
   what the entry *is*, in the reader's own phrase. It is the one place a
   name describes the consequence, and it is chosen knowingly.
6. **The old ids are discarded, not deprecated.** The immutability
   baseline in REQ-MODEL-10 moves from `0.1.1` to `1.0.0`: pre-1.0 the
   schema is in design and an identifier may be renamed without a record.
   `retired_entry_ids` and `data/deprecated-identifiers.json` are emptied.
   The identifier-diff test is dormant until the first tag at or after
   the baseline.
7. **`represented_paragraphs` keep paragraph-derived ids** (`2a`). They are
   not entries, nothing references them, and they get their own schema
   definition so the entry pattern can tighten.

This departs from the #121 proposal on three points: no category prefix
(point 3), no `own-` in a name (point 3), underscores not hyphens (point
1). Each is the same reasoning — a name outlives every field on the entry.

## The names

| was | is | cite |
|---|---|---|
| `4` | `entry:any_visibility` | 4 |
| `11` | `entry:in_sight` | 11 |
| `28` | `entry:cbd` | 28 |
| `23a1` | `entry:power_forward_masthead` | 23(a)(i) |
| `23a2` | `entry:power_second_masthead` | 23(a)(ii) |
| `23a34` | `entry:power_sidelights_sternlight` | 23(a)(iii)-(iv) |
| `23b` | `entry:air_cushion_non_displacement` | 23(b) |
| `23c` | `entry:wig_near_surface` | 23(c) |
| `23d1` | `entry:power_under_12m` | 23(d)(i) |
| `23d2` | `entry:power_under_7m_slow` | 23(d)(ii) |
| `24a-m2` | `entry:towing_mastheads` | 24(a)(i) |
| `24a-m3` | `entry:towing_mastheads_long_tow` | 24(a)(i) |
| `24a-rest` | `entry:towing_light` | 24(a)(ii)-(iv) |
| `24b` | `entry:pushing_composite_unit` | 24(b) |
| `24c` | `entry:pushing_ahead_or_alongside` | 24(c) |
| `24e` | `entry:being_towed` | 24(e) |
| `25a` | `entry:sail_sidelights_sternlight` | 25(a) |
| `25b` | `entry:sail_combined_lantern` | 25(b) |
| `25c` | `entry:sail_red_over_green` | 25(c) |
| `25d1` | `entry:sail_under_7m` | 25(d)(i) |
| `25d2` | `entry:under_oars` | 25(d)(ii) |
| `26b-id` | `entry:trawling_green_over_white` | 26(b)(i) |
| `26b-mast` | `entry:trawling_masthead` | 26(b)(ii) |
| `26b-mw` | `entry:trawling_making_way` | 26(b)(iii) |
| `26c-id` | `entry:fishing_red_over_white` | 26(c)(i) |
| `26c-gear` | `entry:fishing_outlying_gear` | 26(c)(ii) |
| `26c-mw` | `entry:fishing_making_way` | 26(c)(iii) |
| `27a-id` | `entry:nuc_red_over_red` | 27(a)(i) |
| `27a-mw` | `entry:nuc_making_way` | 27(a)(iii) |
| `27b-id` | `entry:ram_red_white_red` | 27(b)(i) |
| `27b-mw` | `entry:ram_making_way` | 27(b)(iii) |
| `27b-anc` | `entry:ram_anchored` | 27(b)(iv) |
| `27d` | `entry:ram_underwater_obstruction` | 27(d) |
| `27e` | `entry:diving` | 27(e)(i) |
| `27f` | `entry:mine_clearance` | 27(f) |
| `29a` | `entry:pilot` | 29(a) |
| `30a` | `entry:anchored` | 30(a) |
| `30b` | `entry:anchored_under_50m` | 30(b) |
| `30c` | `entry:anchored_deck_lights` | 30(c) |
| `30d-anchor` | `entry:aground_anchor_lights` | 30(d) |
| `30d-red` | `entry:aground_red_over_red` | 30(d) |
| `30e` | `entry:anchored_under_7m_not_near_channel` | 30(e) |
| `30a-buoy` | `entry:mooring_buoy` | 30(a) |
| `30b-buoy` | `entry:mooring_buoy_under_50m` | 30(b) |
| `19a` | `entry:restricted_visibility` | 19(a) |
| `18a1` | `entry:power_gives_way_to_nuc` | 18(a)(i) |
| `18a2` | `entry:power_gives_way_to_ram` | 18(a)(ii) |
| `18a3` | `entry:power_gives_way_to_fishing` | 18(a)(iii) |
| `18a4` | `entry:power_gives_way_to_sail` | 18(a)(iv) |
| `18b1` | `entry:sail_gives_way_to_nuc` | 18(b)(i) |
| `18b2` | `entry:sail_gives_way_to_ram` | 18(b)(ii) |
| `18b3` | `entry:sail_gives_way_to_fishing` | 18(b)(iii) |
| `18c1` | `entry:fishing_gives_way_to_nuc` | 18(c)(i) |
| `18c2` | `entry:fishing_gives_way_to_ram` | 18(c)(ii) |
| `18d1` | `entry:avoid_impeding_cbd` | 18(d)(i) |
| `18f1` | `entry:wig_keeps_well_clear` | 18(f)(i) |
| `8f3` | `entry:not_impeded_remains_obliged` | 8(f)(iii) |
| `13a` | `entry:overtaking_gives_way` | 13(a) |
| `9b` | `entry:narrow_channel_small_or_sail` | 9(b) |
| `9c` | `entry:narrow_channel_fishing` | 9(c) |
| `10i` | `entry:traffic_lane_fishing` | 10(i) |
| `10j` | `entry:traffic_lane_small_or_sail` | 10(j) |
| `7d1` | `entry:steady_bearing` | 7(d)(i) |
| `12a1` | `entry:sail_port_tack_gives_way` | 12(a)(i) |
| `12a2` | `entry:sail_windward_gives_way` | 12(a)(ii) |
| `12a3` | `entry:sail_port_tack_uncertain_gives_way` | 12(a)(iii) |
| `13b-overtaking` | `entry:overtaking` | 13(b) |
| `13b-overtaken` | `entry:being_overtaken` | 13(b) |
| `13d` | `entry:overtaking_until_past_and_clear` | 13(d) |
| `14b` | `entry:head_on` | 14(b) |
| `15a-crossing` | `entry:crossing` | 15(a) |
| `15a-give-way` | `entry:crossing_gives_way` | 15(a) |

## Consequences

- One pass, one commit: `data/applicability.json` (ids, every `rel:*`
  list, `retired_entry_ids`), both fixture files, `data/geometry.json`,
  `data/images.json`, the schemas, the suite, and the living docs.
  Earlier ADRs cite entries by their old ids; the table above is the map,
  and it stays in this file permanently.
- A consumer holding an id from `v0.3.0` or earlier resolves it here, not
  in the deprecation registry. There is no such consumer on 2026-09-16:
  colregs-engine's main checkout holds no entry id.
- The encounter and role vocabularies keep their hyphens (`head-on`,
  `give-way`); they are not identifiers, and were already spelled
  differently from the identifier space. `entry:head_on` beside
  `encounter: "head-on"` is that difference made visible.
- A jurisdiction delta that overrides an `intl` entry names its
  difference, not its jurisdiction: `entry:mooring_buoy`, because the
  mooring buoy is what 33 CFR 90.5 adds. The field says `us/inland`.
- Whether the subject segment is `own` or `self` is a separate question
  and is not decided here; no entry name depends on the answer.
