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
  requirements and not part of the identifier space REQ-MODEL-10 binds.
- **Shape keys** — `when`, `one_of`, `cite`, `lights`, and the SignalK
  decode table's `also_activity` and `annex_ii_signal` — are JSON structure,
  not names the data is addressed by. Only the values inside them can be
  identifiers, and where they are (`also_activity` holds an activity value)
  they are prefixed.
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
