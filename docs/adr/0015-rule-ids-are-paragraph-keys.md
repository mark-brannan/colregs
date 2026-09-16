# ADR 0015 — Rule ids are paragraph keys in the `rule:` namespace

Date: 2026-09-16
Status: accepted — Solace's ruling, 2026-09-16

## Context

Issue #121 asked what an applicability entry should be called, and ruling C
was read as *names, not citations*. The first draft of this ADR wrote that
reading out: every id became a coined name in an `entry:` namespace —
`entry:anchored`, `entry:towing_mastheads_long_tow`, `entry:being_overtaken`.
It never landed and never shipped. Solace superseded that reading on
2026-09-16 and this file is the replacement.

What the rename was buying was insulation: `cite` is a data field, revised
whenever the package reads the Rules better, and `14a` had already become
`14b` when the reading of *which paragraph deems a head-on* moved. An
identifier containing a data field gets renamed every time the field is.

What it cost is the vocabulary. An entry is a norm out of the Convention,
and the people who read these ids — and the consumers that store them
alongside a `cite` anyway — already have a name for every norm in the
package: the Rule. `rule:13b` is *Rule 13(b)* in the mariner's mouth. A
coined name is a second vocabulary beside that one, invented here,
unguessable from the Rules, and needing a lookup in this file to be read
back as the paragraph it came from. The insulation is worth one rename in
a pre-1.0 package; the second vocabulary is permanent. Ruled by Solace,
2026-09-16.

## Decision

1. **The namespace noun is `rule:`.** It replaces `entry:` everywhere. The
   overload with the Convention's Rules is the point, not an accident to
   be designed around.
2. **An id is `rule:<paragraph-slug>`.** The slug is the cite with its
   punctuation dropped: rule number, paragraph letter attached, each roman
   subparagraph joined by `_`. `27(a)(i)` → `27a_i`; `13(b)` → `13b`;
   `11` → `11`; `23(a)(iii)-(iv)` → `23a_iii_iv`.
3. **A bare id is the paragraph's principal norm.** Where the text yields
   a further norm from the same paragraph, it takes a third segment after
   a colon, named in the text's own words: `rule:24a_i` is 24(a)(i)'s two
   masthead lights and `rule:24a_i:exceeds_200m` its three, the threshold
   being the Convention's own, which is when a number may appear in a name.
4. **Where one sentence fuses a deeming test and a duty, both norms are
   named.** 15(a) gives `rule:15a:crossing` — the classification, effect
   `encounter: crossing` — and `rule:15a:keep_out_of_the_way` — the
   precedence, own give-way. `avoid_crossing_ahead` is reserved for 15(a)'s
   second duty when the `conduct` shape exists; it is not in use.
5. **A Convention subparagraph keeps its own cite.** 30(d)'s chapeau is
   `rule:30d`, citing `30(d)`, importing the 30(a)/(b) anchor lights,
   modality `shall`; the two all-round red lights are `rule:30d_i`, citing
   `30(d)(i)`, modality `shall-if-practicable` because the paragraph says
   "if practicable". `30(d)(i)` joins `rules.json` as a skeleton path with
   this change. `rule:30d_ii` is reserved for the three balls, and lands
   when day shapes do.
6. **A jurisdiction override is named by its difference**, and jurisdiction
   stays a field: `rule:30a:mooring_buoy` and `rule:30b:mooring_buoy`, both
   `us/inland`. The name says what 33 CFR 90.5 adds, not who adds it.
7. **13(b) is one symmetric entry.** The two entries that preceded it were
   identical but for which subject's `geo:rel_bearing_deg` fell in
   (112.5, 247.5), and both produced `encounter: overtaking`. `rule:13b`
   reads the same sector object on either subject under `any_of` — the
   pattern 13(d) already used over `hist:was_overtaking` — because the
   encounter type belongs to the pair. One paragraph, one norm, one id.
8. **Every other entry with a unique cite takes the bare slug of it.**
9. **`represented_paragraphs` ids take the prefix too** — `2a` becomes
   `rule:2a` — and keep their own list. They no longer need a schema
   definition of their own: the id pattern is the same one.
10. **The schema pattern is**
    `^rule:[0-9]+[a-z]?(_[ivx]+)*(:[a-z][a-z0-9_]*)?$`.
    **An id is opaque to a consumer.** It looks like a citation and is not
    one: a consumer that wants the paragraph reads `cite`, and never splits
    the id to find it. The resemblance is for the human reading a trace;
    the `cite` field is the machine-readable link to the Convention, and it
    is the field that moves when the package's reading of a paragraph moves.
11. **The identifier-diff mechanism is removed, not left dormant.**
    `retired_entry_ids`, `data/deprecated-identifiers.json`, its schema, the
    dormant diff test and the retired-id half of the REQ-MODEL-10 collision
    test all go. Nothing pre-1.0 is immutable, so there was nothing for the
    registry to hold and no diff for the test to run; a mechanism that
    cannot fire is a mechanism nobody maintains. It returns, if at all, with
    the 1.0.0 tag that REQ-MODEL-10's baseline names. Ruled by Solace,
    2026-09-16.

## The names

`was` is the `entry:` name from the superseded draft of this ADR, which
shipped in no release. The citation-derived ids that preceded *it* —
`24a-m2`, `23a1`, `30d-red` — were never names either and are not carried
forward.

| was | is | cite |
|---|---|---|
| `entry:power_forward_masthead` | `rule:23a_i` | 23(a)(i) |
| `entry:power_second_masthead` | `rule:23a_ii` | 23(a)(ii) |
| `entry:power_sidelights_sternlight` | `rule:23a_iii_iv` | 23(a)(iii)-(iv) |
| `entry:air_cushion_non_displacement` | `rule:23b` | 23(b) |
| `entry:wig_near_surface` | `rule:23c` | 23(c) |
| `entry:power_under_12m` | `rule:23d_i` | 23(d)(i) |
| `entry:power_under_7m_slow` | `rule:23d_ii` | 23(d)(ii) |
| `entry:towing_mastheads` | `rule:24a_i` | 24(a)(i) |
| `entry:towing_mastheads_long_tow` | `rule:24a_i:exceeds_200m` | 24(a)(i) |
| `entry:towing_light` | `rule:24a_ii_iv` | 24(a)(ii)-(iv) |
| `entry:pushing_composite_unit` | `rule:24b` | 24(b) |
| `entry:pushing_ahead_or_alongside` | `rule:24c` | 24(c) |
| `entry:being_towed` | `rule:24e` | 24(e) |
| `entry:sail_sidelights_sternlight` | `rule:25a` | 25(a) |
| `entry:sail_combined_lantern` | `rule:25b` | 25(b) |
| `entry:sail_red_over_green` | `rule:25c` | 25(c) |
| `entry:sail_under_7m` | `rule:25d_i` | 25(d)(i) |
| `entry:under_oars` | `rule:25d_ii` | 25(d)(ii) |
| `entry:trawling_green_over_white` | `rule:26b_i` | 26(b)(i) |
| `entry:trawling_masthead` | `rule:26b_ii` | 26(b)(ii) |
| `entry:trawling_making_way` | `rule:26b_iii` | 26(b)(iii) |
| `entry:fishing_red_over_white` | `rule:26c_i` | 26(c)(i) |
| `entry:fishing_outlying_gear` | `rule:26c_ii` | 26(c)(ii) |
| `entry:fishing_making_way` | `rule:26c_iii` | 26(c)(iii) |
| `entry:nuc_red_over_red` | `rule:27a_i` | 27(a)(i) |
| `entry:nuc_making_way` | `rule:27a_iii` | 27(a)(iii) |
| `entry:ram_red_white_red` | `rule:27b_i` | 27(b)(i) |
| `entry:ram_making_way` | `rule:27b_iii` | 27(b)(iii) |
| `entry:ram_anchored` | `rule:27b_iv` | 27(b)(iv) |
| `entry:ram_underwater_obstruction` | `rule:27d` | 27(d) |
| `entry:diving` | `rule:27e_i` | 27(e)(i) |
| `entry:mine_clearance` | `rule:27f` | 27(f) |
| `entry:cbd` | `rule:28` | 28 |
| `entry:pilot` | `rule:29a` | 29(a) |
| `entry:anchored` | `rule:30a` | 30(a) |
| `entry:anchored_under_50m` | `rule:30b` | 30(b) |
| `entry:anchored_deck_lights` | `rule:30c` | 30(c) |
| `entry:aground_anchor_lights` | `rule:30d` | 30(d) |
| `entry:aground_red_over_red` | `rule:30d_i` | 30(d)(i) |
| `entry:anchored_under_7m_not_near_channel` | `rule:30e` | 30(e) |
| `entry:any_visibility` | `rule:4` | 4 |
| `entry:in_sight` | `rule:11` | 11 |
| `entry:restricted_visibility` | `rule:19a` | 19(a) |
| `entry:power_gives_way_to_nuc` | `rule:18a_i` | 18(a)(i) |
| `entry:power_gives_way_to_ram` | `rule:18a_ii` | 18(a)(ii) |
| `entry:power_gives_way_to_fishing` | `rule:18a_iii` | 18(a)(iii) |
| `entry:power_gives_way_to_sail` | `rule:18a_iv` | 18(a)(iv) |
| `entry:sail_gives_way_to_nuc` | `rule:18b_i` | 18(b)(i) |
| `entry:sail_gives_way_to_ram` | `rule:18b_ii` | 18(b)(ii) |
| `entry:sail_gives_way_to_fishing` | `rule:18b_iii` | 18(b)(iii) |
| `entry:fishing_gives_way_to_nuc` | `rule:18c_i` | 18(c)(i) |
| `entry:fishing_gives_way_to_ram` | `rule:18c_ii` | 18(c)(ii) |
| `entry:avoid_impeding_cbd` | `rule:18d_i` | 18(d)(i) |
| `entry:wig_keeps_well_clear` | `rule:18f_i` | 18(f)(i) |
| `entry:not_impeded_remains_obliged` | `rule:8f_iii` | 8(f)(iii) |
| `entry:overtaking_gives_way` | `rule:13a` | 13(a) |
| `entry:narrow_channel_small_or_sail` | `rule:9b` | 9(b) |
| `entry:narrow_channel_fishing` | `rule:9c` | 9(c) |
| `entry:traffic_lane_fishing` | `rule:10i` | 10(i) |
| `entry:traffic_lane_small_or_sail` | `rule:10j` | 10(j) |
| `entry:steady_bearing` | `rule:7d_i` | 7(d)(i) |
| `entry:sail_port_tack_gives_way` | `rule:12a_i` | 12(a)(i) |
| `entry:sail_windward_gives_way` | `rule:12a_ii` | 12(a)(ii) |
| `entry:sail_port_tack_uncertain_gives_way` | `rule:12a_iii` | 12(a)(iii) |
| `entry:overtaking` | `rule:13b` | 13(b) |
| `entry:being_overtaken` | `rule:13b` | 13(b) |
| `entry:overtaking_until_past_and_clear` | `rule:13d` | 13(d) |
| `entry:head_on` | `rule:14b` | 14(b) |
| `entry:crossing` | `rule:15a:crossing` | 15(a) |
| `entry:crossing_gives_way` | `rule:15a:keep_out_of_the_way` | 15(a) |
| `entry:mooring_buoy` | `rule:30a:mooring_buoy` | 30(a) |
| `entry:mooring_buoy_under_50m` | `rule:30b:mooring_buoy` | 30(b) |

## Consequences

- One pass, one commit: `data/applicability.json`, both fixture files,
  `data/geometry.json`, `data/images.json`, `data/facts.json`,
  `data/rules.json`, the schemas, the suite and the living docs. The
  schema `$defs` that named the type follow the noun: `entryId` is
  `ruleId`, `entryIdList` is `ruleIdList`.
- Two entries may still share a cite — `rule:24a_i` and
  `rule:24a_i:exceeds_200m`, the two halves of 15(a), the two mooring-buoy
  deltas. What they never share is an id, and the third segment says which
  norm out of the paragraph the entry carries.
- Earlier ADRs and closed questions cite entries by the superseded names;
  the table above is the map and stays in this file permanently. ADR 0006
  carries a dated note that its identifier-diff half is gone.
- `represented_paragraphs` is now a second list of records that look like
  entries, differing only in carrying no `when`. Folding it into `entries`
  with a `care`/`meta` category is the obvious follow-up and is not done
  here.
- Open, and not ruled: whether `fact:rule18_class` should be renamed. It
  carries a rule number inside a fact name, which is the shape this ADR
  moved *entry* ids towards and says nothing about for facts. Left visibly
  open.
- An encounter with more than two vessels is issue #135; nothing in this
  scheme is aimed at it, and a third subject would need a segment none of
  these ids have.
