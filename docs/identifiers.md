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
unreadable outside the tool that stored it. Rule ids sit beside this class
rather than in it: `rule:13b` is *shaped* like the cite it was minted from,
but it is a name in a namespace and a consumer reads the paragraph out of
`cite`, never out of the id (ADR 0015).
Paragraph-keying is argued in ADR 0001 and required by REQ-MODEL-4; nothing
here reopens either.

**Jurisdiction values sit beside paragraph paths in this class, and for the
same reason.** `intl` and `us/inland` are not names this package coined:
jurisdiction is a coordinate with REQ-SCOPE-2's own `<body>/<waters>`
grammar, its left segment borrowed from ISO 3166, the whole value doubling
as a corpus key and a `data/text/` filesystem path — its sibling axis,
`language`, is a bare BCP 47 tag for the same reason. A jurisdiction value
is immutable under REQ-MODEL-10 like any identifier here — renaming
`us/inland` would break every stored provenance and corpus path — it just
carries no prefix, because the grammar that owns it already keeps it stable
and collision-free (ADR 0017).

**Vocabulary identifiers carry a type prefix.** These names are this
package's own — nothing in COLREGS calls anything `masthead` or `nuc`. They
share one flat string space across five files, and before the prefix they
collided in it: `towing` was simultaneously a light id (Rule 21(d)) and an
`activity` value (Rule 24(a)), so a consumer holding the string `towing`
could not say what it was a name *for* without knowing which field it came
out of. The prefix makes the namespace part of the identifier, which
resolves that collision by construction rather than by convention. The same
shape recurs inside the closed vocabularies themselves: `shall-not-impede`
names both a modality and a role, and `none` names both a role and an
encounter — resolved the identical way, `modality:shall-not-impede` and
`role:shall-not-impede` being two names rather than one (ADR 0017).

## The scheme

| form | class | examples |
|---|---|---|
| `rule:<paragraph-slug>` | applicability entries (`data/applicability.json`) | `rule:30a`, `rule:24a_i:exceeds_200m`, `rule:15a:keep_out_of_the_way` |
| `light:<id>` | light definitions (`data/lights.json`) | `light:masthead`, `light:sidelight_starboard`, `light:all_round` |
| `fact:<key>` | fact keys — the input vocabulary (`data/facts.json`) | `fact:activity`, `fact:length_m`, `fact:making_way`, `fact:on_mooring_buoy` |
| `<fact>:<value>` | values of an enumerated fact | `activity:nuc`, `position:anchored`, `propulsion:sail`, `obstruction_side:port` |
| `rel:<name>` | the five relation verbs (`data/applicability.json`) | `rel:includes`, `rel:in_lieu_of`, `rel:exempts` |
| `modality:<value>` | modality values (`data/applicability.json` `modalities`) | `modality:shall`, `modality:may` |
| `role:<value>` | effect role values (`data/applicability.json` `effects.roles`) | `role:give-way`, `role:none` |
| `encounter:<value>` | effect encounter values (`data/applicability.json` `effects.encounters`) | `encounter:head-on`, `encounter:none` |
| `category:<value>` | entry category values (`data/applicability.json` `categories`) | `category:precedence`, `category:display` |

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

A `category:display` entry reads one vessel. A `category:classification` or
`category:precedence` entry reads two, and needs to say *whose*
`fact:activity` it means. The form is three segments:

```
<subject>:<class>:<key>
```

| segment | values |
|---|---|
| subject | `self`, `other`, `pair` |
| class | `fact`, `kin`, `geo`, `hist` |
| key | the identifier as it already exists, or a new one in a new class |

`self:fact:activity`, `other:kin:heading_deg`, `pair:geo:in_sight`,
`self:hist:was_overtaking`.

**A key with no subject segment means `self:`.** This is the whole of the
backward-compatibility story and it is why the subject is a *prefix* rather
than a change to the fact keys. `fact:activity` still spells `fact:activity`
and still denotes what it always denoted, so every predicate in
`data/applicability.json`, every fixture in
`fixtures/applicability-fixtures.json` and every stored citation a consumer
holds stays correct unedited — `REQ-MODEL-10` is satisfied by construction
rather than by a migration. The alternative shapes were a suffix
(`fact:activity:self`), which buries the thing you are scanning for at the
end of a variable-length name, and per-subject fact keys
(`fact:own_activity`), which would double the fact vocabulary and repoint
nothing but would leave two names for one concept forever. Prefixing is the
only one of the three where the existing vocabulary is a strict subset of
the new one.

The cost, stated so nobody rediscovers it: `self`, `other` and `pair` are now
reserved at the head of the identifier space, and no fact, light or relation
may ever be named one of them. That is the price of a subject segment that
is not itself prefixed, and it is cheap — the three words are not candidate
names for anything this package models.

### The three subjects

`self` is the vessel the rule addresses; `other` is the vessel it is in an
encounter with. **`pair` is the encounter itself**, and it exists because
some facts belong to neither vessel: range is one number, not self's number
and the other's. Putting `geo:range_m` under both subjects would create two
identifiers for one quantity and a class of bug — the two disagreeing —
that has no meaning.

### Relative geometry, and why aspect is not an identifier

Geometry splits on whether the quantity is symmetric between the vessels:

| fact | subject | |
|---|---|---|
| `geo:rel_bearing_deg` | `self` / `other` | bearing of the *other* subject, clockwise from this subject's heading |
| `geo:range_m` | `pair` | |
| `geo:bearing_change_deg_min` | `pair` | Rule 7(d)(i)'s steady bearing |
| `geo:cpa_m`, `geo:tcpa_s` | `pair` | |
| `geo:in_sight` | `pair` | Rule 3(k), symmetric because the rule defines it that way |

The directional row is where the namespace earns its keep.
`self:geo:rel_bearing_deg` is relative bearing — where the other vessel is
off self's bow. `other:geo:rel_bearing_deg` is the same fact read from the
other side, which is **aspect**. So aspect gets no identifier of its own: it
is a subject swap, not a second fact. Rule 13(b)'s overtaking sector is then
`other:geo:rel_bearing_deg` in (112.5, 247.5) — self more than 22.5° abaft
the other vessel's beam — written once, in the units the rule itself uses.
Swapping `self` and `other` throughout a predicate reverses the encounter,
which is exactly the operation a `category:precedence` rule needs and the reason to
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
`self`/`other` only; there is no kinematic state of a pair. `kin:dynamics`
is an enumerated fact, so its values follow the bare-fact-name rule above:
`dynamics:tanker`, not `kin:dynamics:tanker`.

### History

Rule 13(d) is the reason history is a class and not a note. Once a vessel is
overtaking, a subsequent alteration of the bearing does not make her a
crossing vessel; the instantaneous geometry, read alone, says otherwise and
hands the duty to the wrong vessel. So the latch is a fact:

- `self:hist:was_overtaking` — this subject was, earlier in this encounter,
  an overtaking vessel with respect to the other.
- `self:hist:latched_at_s` — how long ago that attached, for a `category:conduct`
  monitor. A predicate at a point does not read it.

History is directional — it is *self* that was overtaking — so it takes a
subject segment like the fact record does, and never `pair`.

### What this does not do

It does not version an identifier, and it does not repoint one. Everything
above is additive: new segments, new classes, new keys. No existing
identifier changes its spelling or its meaning, which is the property
`REQ-MODEL-10` protects and the one an alternative that renamed the fact
keys would have broken.

## Effects `✎`

**Pencil** (`docs/conventions.md`): ADR 0005 puts the whole two-subject shape
there. What would settle it: a second family of `category:precedence` paragraphs —
Rules 12, 14 and 15 — written against it. **Written, and it held with one
addition**: Rules 7(d) and 13–15 are the first `category:classification` entries, and a
classification produces neither a role nor a section, so the table below grows
a third row. Rule 12 turned out to be `category:precedence` and not `category:classification`
(below). This section answers the data half of `Q-27` and is required by
`REQ-CAT-8`.

A `category:display` entry produces `lights`. A `category:scope` or `category:precedence` entry produces
an **effect**, and the shape of the effect is fixed by the category:

| category | effect |
|---|---|
| `category:scope` | `{"part", "section", "applies_rules"}` — which section of which Part governs, and the rules it contains |
| `category:precedence` | `{"self": <role>, "other": <role>}` — one role per subject |
| `category:classification` | `{"encounter": <encounter>}` **or** `{"risk_of_collision": true}` — exactly one key |

Five roles, a closed set: `role:give-way`, `role:stand-on`,
`role:shall-not-impede`, `role:keep-clear`, `role:none`. They are declared
in `data/applicability.json` under `effects`, and, like modality and
category, they are identifiers: prefixed closed vocabularies `REQ-MODEL-10`
binds (ADR 0017).

### Encounters, and why a classification effect has two shapes

Four encounters, a closed set like the roles: `encounter:head-on` (Rule 14),
`encounter:crossing` (Rule 15), `encounter:overtaking` (Rule 13) and
`encounter:none`. They are declared in `data/applicability.json` under
`effects.encounters` and, like the roles, they are identifiers.

A `category:classification` effect carries **exactly one key**, and which key it is
depends on which question the paragraph answers. Rule 7(d)(i) answers *does
risk of collision exist* and produces `{"risk_of_collision": true}`; Rules 13,
14 and 15 answer *what kind of encounter is this* and produce an `encounter`.
ADR 0005 gives both questions to `category:classification` — "relative geometry,
history → encounter type, risk of collision" — and the two do not merge. A
single shape would have made every encounter entry state a risk it does not
decide, and 15(a)'s crossing test reads `pair:geo:risk_of_collision` as an
input rather than producing it.

There is no `{"risk_of_collision": false}` and there never will be. 7(a) makes
risk a judgement on all available means and deems it to exist in any doubt, so
an entry can add a ground for risk and nothing in this package can deny one.
`encounter:none` is declared for the completeness of the vocabulary and
no entry produces it: an encounter type is asserted by a paragraph, and the
absence of one is the absence of an entry rather than an entry with a null
value.

**The three encounter types partition relative bearing, and the data is
written so that they cannot stop.** 13(b)'s sector is one constraint object,
`{"gt": 112.5, "lt": 247.5}`; 15(a)'s residual is `not` over that same object,
and 14(b)'s cone is negated the same way inside an `any_of`. Nothing writes a
crossing sector. The consequence is that the only way to put a bearing in two
encounters or in none is to edit one of two constraints and not the other, and
there is exactly one of each to edit. `test/data.test.mjs` sweeps both
subjects' bearings in half-degree steps and asserts exactly one encounter at
each of the 518 400 points; the Alloy version of the same property lives in
`colregs-engine`.

### Rule 12 is `category:precedence`, not `category:classification`

ADR 0005 §1 and the proposal's first-cut table file Rule 12 under
`category:classification`. It is `category:precedence` here, for the reason `Q-37` gives for
13(a): **12(a) produces a role, and a classification effect has nowhere to put
one.** "One of them shall keep out of the way of the other" is give-way and
stand-on in the effect vocabulary that already exists, and it is not an
encounter type — two sailing vessels meeting are still in a head-on, a
crossing or an overtaking, and Rule 12 says which of them gives way rather
than which kind of meeting it is. Rule 12 has no deeming paragraph at all:
12(b) defines the windward side and is a `category:definition`, so it is the cite on the
`kin:wind_side` fact rather than an entry.

The category is `Q-14`'s to settle paragraph by paragraph and this is two more
of them; the departure from the table is recorded in ADR 0005's pencil log and
in `Q-40`.

**Who governs over Rule 12.** 12(a)'s subjects are "two sailing vessels",
which is 3(c), so the three Rule 12 entries gate on `fact:propulsion` and not on the Rule
18 rank — a fishing vessel under sail is a sailing vessel. Where Rule 18 also
ranks the pair, its entry displaces Rule 12's: the three 18(b) entries and the two 18(c) entries
carry `rel:overrides` against all three, because Rule 18's opening words
except Rules 9, 10 and 13 and nothing else. `rule:13a` overrides them for the same
reason it overrides Rule 18 — 13(a) is "notwithstanding" the rest of Sections
I and II. The test that pins the relation asserts both reasons from
`rules.json`, so the data cannot keep an override after losing the words.

**And over Rule 15, the same way.** 15(a)'s subjects are "two power-driven
vessels", which is 3(b), so `rule:15a:keep_out_of_the_way` gates on `fact:propulsion` and on
no Rule 18 rank either — a vessel engaged in fishing, or not under command,
whose machinery is in use is a power-driven vessel. It used to negate the four
ranks in its own predicate, which said the same thing in the one place a test
could not see the reason; the 18(a)(i)–(iii) entries, the two 18(c) entries and `rule:18f_i` now carry
`rel:overrides` against it instead. The derived half of the test is what makes
that checkable: a Rule 18 entry meets Rule 15 when it assigns a helm role and
neither subject is gated to a sailing vessel, and every such entry must carry
the override, so a Rule 18 paragraph added later cannot join Rule 15 silently.

**The effect names both subjects, and that is the point.** A `category:precedence`
entry is evaluated from self's side, so 18(a)(i) says self gives way *and* the
other vessel stands on. Writing only self's half would lose Rule 17, which
attaches to the counterpart of a give-way duty and to nothing else. So
`role:stand-on` appears only opposite `role:give-way`, and the counterpart of
`role:shall-not-impede` is always `role:none` — that is 8(f)(iii) in the data: a vessel
whose passage is not to be impeded acquires no privilege by it. `role:none` is
written rather than omitted, because a norm that confers nothing on a subject
is a finding and not an absence: NUC against RAM is `role:none` on both sides, and
that is Rule 18's partial order rather than a gap in the table.

`role:keep-clear` is one role for the two duties 18(e) and 18(f)(i) impose together
— keep well clear, and avoid impeding navigation. The vocabulary cannot
separate them and does not pretend to.

### Two-subject rule ids

A two-subject entry is keyed on its paragraph like any other (below):
`rule:18a_i` is 18(a)(i), `rule:9c` is 9(c), `rule:8f_iii` is 8(f)(iii). No
subject segment appears in an id: every entry is evaluated from self's side,
and where the paragraph classifies the pair rather than one vessel the entry
reads both subjects inside one predicate — `rule:13b` is 13(b) whichever
vessel is coming up. Where a paragraph's subject is disjunctive — 9(b) is
"a vessel of less than 20 metres in length **or** a sailing vessel" —
`any_of` carries the disjunction inside one entry, `rule:9b`.

## Rule ids

An entry id is a paragraph key in the `rule:` namespace: `rule:` plus the
cite with its punctuation dropped. ADR 0015 (Solace, 2026-09-16) made the
change and carries the table from the ids it replaced; the rule for minting
a new one is here.

| paragraph | rule id | why that id |
|---|---|---|
| 30(a) | `rule:30a` | the bare slug of the cite: rule number, paragraph letter attached |
| 27(a)(i) | `rule:27a_i` | each roman subparagraph joined with `_` |
| 23(a)(iii)-(iv) | `rule:23a_iii_iv` | a span of subparagraphs, joined the same way |
| 24(a)(i), tow over 200 m | `rule:24a_i:exceeds_200m` | a further norm out of the same paragraph, named in the text's own words |
| 15(a), the duty | `rule:15a:keep_out_of_the_way` | which half of a fused deeming-and-duty sentence this entry carries |
| 30(a), US inland | `rule:30a:mooring_buoy` | a jurisdiction delta named by its difference; the jurisdiction stays a field |

A bare id is the paragraph's principal norm. A third segment is added only
where the text yields a second norm from the same paragraph, and it is named
in the words of the text, not in what the entry produces. A number may appear
there only when the Convention states the threshold itself (`exceeds_200m` is
24(a)(i)'s).

**The id is opaque.** It looks like a citation and it is not one: a consumer
that wants "Rule 24(a)(i)" reads `cite`, and never splits an id to find a
paragraph. `cite` is the field that moves when the package reads the Rules
better — `14a` became `14b` once already — and the id resembling it is a
convenience for the human reading a trace, nothing the data promises. Two
entries may share a cite; they never share an id.

`represented_paragraphs` take the same prefix and the same shape
(`rule:2a` for 2(a)). They are not entries and nothing references them.

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
  identifier space, after `self`/`other`/`pair`: they appear where a fact key
  appears, so no fact may ever be named either. The cost is the same and as
  cheap — every fact key carries a class prefix (`fact:`, `geo:`, `kin:`,
  `hist:`, `env:`) and neither word could be one.
- **Prose fields** — `geometry.json`'s `datum` ("hull", "gunwale",
  "forward masthead light") describes where a measurement is taken from in
  words. It is deliberately not a light reference and does not resolve to
  one.

Not being an identifier says nothing about whether a vocabulary gets a
catalog label; see REQ-LANG-6.

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
