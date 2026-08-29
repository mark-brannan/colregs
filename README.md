# colregs

The COLREGS 72 navigation *light* rules as language-neutral JSON, plus the
USCG's own diagrams and enough geometry to draw the lights yourself.

There is no code in this package, only data. It feeds two consumers from one
source of truth: an educational app that wants every rule, and a switching
plugin that wants the subset a boat can actually act on.

> **Status: pre-release.** Not complete, and not fit for navigation. Navigate
> by the published rules.

```
data/rules.json          verbatim rule text, keyed by paragraph path
data/lights.json         the six Rule 21 lights: colour, arc, Rule 22 range
data/facts.json          the fact record, and how to decode SignalK navigation.state
data/applicability.json  predicate -> lights -> modality -> citation
data/geometry.json       Annex I: heights, spacings, colour, intensity
data/images.json         every image, its source, and what it illustrates
images/                  38 USCG diagrams + 5 arc GIFs
fixtures/                fact records and the entries that apply to them
```

**This release covers the International rules, at night.** No Inland (that
includes the Great Lakes and Western Rivers variants), no Canada, no day
shapes. Every entry already carries a `ruleset` field, so adding a
jurisdiction later doesn't disturb what's here.

The aim is wider than that, and wider than the US. National amalgamations
(US Inland, Canada, and whoever comes after) are meant to land as *deltas*
from the international text, each entry inheriting from `intl` unless the
jurisdiction departs from it. Other parts of the rules are on the list too,
starting with day shapes and the Part D sound and light signals. The
requirements spell this out under REQ-SCOPE and REQ-PART.

Development is requirements-first: changes are made against the numbered
requirements in [`docs/requirements.md`](docs/requirements.md) and cite them,
and decisions that shaped the design are written down as ADRs in
[`docs/adr/`](docs/adr/) instead of being argued again.

## The four layers

**Rule text.** Keyed by *paragraph path*, like `27(a)(i)` or `25(d)(ii)`,
because the paragraph is the unit you actually cite. The text is verbatim
International text; Inland-only inserts were stripped rather than paraphrased.

**Light definitions.** This layer is Rule 21. Each light carries its colour,
its arc as a bearing range, and its minimum visible range by length band from
Rule 22. Bearings run in degrees clockwise from right ahead, and an arc whose
`from_deg` exceeds its `to_deg` wraps through the bow. So the masthead light
is 247.5° to 112.5°, which is 225° of arc.

**Facts.** Three orthogonal axes (`propulsion`, `activity`, `position`), a
`making_way` modifier that refines `underway`, and scalars such as `length_m`
and `tow_length_m`. There is deliberately no vessel-class field. Under COLREGS
what a vessel *is* follows from what it is *doing*, so classification falls
out of the axes on its own.

SignalK's `navigation.state` flattens all of that into one enum. `facts.json`
therefore carries a decode table, the enum values it can't decode, and the
five places where the flattening loses information. Fishing at anchor and
making-way are the two of those that matter in practice.

**Applicability entries.** Each entry is a predicate over facts, a set of
lights or references to other entries, a modality, and a citation. Every entry
has an id (`25b`, `27a-mw`) that both consumers can point at.

## Predicate semantics

An entry applies when every constraint in its `when` is satisfied. An absent
fact never satisfies a constraint. Numeric constraints use
`{gte, gt, lte, lt}`, a list means membership, and anything else is equality.
One special case: `activity: "ram"` also matches `ram_underwater`, which
refines it.

Entries compose. Several can apply to one fact record, so Rule 28 or Rule 26
add their lights to Rule 23's rather than replacing them. The relations
between entries:

| relation | meaning |
|---|---|
| `includes` | import the referenced entry's **lights only**, never its predicate |
| `conditional_includes` | import when the stated `when` holds; `one_of` is a set of legal alternatives |
| `in_lieu_of` | these lights replace the referenced entries' lights |
| `excludes` | must not be shown together (25(c) and the tricolor) |
| `exempts` | the referenced requirement does not apply (30(e)) |

Where the rules permit a choice, the data keeps every lawful option instead of
picking one. A 12 m sloop under sail has three legal displays: 25(a), the
25(b) tricolor, or 25(a) plus the 25(c) red-over-green. Which one a given boat
shows depends on what's installed, and that decision belongs to the consumer.

Modality is `shall`, `may`, `shall-if-practicable`, or `conditional` with a
`modality_by` table when it turns on a fact. 23(a)(ii), for instance, is
`shall` at 50 m and above and `may` below.

## What this package does not do

It doesn't infer anything. The data is a pure function of the fact record;
deciding *that* a vessel is making way, or fishing, or aground belongs to a
separate plugin that lets the user set the state or configure how it's
derived. Nothing here reads a sensor.

It also doesn't pick a single display. Where the rules offer alternatives,
you get all of them back.

## Verifying

```bash
npm test
```

Nine checks: the fixtures reproduce exactly, every citation resolves to a
paragraph that exists, every cross-reference resolves to an entry, every named
light is defined, every image is on disk with the recorded SHA-256, every
decoded `navigation.state` value is a legal axis value, every fact a predicate
reads is declared, every geometry reference resolves, and every arc spans what
it claims.

`fixtures/applicability-fixtures.json` is the cross-implementation contract.
An implementation in any language should reproduce those entry sets exactly.

## Provenance and licence

Rule text and the `NRHB_*` diagrams are USCG publications, public domain. The
five `*arc.gif` files came from an older repo and their provenance is still
unresolved; see [PROVENANCE.md](PROVENANCE.md). The compilation is MIT.

This is not an authoritative source and the Coast Guard hasn't endorsed it.
