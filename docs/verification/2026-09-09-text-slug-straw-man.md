# The `text_slug` straw man, built on `intl` Rules 1-19

ADR 0010 leaves in pencil what a withheld paragraph carries in place of its
text, and names a slug as a straw man to be built and judged rather than
argued about. This is the build and the judgement. The research issue is
colregs#83; nothing here decides the pencil item.

Everything below is reproducible from `scripts/text-slug.mjs` over
`data/rules.json` at this commit. Nothing was written into `data/`.

## What the pipeline does

Deterministic, no model in the loop, no dependencies:

1. **Citations first.** `Rule 13`, `Rules 4-19`, `Rule 34(c)(i)` become
   `rule-13`, `rules-4-19`, `rule-34ci`. A citation is a fact about which
   provision is invoked, not expression, and it is the most navigable term a
   slug can carry.
2. **Terms of art as one term.** A fixed table of multi-word terms collapses
   each to a hyphenated token: `traffic-separation-scheme`, `not-under-command`,
   `restricted-ability-maneuver`, `keep-out-of-way`, `risk-of-collision`,
   `in-sight`, `narrow-channel`. The target form is the applicability
   vocabulary's wherever one exists.
3. **Stop words out.** Function words, modals and the words that are in nearly
   every paragraph and say nothing about which one this is: `vessel`, `rule`,
   `shall`, `circumstances`, `practicable`.
4. **Lemmatise.** Plurals by rule; every `-ed` and `-ing` form by a table,
   because a suffix rule cannot tell `speed` from `stopped` without a lexicon.
   Gerunds that name an activity in `facts.json` keep the gerund (`fishing`,
   `towing`), so the slug's form is the vocabulary's form.
5. **Sorted set.** No order, no syntax, no counts.

Numbers keep their unit (`20-meter`, `22-5-degree`).

## Shape of the output

| measure | Rules 1-19 |
|---|---|
| paragraphs | 122 |
| terms per slug, min / median / max | 0 / 6 / 34 |
| empty slugs | 1: `6(a)`, whose text is "By all vessels:" |
| identical slugs | 3 groups, all in Rule 18: `18(a)(i)=18(b)(i)=18(c)(i)`, `18(a)(ii)=18(b)(ii)=18(c)(ii)`, `18(a)(iii)=18(b)(iii)` |
| near-duplicates, Jaccard ≥ 0.6 | 1 pair: `13(c)` and `14(c)`, the two "if in doubt, assume" paragraphs |

The identical slugs are identical source text: "a vessel not under command"
under three different chapeaux. No slug can separate them, and neither can
the text; the path does. That is the ceiling on question 1 for this corpus.

## Question 1: can a reader navigate to the paragraph from the slug alone?

Method: the 122 slugs, shuffled by a fixed hash of the path and stripped of
their paths (`--blind`), were given to two readers with no access to the
repository or any other file, asked to name the paragraph for each line with
a confidence from 1 to 3. The readers were two language models chosen as
proxies for a strong and a weak human reader of the Rules: one that knows
COLREGS closely (Claude Opus) and one that knows it loosely (Claude Haiku).
Scored against the key.

| reader | exact paragraph | correct rule | wrong while "sure" |
|---|---|---|---|
| strong | 115 / 122 | 122 / 122 | 1 |
| weak | 30 / 122 | 79 / 122 | 38 |

The strong reader's seven misses: six are inside the three identical-slug
groups above, where the answer is one of the group and the slug cannot say
which; the seventh is `15` for `15(a)`, a citation-form slip on a rule with
one paragraph. Every miss that the slug could in principle have prevented,
it prevented.

The weak reader reached the right rule in two cases out of three and the
right paragraph in one out of four, and was confidently wrong 38 times. The
misses are almost all off-by-one within a rule (`8(b)` read as `8(a)`) or a
Rule 18 sub-item read as its Rule 3 definition, which is to say the reader
did not know the paragraph numbering, and the slug does not teach it.

Reading: **the slug is an index, not a substitute.** A reader who knows the
Rules lands on the paragraph from the slug alone, at the ceiling the corpus
allows. A reader who does not know the Rules lands on the rule, mostly, and
on the paragraph rarely. For the case ADR 0010 is for, that ordering
matters: a CEVNI reader will usually be the second kind, the source is not
English, and the terms would be translations, so the strong-reader number is
an upper bound and the weak-reader number is the honest expectation.

## Question 2: do the terms overlap the applicability vocabulary?

Method: every fact key and enumerated value that `data/applicability.json`
predicates and `data/facts.json` axes use, 67 terms, mapped to slug space by
a table that is mostly the four abbreviations (`nuc`, `ram`, `cbd`, `wig`)
and the underscores.

- **59 of 67 terms appear in some slug of Rules 1-19.** The eight that do not
  are terms from outside the range or not terms at all: `activity:diving`,
  `activity:pushing`, `activity:none`, `position:moored`, `propulsion:oars`,
  `fact:composite_unit`, `fact:on_mooring_buoy`, `wind_side:unknown`. Within
  the range the overlap is complete.
- **Per entry, the cited paragraph's slug carries the term the entry turns
  on.** All 31 entries citing a paragraph in Rules 1-19 were checked
  (`--stats`). `13a` reads `hist:was_overtaking`; `13(a)`'s slug carries
  `overtake`. `9b` reads `length_m`, `propulsion:sail` and
  `confined_to_channel`; `9(b)`'s slug carries `20-meter`, `sailing-vessel`,
  `narrow-channel`, `navigate`. `18d1` reads three Rule 18 classes;
  `18(d)(i)`'s slug carries all three. What the slug does not carry are the
  gates an entry inherits from a chapeau or a scope rule rather than from
  its own paragraph: `pair:geo:in_sight` (Rule 11), `position:underway`
  (`18(a)`'s chapeau), and the derived `fact:rule18_class` key. Those are in
  the chapeau's slug, which is where the text puts them.

Reading: **the overlap is real and it runs the useful way.** The
applicability vocabulary was written from these paragraphs, so the slug of a
paragraph recovers the terms its entries gate on. A term-set built for a
withheld jurisdiction the same way would give a consumer a vocabulary-level
hook into each paragraph without a word of it.

## What this does and does not settle

Settled by the build: the pipeline is deterministic, cheap, and produces a
navigable index for a reader who already knows the Rules, at the corpus's
own ceiling. The terms line up with the vocabulary.

Not settled, and not this document's to settle:

- Whether a slug ships for CEVNI at all, alone or beside `text_digest` and
  `mirrors`. The weak-reader result says a slug does not replace the words
  for the reader most likely to need them; `mirrors` does, for the majority
  of CEVNI, and the slug's value is in the remainder.
- Where the derivative-work line falls. Out of scope on colregs#82; redaction
  ships whatever the answer.
- The pipeline's tables are hand-built for this corpus. A CEVNI run needs a
  translation step to English counterparts before the same tables apply,
  and a lexicon for forms the tables do not know. That is engineering, not
  a design question.

What would move the pencil item: a decision on the first bullet, taken with
the `mirrors` coverage of CEVNI in hand, since that number is what says how
much of CEVNI the slug would be the only thing standing in for.

## The slugs

`node scripts/text-slug.mjs`, Rules 1-19, at this commit:

```
4           apply, rules-4-10, visibility
5           appraisal, available, hearing, look-out, maintain, risk-of-collision, sight, situation
6           action, avoid, collision, determine, distance, effective, factor, proceed, safe-speed, stop
11          apply, in-sight, rules-11-18
16          action, direct, early, keep-clear, keep-out-of-way, substantial
18          except, rule-10, rule-13, rule-9
1(a)        apply, connect, high-seas, navigable, seagoing, water
1(b)        authority, conform, connect, harbor, high-seas, inland, interfere, lake, navigable, operation, river, roadstead, seagoing, waterway
1(c)        additional, authorize, convoy, elsewhere, engaged-in-fishing, fishing, fleet, government, interfere, light, mistake, operation, proceed, shape, ship, signal, state, station, war, whistle
1(d)        adopt, organization, traffic-separation-scheme
1(e)        appliance, arc, characteristic, comply, concern, construction, determine, disposition, government, light, number, position, range, shape, sound-signaling, visibility
2(a)        comply, consequence, crew, exonerate, master, neglect, owner, practice, precaution, seaman
2(b)        avoid, collision, comply, construe, danger, departure, immediate, limitation, navigation
3(a)        craft, non-displacement, seaplane, transportation, water, watercraft, wig-craft
3(b)        machinery, power-driven, propel
3(c)        fit, machinery, propel, sail, sailing-vessel
3(d)        apparatus, engaged-in-fishing, fishing, line, maneuver, net, restrict, trawl, trolling
3(e)        aircraft, design, maneuver, seaplane, water
3(f)        exceptional, keep-out-of-way, maneuver, not-under-command, unable
3(g)        ability, aircraft, cable, cargo, clear, course, deviate, dredging, engage, keep-out-of-way, launch, lay, limit, mark, mine, navigational, operation, person, pick-up, pipeline, recover, replenish, restrict, restricted-ability-maneuver, service, submarine, surveying, tow, towing, transfer, unable, underwater, underway, work
3(h)        available, constrained-by-draft, course, depth, draft, navigable, power-driven, restricted-ability-maneuver, water, width
3(i)        aground, anchor, fast, shore, underway
3(j)        breadth, length, overall
3(k)        in-sight, observe
3(l)        fall, fog, mist, rainstorm, restrict, restricted-visibility, sandstorm, snow, visibility
3(m)        action, close, craft, fly, mode, multimodal, operational, proximity, surface, surface-effect, utilize, wig, wing-in-ground
6(a)        
6(a)(i)     state, visibility
6(a)(ii)    concentration, density, fishing, traffic
6(a)(iii)   ability, distance, maneuver, stop, turn
6(a)(iv)    back, background, light, night, scatter, shore
6(a)(v)     current, hazard, navigational, proximity, sea, state, wind
6(a)(vi)    available, depth, draft, water
6(b)        operational, radar
6(b)(i)     characteristic, efficiency, equipment, limitation, radar
6(b)(ii)    constraint, impose, radar, range, scale
6(b)(iii)   detect, effect, interference, radar, sea, source, state, weather
6(b)(iv)    adequate, detect, float, ice, object, radar, range, small
6(b)(v)     detect, location, movement, number, radar
6(b)(vi)    assess, determine, object, radar, range, vicinity, visibility
7(a)        available, determine, doubt, risk, risk-of-collision
7(b)        detect, early, equipment, equivalent, fit, long-range, object, observe, operational, plot, radar, risk-of-collision, scan, systematic, warning
7(c)        assume, information, radar, scanty
7(d)        consideration, determine, risk-of-collision
7(d)(i)     approach, change, compass-bearing, risk
7(d)(ii)    appreciable, approach, bearing, change, close, large, range, risk, tow
8(a)        action, avoid, collision, observe, positive, rules-4-19, seamanship
8(b)        alter, avoid, collision, course, large, observe, radar, small, speed, succession
8(c)        action, alone, alter, avoid, close-quarters, course, effective, room, sea, substantial
8(d)        action, avoid, check, clear, collision, distance, effective, pass, past, safe
8(e)        assess, avoid, collision, propulsion, reverse, situation, slacken, speed, stop, way
8(f)(i)     action, early, impede, passage, room, safe, sea
8(f)(ii)    action, approach, impede, obligation, passage, relieve, risk-of-collision, rules-4-19, safe
8(f)(iii)   approach, comply, impede, oblige, passage, risk-of-collision, rules-4-19, two
9(a)        channel, course, fairway, keep, lie, limit, narrow-channel, near, outer, proceed, safe, side, starboard
9(b)        20-meter, fairway, impede, length, narrow-channel, navigate, passage, sailing-vessel
9(c)        engaged-in-fishing, fairway, impede, narrow-channel, navigate, passage
9(d)        channel, cross, doubt, fairway, impede, intention, narrow-channel, navigate, passage, prescribe, rule-34d, signal
9(e)(i)     action, agreement, doubt, fairway, indicate, intend, intention, narrow-channel, overtake, pass, prescribe, rule-34ci, rule-34cii, rule-34d, safe, signal, sound, step
9(e)(ii)    obligation, overtake, relieve, rule-13
9(f)        alertness, area, bend, caution, fairway, intervene, narrow-channel, navigate, near, obscure, obstruction, prescribe, rule-34e, signal, sound
9(g)        anchor, avoid, narrow-channel
10(a)       adopt, apply, obligation, organization, relieve, traffic-separation-scheme
10(b)       traffic-separation-scheme
10(b)(i)    direction, flow, lane, proceed, traffic, traffic-lane
10(b)(ii)   keep-clear, separation-line, separation-zone, traffic
10(b)(iii)  angle, direction, flow, join, lane, leave, side, small, termination, traffic, traffic-lane
10(c)       angle, avoid, cross, direction, flow, heading, oblige, right, traffic, traffic-lane
10(d)(i)    20-meter, adjacent, engaged-in-fishing, inshore-traffic-zone, length, sailing-vessel, traffic-lane, traffic-separation-scheme
10(d)(ii)   avoid, danger, immediate, inshore-traffic-zone, installation, offshore, pilot, port, route, rule-10di, situate, station, structure
10(e)       cross, enter, except, join, lane, leave, separation-line, separation-zone
10(e)(i)    avoid, danger, emergency, immediate
10(e)(ii)   engage, fishing, separation-zone
10(f)       area, caution, navigate, near, termination, traffic-separation-scheme
10(g)       anchor, area, avoid, near, termination, traffic-separation-scheme
10(h)       avoid, margin, traffic-separation-scheme, wide
10(i)       engaged-in-fishing, impede, passage, traffic-lane
10(j)       20-meter, impede, length, passage, power-driven, safe, sailing-vessel, traffic-lane
10(k)       carry, comply, engage, exempt, maintenance, navigation, operation, restricted-ability-maneuver, safety, traffic-separation-scheme
10(l)       cable, carry, comply, engage, exempt, lay, operation, pick-up, restricted-ability-maneuver, service, submarine, traffic-separation-scheme
12(a)       approach, keep-out-of-way, risk-of-collision, sailing-vessel, two
12(a)(i)    keep-out-of-way, port, side, wind
12(a)(ii)   keep-out-of-way, leeward, side, wind, windward
12(a)(iii)  certainty, determine, keep-out-of-way, port, see, side, starboard, wind, windward
12(b)       carry, fore-and-aft, mainsail, opposite, sail, side, square-rigged, windward
13(a)       contain, keep-out-of-way, overtake, rules-4-18
13(b)       22-5-degree, abaft, beam, come, direction, night, overtake, position, see, sidelight, sternlight
13(c)       act, assume, doubt, overtake
13(d)       alter, bearing, clear, cross, duty, keep, overtake, past, relieve, subsequent, two
14(a)       alter, course, meet, pass, port, power-driven, reciprocal, risk-of-collision, side, starboard, two
14(b)       ahead, aspect, correspond, day, line, masthead-light, night, observe, see, sidelight, situation
14(c)       act, assume, doubt, situation
15(a)       ahead, avoid, cross, keep-out-of-way, power-driven, risk-of-collision, side, starboard, two
17(a)(i)    course, keep, keep-out-of-way, speed, two
17(a)(ii)   action, alone, avoid, collision, comply, keep-out-of-way, maneuver
17(b)       action, aid, alone, avoid, close, collision, course, give-way, keep, speed
17(c)       action, alter, avoid, collision, course, cross, port, power-driven, rule-17aii, side, situation
17(d)       give-way, keep-out-of-way, obligation, relieve
18(a)       keep-out-of-way, power-driven, underway
18(a)(i)    not-under-command
18(a)(ii)   restricted-ability-maneuver
18(a)(iii)  engaged-in-fishing
18(a)(iv)   sailing-vessel
18(b)       keep-out-of-way, sailing-vessel, underway
18(b)(i)    not-under-command
18(b)(ii)   restricted-ability-maneuver
18(b)(iii)  engaged-in-fishing
18(c)       engaged-in-fishing, keep-out-of-way, underway
18(c)(i)    not-under-command
18(c)(ii)   restricted-ability-maneuver
18(d)(i)    avoid, constrained-by-draft, exhibit, impede, not-under-command, passage, restricted-ability-maneuver, rule-28, safe, signal
18(d)(ii)   caution, constrained-by-draft, navigate
18(e)       avoid, comply, impede, keep-clear, navigation, risk-of-collision, rules-4-19, seaplane, water
18(f)(i)    avoid, flight, impede, keep-clear, land, navigation, near, surface, wig-craft
18(f)(ii)   comply, operate, power-driven, rules-4-19, surface, water, wig-craft
19(a)       apply, area, in-sight, navigate, near, restricted-visibility
19(b)       adapt, engine, immediate, maneuver, power-driven, proceed, ready, restricted-visibility, safe-speed
19(c)       comply, restricted-visibility, rules-4-10
19(d)       action, alone, alter, avoid, close-quarters, course, detect, determine, develop, radar, risk-of-collision
19(d)(i)    alter, beam, course, forward, overtake, port
19(d)(ii)   abaft, abeam, alter, beam, course
19(e)       avoid, beam, caution, close-quarters, collision, course, danger, determine, except, extreme, fog-signal, forward, hear, keep, minimum, navigate, reduce, risk-of-collision, speed, way
```
