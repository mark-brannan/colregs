# colregs

COLREGS 72 navigation *light* rules as language-neutral JSON, with the USCG's
own diagrams and the geometry to draw the lights yourself.

Data only — no code. Two consumers share one source of truth: an educational
app that wants every rule, and a switching plugin that wants the subset a boat
can actually act on.

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

**Scope of this release: the International rules, at night.** Inland (including
the Great Lakes and Western Rivers deltas) and Canada are not here. `ruleset`
is already a dimension on every entry, so adding them is additive. Day shapes
are not here either.

Requirements live in [`docs/requirements.md`](docs/requirements.md); design
decisions are recorded in [`docs/adr/`](docs/adr/).

## The four layers

**Rule text.** Keyed by *paragraph path* — `27(a)(i)`, `25(d)(ii)` — because
the paragraph, not the rule, is the citation unit. Verbatim, International
text only. Inland-only inserts were stripped rather than paraphrased.

**Light definitions.** Rule 21 is this layer. Each light carries its colour,
its arc as a bearing range, and its minimum range by length band from Rule 22.
Bearings are degrees clockwise from right ahead; an arc whose `from_deg`
exceeds its `to_deg` wraps through the bow. The masthead light is
247.5° → 112.5°, 225° of it.

**Facts.** Three orthogonal axes — `propulsion`, `activity`, `position` — plus
`making_way` refining `underway`, plus scalars (`length_m`, `tow_length_m`,
`max_speed_kn`, …). There is no separate vessel-class field: under COLREGS what
a vessel *is* follows from what it is *doing*, so classification falls out of
the axes.

SignalK's `navigation.state` flattens all three axes into one enum, so
`facts.json` carries a decode table, the values it cannot decode, and the five
places where the flattening loses information — fishing at anchor and
making-way being the two that matter.

**Applicability entries.** Each entry is a predicate over facts, a set of
lights or references to other entries, a modality, and a citation. Every entry
has an id (`25b`, `27a-mw`) that both consumers can point at.

## Predicate semantics

An entry applies when **every** constraint in its `when` is satisfied. An
absent fact never satisfies a constraint. Numeric constraints are
`{gte, gt, lte, lt}`; a list means membership; anything else is equality.
`activity: "ram"` also matches `ram_underwater`, which is a refinement of it.

Entries **compose** — several apply to one fact record, and Rule 28 or Rule 26
add to Rule 23 rather than replacing it. Relations between them:

| relation | meaning |
|---|---|
| `includes` | import the referenced entry's **lights only**, never its predicate |
| `conditional_includes` | import when the stated `when` holds; `one_of` is a set of legal alternatives |
| `in_lieu_of` | these lights replace the referenced entries' lights |
| `excludes` | must not be shown together (25(c) and the tricolor) |
| `exempts` | the referenced requirement does not apply (30(e)) |

Alternatives are first-class. A 12 m sloop under sail has three legal displays
— 25(a), the 25(b) tricolor, or 25(a) plus the 25(c) red-over-green — and the
data says so rather than picking one. Which one a boat shows is decided by
what is actually installed, not by the rules.

Modality is `shall`, `may`, `shall-if-practicable`, or `conditional` with a
`modality_by` table when it turns on a fact (23(a)(ii) is `shall` at 50 m and
above, `may` below).

## What this package does not do

It does not infer anything. It is a pure function of the fact record. Deciding
*that* a vessel is making way, or fishing, or aground is somebody else's job —
a separate plugin that lets the user set the state or configure how it is
derived. Nothing here reads a sensor.

It does not select a single display. Where the rules offer alternatives, all of
them come back.

## Verifying

```bash
npm test
```

Nine checks: the fixtures reproduce exactly, every citation resolves to a
paragraph that exists, every cross-reference resolves to an entry, every named
light is defined, every image is on disk with the SHA-256 recorded, every
decoded `navigation.state` value is a legal axis value, every fact a predicate
reads is declared, every geometry reference resolves, and every arc spans what
it claims.

`fixtures/applicability-fixtures.json` is the cross-implementation contract: an
implementation in any language should reproduce those entry sets exactly.

## Provenance and licence

Rule text and `NRHB_*` diagrams are USCG publications, public domain. The five
`*arc.gif` files came from an older repo and their provenance is unresolved —
see [PROVENANCE.md](PROVENANCE.md). The compilation is MIT.

Not authoritative, not endorsed by the Coast Guard.
