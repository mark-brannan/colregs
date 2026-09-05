# Identifiers

Every name the data is addressed by — paragraph path, entry id, light id,
fact key, fact value, relation name — is an identifier, and REQ-MODEL-10
makes identifiers immutable from the version stated there onward. This file
records what the identifiers are and why they are shaped the way they are,
so that the shape is a decision on file rather than an accident nobody can
now change.

Identifiers are schema keywords, not display strings. They are never
localized (REQ-LANG-2); translations attach to them.

## Two classes, opposite requirements

**Citation-derived identifiers carry no prefix.** A paragraph path *is* the
citation: `27(a)(i)` is what a mariner, a lawyer and a court all write, and
what a consumer stores when it records why a light was shown. Prefixing it
would put a package-local token in front of a reference that belongs to the
Convention rather than to this repository, and would make a stored citation
unreadable outside the tool that stored it. Entry ids are derived from
paragraph paths (below) and inherit the same transparency for the same
reason. Paragraph-keying is argued in ADR 0001 and required by
REQ-MODEL-4; nothing here reopens either.

**Vocabulary identifiers carry a type prefix.** These names are this
package's own — nothing in COLREGS calls anything `masthead` or `nuc`. They
share one flat string space across five files, and before the prefix they
collided in it: `towing` was simultaneously a light id (Rule 21(d)) and an
`activity` value (Rule 24(a)), so a consumer holding the string `towing`
could not say what it was a name *for* without knowing which field it came
out of. The prefix makes the namespace part of the identifier, which
resolves that collision by construction rather than by convention.

## The scheme

| form | class | examples |
|---|---|---|
| `light:<id>` | light definitions (`data/lights.json`) | `light:masthead`, `light:sidelight_starboard`, `light:all_round` |
| `fact:<key>` | fact keys — the input vocabulary (`data/facts.json`) | `fact:activity`, `fact:length_m`, `fact:making_way` |
| `<fact>:<value>` | values of an enumerated fact | `activity:nuc`, `position:anchored`, `propulsion:sail`, `obstruction_side:port` |
| `rel:<name>` | the five relation verbs (`data/applicability.json`) | `rel:includes`, `rel:in_lieu_of`, `rel:exempts` |

The prefix names the namespace the identifier lives in. For a fact *value*
that namespace is the fact itself, written bare: `activity:nuc`, not
`fact:activity:nuc`. A value is only ever meaningful against its own fact,
so naming the fact is what disambiguates it; naming the class as well would
add a segment that never varies.

**There is no version segment.** No `colregs.v1:activity:nuc`. A version in
the identifier churns every id at a major bump — including the ones that
did not change — which destroys exactly the stability REQ-MODEL-10 exists
to provide, and forces every consumer to rewrite stored references for
changes that did not affect them. Breaking changes are signalled by the
package version, which is where a consumer already looks.

Only enumerated facts have a value namespace. Numeric facts
(`fact:length_m`) take numbers and booleans (`fact:composite_unit`) take
`true`/`false`; there is nothing to prefix.

A two-subject predicate prefixes a **subject** segment onto the forms above
and adds three fact classes of its own (`kin:`, `geo:`, `hist:`). That is
pencil and is the next section.

## Two subjects `✎`

**Pencil** (`docs/conventions.md`): ADR 0005 puts the whole two-subject shape
in pencil and v0.x allows the break, so any session may change this section
for a better idea, logging the change. What would settle it: the first
two-subject entry — Rule 18 — actually being written against it. This
section answers `Q-28`.

A `display` entry reads one vessel. A `classification` or `precedence`
entry reads two, and needs to say *whose* `fact:activity` it means. The form
is three segments:

```
<subject>:<class>:<key>
```

| segment | values |
|---|---|
| subject | `own`, `other`, `pair` |
| class | `fact`, `kin`, `geo`, `hist` |
| key | the identifier as it already exists, or a new one in a new class |

`own:fact:activity`, `other:kin:heading_deg`, `pair:geo:in_sight`,
`own:hist:was_overtaking`.

**A key with no subject segment means `own:`.** This is the whole of the
backward-compatibility story and it is why the subject is a *prefix* rather
than a change to the fact keys. `fact:activity` still spells `fact:activity`
and still denotes what it always denoted, so every predicate in
`data/applicability.json`, every fixture in
`fixtures/applicability-fixtures.json` and every stored citation a consumer
holds stays correct unedited — `REQ-MODEL-10` is satisfied by construction
rather than by a migration. The alternative shapes were a suffix
(`fact:activity:own`), which buries the thing you are scanning for at the
end of a variable-length name, and per-subject fact keys
(`fact:own_activity`), which would double the fact vocabulary and repoint
nothing but would leave two names for one concept forever. Prefixing is the
only one of the three where the existing vocabulary is a strict subset of
the new one.

The cost, stated so nobody rediscovers it: `own`, `other` and `pair` are now
reserved at the head of the identifier space, and no fact, light or relation
may ever be named one of them. That is the price of a subject segment that
is not itself prefixed, and it is cheap — the three words are not candidate
names for anything this package models.

### The three subjects

`own` is the vessel the rule addresses; `other` is the vessel it is in an
encounter with. **`pair` is the encounter itself**, and it exists because
some facts belong to neither vessel: range is one number, not own's number
and the other's. Putting `geo:range_m` under both subjects would create two
identifiers for one quantity and a class of bug — the two disagreeing —
that has no meaning.

### Relative geometry, and why aspect is not an identifier

Geometry splits on whether the quantity is symmetric between the vessels:

| fact | subject | |
|---|---|---|
| `geo:rel_bearing_deg` | `own` / `other` | bearing of the *other* subject, clockwise from this subject's heading |
| `geo:range_m` | `pair` | |
| `geo:bearing_change_deg_min` | `pair` | Rule 7(d)(i)'s steady bearing |
| `geo:cpa_m`, `geo:tcpa_s` | `pair` | |
| `geo:in_sight` | `pair` | Rule 3(k), symmetric because the rule defines it that way |

The directional row is where the namespace earns its keep.
`own:geo:rel_bearing_deg` is relative bearing — where the other vessel is
off own's bow. `other:geo:rel_bearing_deg` is the same fact read from the
other side, which is **aspect**. So aspect gets no identifier of its own: it
is a subject swap, not a second fact. Rule 13(b)'s overtaking sector is then
`other:geo:rel_bearing_deg` in (112.5, 247.5) — own more than 22.5° abaft
the other vessel's beam — written once, in the units the rule itself uses.
Swapping `own` and `other` throughout a predicate reverses the encounter,
which is exactly the operation a `precedence` rule needs and the reason to
prefer a subject namespace over two parallel vocabularies.

The directional and the pair geometry are redundant with `kin:` wherever both
are stated, and a record can state a set no two vessels can occupy — two
bearings no pair of headings produces, a CPA the speeds do not give.
`facts.json` declares the equations that relate them under
`situation.geometry.consistency`, and the suite enforces them on every fixture
and on every situation it constructs (`REQ-VERIFY-8`, `Q-48`). That makes them
checked, not derived: a consumer with an ARPA solution still supplies them,
and a record that omits the kinematics is unchecked rather than wrong.

`kin:` is the kinematic class ADR 0005 introduces — `kin:position`,
`kin:heading_deg`, `kin:sog_kn`, `kin:rot_deg_min`, `kin:dynamics`. It takes
`own`/`other` only; there is no kinematic state of a pair. `kin:dynamics`
is an enumerated fact, so its values follow the bare-fact-name rule above:
`dynamics:tanker`, not `kin:dynamics:tanker`.

### History

Rule 13(d) is the reason history is a class and not a note. Once a vessel is
overtaking, a subsequent alteration of the bearing does not make her a
crossing vessel; the instantaneous geometry, read alone, says otherwise and
hands the duty to the wrong vessel. So the latch is a fact:

- `own:hist:was_overtaking` — this subject was, earlier in this encounter,
  an overtaking vessel with respect to the other.
- `own:hist:latched_at_s` — how long ago that attached, for a `conduct`
  monitor. A predicate at a point does not read it.

History is directional — it is *own* that was overtaking — so it takes a
subject segment like the fact record does, and never `pair`.

### What this does not do

It does not version an identifier, and it does not repoint one. Everything
above is additive: new segments, new classes, new keys. No existing
identifier changes its spelling or its meaning, which is the property
`REQ-MODEL-10` protects and the one an alternative that renamed the fact
keys would have broken.

## Effects `✎`

**Pencil** (`docs/conventions.md`): ADR 0005 puts the whole two-subject shape
there. What would settle it: a second family of `precedence` paragraphs —
Rules 12, 14 and 15 — written against it. **Written, and it held with one
addition**: Rules 7(d) and 13–15 are the first `classification` entries, and a
classification produces neither a role nor a section, so the table below grows
a third row. Rule 12 turned out to be `precedence` and not `classification`
(below). This section answers the data half of `Q-27` and is required by
`REQ-CAT-8`.

A `display` entry produces `lights`. A `scope` or `precedence` entry produces
an **effect**, and the shape of the effect is fixed by the category:

| category | effect |
|---|---|
| `scope` | `{"part", "section", "applies_rules"}` — which section of which Part governs, and the rules it contains |
| `precedence` | `{"own": <role>, "other": <role>}` — one role per subject |
| `classification` | `{"encounter": <encounter>}` **or** `{"risk_of_collision": true}` — exactly one key |

Five roles, a closed set: `give-way`, `stand-on`, `shall-not-impede`,
`keep-clear`, `none`. They are declared in `data/applicability.json` under
`effects`, and they are **not identifiers** — like modality and jurisdiction
values they are a closed vocabulary of their own, outside what `REQ-MODEL-10`
binds.

### Encounters, and why a classification effect has two shapes

Four encounters, a closed set like the roles: `head-on` (Rule 14), `crossing`
(Rule 15), `overtaking` (Rule 13) and `none`. They are declared in
`data/applicability.json` under `effects.encounters` and, like the roles, they
are not identifiers.

A `classification` effect carries **exactly one key**, and which key it is
depends on which question the paragraph answers. Rule 7(d)(i) answers *does
risk of collision exist* and produces `{"risk_of_collision": true}`; Rules 13,
14 and 15 answer *what kind of encounter is this* and produce an `encounter`.
ADR 0005 gives both questions to `classification` — "relative geometry,
history → encounter type, risk of collision" — and the two do not merge. A
single shape would have made every encounter entry state a risk it does not
decide, and 15(a)'s crossing test reads `pair:geo:risk_of_collision` as an
input rather than producing it.

There is no `{"risk_of_collision": false}` and there never will be. 7(a) makes
risk a judgement on all available means and deems it to exist in any doubt, so
an entry can add a ground for risk and nothing in this package can deny one.
`none` is declared as an encounter for the completeness of the vocabulary and
no entry produces it: an encounter type is asserted by a paragraph, and the
absence of one is the absence of an entry rather than an entry with a null
value.

**The three encounter types partition relative bearing, and the data is
written so that they cannot stop.** 13(b)'s sector is one constraint object,
`{"gt": 112.5, "lt": 247.5}`; 15(a)'s residual is `not` over that same object,
and 14(a)'s cone is negated the same way inside an `any_of`. Nothing writes a
crossing sector. The consequence is that the only way to put a bearing in two
encounters or in none is to edit one of two constraints and not the other, and
there is exactly one of each to edit. `test/data.test.mjs` sweeps both
subjects' bearings in half-degree steps and asserts exactly one encounter at
each of the 518 400 points; the Alloy version of the same property lives in
`colregs-engine`.

### Rule 12 is `precedence`, not `classification`

ADR 0005 §1 and the proposal's first-cut table file Rule 12 under
`classification`. It is `precedence` here, for the reason `Q-37` gives for
13(a): **12(a) produces a role, and a classification effect has nowhere to put
one.** "One of them shall keep out of the way of the other" is give-way and
stand-on in the effect vocabulary that already exists, and it is not an
encounter type — two sailing vessels meeting are still in a head-on, a
crossing or an overtaking, and Rule 12 says which of them gives way rather
than which kind of meeting it is. Rule 12 has no deeming paragraph at all:
12(b) defines the windward side and is a `definition`, so it is the cite on the
`kin:wind_side` fact rather than an entry.

The category is `Q-14`'s to settle paragraph by paragraph and this is two more
of them; the departure from the table is recorded in ADR 0005's pencil log and
in `Q-40`.

**The effect names both subjects, and that is the point.** A `precedence`
entry is evaluated from own's side, so 18(a)(i) says own gives way *and* the
other vessel stands on. Writing only own's half would lose Rule 17, which
attaches to the counterpart of a give-way duty and to nothing else. So
`stand-on` appears only opposite `give-way`, and the counterpart of
`shall-not-impede` is always `none` — that is 8(f)(iii) in the data: a vessel
whose passage is not to be impeded acquires no privilege by it. `none` is
written rather than omitted, because a norm that confers nothing on a subject
is a finding and not an absence: NUC against RAM is `none` on both sides, and
that is Rule 18's partial order rather than a gap in the table.

`keep-clear` is one role for the two duties 18(e) and 18(f)(i) impose together
— keep well clear, and avoid impeding navigation. The vocabulary cannot
separate them and does not pretend to.

### Two-subject entry ids

Entry ids stay citation-derived, exactly as below: `18a1` is 18(a)(i), `9c` is
9(c), `8f3` is 8(f)(iii). Where a paragraph's subject is disjunctive — 9(b) is
"a vessel of less than 20 metres in length **or** a sailing vessel", and a
`when` is a conjunction — the paragraph takes two entries and the suffix names
the half: `9b-small` and `9b-sail`, `10j-small` and `10j-sail`. That is the
same rule the `-m2`/`-mw`/`-anc` suffixes below follow: name what
distinguishes them, in terms a reader with the rule text in front of them can
find.

## Entry ids

An entry id is derived from the paragraph path its entry cites, lowercased
with the parentheses dropped and roman sub-paragraph numerals written as
arabic digits:

| paragraph path | entry id |
|---|---|
| Rule 28 (one paragraph) | `28` |
| `23(b)` | `23b` |
| `25(d)(ii)` | `25d2` |
| `23(a)(iii)`–`(iv)`, one entry | `23a34` |

Where one paragraph produces more than one entry, a hyphenated suffix names
what distinguishes them. The suffixes are **not** drawn from a single
scheme, because the paragraphs they split do not divide on a single axis:

| suffix | means | example |
|---|---|---|
| `-m2` / `-m3` | two or three masthead lights | `24a-m2`, `24a-m3` |
| `-rest` | the remainder of the rule's requirements once the split ones are taken out | `24a-rest` |
| `-id` | the identity lights: the all-round group that says *what the vessel is* | `26b-id`, `27a-id`, `27b-id` |
| `-mast` | the masthead light the paragraph adds on top of the identity lights | `26b-mast` |
| `-mw` | the making-way half of a rule that lights differently when moving through the water | `26b-mw`, `27a-mw`, `27b-mw` |
| `-gear` | the light indicating the direction of outlying gear | `26c-gear` |
| `-anc` | the at-anchor branch | `27b-anc` |
| `-anchor` / `-red` | 30(d)'s two halves: the anchor lights it requires, and the two red all-round lights of a vessel aground | `30d-anchor`, `30d-red` |

This was reviewed and kept as it stands. The alternative — a uniform
ordinal suffix, `27a-1` / `27a-2` — would be self-consistent and completely
opaque: it tells a reader with the rule text in front of them nothing, in
exchange for no gain to a machine, which only ever compares entry ids for
equality. `24a-m2` / `24a-m3` are worth calling out in particular, because
the two-or-three masthead split is stated in 24(a)(i) itself — the
cardinality is in the law, not a modelling convenience of this package, and
the suffix names something the reader can go and find.

## Derived facts

A derived fact is one this package computes from the fact record rather than
asking a consumer for. It is an identifier like any other and takes the same
two forms as everything above: `fact:<key>` for the key, `<key>:<value>` for
its values. `fact:rule18_class` therefore takes `rule18_class:nuc`,
`rule18_class:sail` and so on — **not** `class:nuc`. The bare-fact-name rule
is what makes a value readable on its own: `class:nuc` would say which
namespace a reader is in only if they already knew, and `class` is exactly the
kind of word that a second derived fact would want too. The verbosity is the
price of the value being self-identifying, which is the same trade the whole
scheme makes.

Being derived is a property of the fact, not of its name. There is no `derived:`
prefix and no naming convention that marks one, because whether a consumer
supplies a fact or an evaluator computes it is a question about the pipeline
rather than about what the name denotes — and a fact that becomes derivable
later must not have to be renamed for it, which is exactly what `REQ-MODEL-10`
forbids. `facts.json` says so in a field instead: `derived: true`, beside a
decode table that is the definition.

## Terms of art kept unspelled

Four `activity` values are abbreviations rather than words, and stay that
way:

| value | expansion | Rule |
|---|---|---|
| `activity:nuc` | not under command | 3(f) |
| `activity:ram` | restricted in her ability to manoeuvre | 3(g) |
| `activity:ram_underwater` | restricted in her ability to manoeuvre, dredging or engaged in underwater operations | 27(d) |
| `activity:cbd` | constrained by her draught | 3(h) |

These are the standard abbreviations in the field: they are what appears on
an AIS display, in a SignalK `navigation.state` value, and in a mariner's
own speech. Spelling them out would produce `activity:not_under_command`,
which is longer, no clearer to the audience that reads them, and further
from the vocabulary the consumers already use.

**`ram` is a trap and is named here so nobody has to discover it.** In this
dataset `ram` is *restricted in her ability to manoeuvre*. It is not the
English verb, and this is a dataset about vessels colliding. Anyone reading
`activity:ram` as a collision is reading a rule about a dredger as a rule
about an impact. The prefix helps — `activity:ram` reads as a status, where
bare `ram` read as an event — but the expansion is written down here
because a prefix cannot carry a definition.

`activity:ram_underwater` is a **refinement** of `activity:ram`, not a peer
of it: a predicate written for `activity:ram` also matches it. That is
implemented in the reference evaluator and asserted by the fixtures.

## What is not an identifier

- **Modality values** (`shall`, `may`, `shall-if-practicable`,
  `conditional`, `exempt`) and **jurisdiction values** (`intl`,
  `us/inland`) are their own closed vocabularies, defined in §2 of the
  requirements and not part of the identifier space REQ-MODEL-10 binds. So are
  the **role** and **encounter** values of an effect.
- **Constants** — `situation.constants` in `data/facts.json`: the numbers a
  Part B predicate needs and the Rules do not always give
  (`appreciable_bearing_change_deg_min`, `head_on_half_angle_deg`, the two
  `overtaking_sector_*_deg`). They are values, like a modality, and they are
  named rather than written into a predicate so that the number appears once
  and a test can assert that every entry reads it. Each carries its status
  under `docs/conventions.md`, and a pencilled one carries what would settle
  it.
- **Shape keys** — `when`, `one_of`, `cite`, `lights`, the predicate
  language's `not` and `any_of`, and the SignalK decode table's
  `also_activity` and `annex_ii_signal` — are JSON structure, not names the
  data is addressed by. Only the values inside them can be identifiers, and
  where they are (`also_activity` holds an activity value) they are prefixed.
  `not` and `any_of` are the second pair of words reserved at the head of an
  identifier space, after `own`/`other`/`pair`: they appear where a fact key
  appears, so no fact may ever be named either. The cost is the same and as
  cheap — every fact key carries a class prefix (`fact:`, `geo:`, `kin:`,
  `hist:`, `env:`) and neither word could be one.
- **Prose fields** — `geometry.json`'s `datum` ("hull", "gunwale",
  "forward masthead light") describes where a measurement is taken from in
  words. It is deliberately not a light reference and does not resolve to
  one.

## This does not reverse GATE-5

GATE-5 declined a CI-enforced terminology glossary, permanently, for the
**legal corpora**: rule text is verbatim (REQ-MODEL-1), so a glossary that
disagreed with the source would be a defect in the glossary, and enforcing
consistent terminology across a transcription means corrupting it.

Nothing in this file is transcribed from a source. `light:masthead`,
`activity:nuc` and `rel:in_lieu_of` are names this package invented for its
own structures; COLREGS contains none of them. Documenting a vocabulary you
authored is not the same act as imposing one on a text you did not, and the
reasoning that closed GATE-5 does not reach it. GATE-5 stays declined.
