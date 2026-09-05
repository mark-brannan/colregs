# colregs

The COLREGS 72 navigation *light* rules as language-neutral JSON, plus the
USCG's own diagrams and enough geometry to draw the lights yourself. Built as
the base other countries' national amalgamations hang off of, not scoped to
one country's rulebook.

Data only. No runtime, no dependencies, no inference.

> **Status: pre-release.** Not complete, and not fit for navigation. Navigate
> by the published rules.

```text
data/rules.json          verbatim rule text, keyed by paragraph path and jurisdiction
data/lights.json         the six Rule 21 lights: colour, arc, Rule 22 range
data/facts.json          the fact record, and how to decode SignalK navigation.state
data/applicability.json  predicate -> lights, each entry also carrying modality, citation, jurisdiction
data/geometry.json       Annex I: heights, spacings, colour, intensity
data/images.json         every image, its source, and what it illustrates
data/deprecated-identifiers.json  retired identifiers: what they denoted, when, and their replacement
images/                  38 USCG diagrams + 5 arc GIFs
fixtures/                fact records and the entries that apply to them
```

## Coverage

Part C lights (Rules 20-31) only, `intl` jurisdiction only, night only. Day
shapes, Part D signals, and every other jurisdiction (US Inland, Canada,
CEVNI) are on the roadmap in [`docs/requirements.md`](docs/requirements.md)
but not present here.

## The four layers

**Rule text.** Keyed by *paragraph path*, like `27(a)(i)` or `25(d)(ii)`,
because the paragraph is the unit you actually cite. The text is verbatim
International text; Inland-only inserts were stripped rather than paraphrased.

**Light definitions.** This layer is Rule 21. Each light carries its colour,
its arc as a bearing range, and its minimum visible range by length band from
Rule 22. Bearings run in degrees clockwise from right ahead, and an arc whose
`from_deg` exceeds its `to_deg` wraps through the bow. So the masthead light
is 247.5° to 112.5°, which is 225° of arc.

**Facts.** Three orthogonal axes (`fact:propulsion`, `fact:activity`,
`fact:position`), a `fact:making_way` modifier that refines
`position:underway`, and scalars such as `fact:length_m` and
`fact:tow_length_m`. There is deliberately no vessel-class field. Under COLREGS
what a vessel *is* follows from what it is *doing*, so classification falls
out of the axes on its own.

SignalK's `navigation.state` flattens all of that into one enum. `facts.json`
therefore carries a decode table, the enum values it can't decode, and the
five places where the flattening loses information. Fishing at anchor and
making-way are the two of those that matter in practice.

**Applicability entries.** Each entry is a predicate over facts, a set of
lights or references to other entries, a modality, a citation, and a
jurisdiction. Every entry has an id (`25b`, `27a-mw`) that both consumers can
point at.

**Identifiers.** Two classes, with opposite requirements. Citation-derived ids
— paragraph paths and the entry ids built from them — carry no prefix, because
the path *is* the citation. Vocabulary ids do: `light:masthead`,
`fact:activity`, `activity:nuc`, `rel:in_lieu_of`. See
[`docs/identifiers.md`](docs/identifiers.md).

## Design

This repo is requirements-first. Coding sessions work against numbered
requirements and cite them; decisions that shaped the design are recorded as
ADRs rather than argued again.

- [`docs/requirements.md`](docs/requirements.md): the source of truth
- [`docs/adr/`](docs/adr/): decisions, with the reasoning that produced them

Three ideas carry most of the design:

**The paragraph is the unit.** Rule text, citations and composition all key on
the paragraph path (`27(a)(i)`, not "Rule 27"). Citation unit and composition
unit turn out to be the same thing.

**Jurisdiction is a dimension, not a fork.** Every rule-text record and every
applicability entry carries a `jurisdiction`: `intl` (the reserved base value)
or `<country-or-body>/<waters>` (`us/inland`, `eu/cevni`). A jurisdiction is a
delta on `intl`; entries it doesn't override are inherited, not restated
(REQ-SCOPE-2/3). Geography that merely gates a rule inside one jurisdiction
(Great Lakes, Western Rivers) is an ordinary fact a predicate reads, not a
jurisdiction of its own (REQ-SCOPE-5).

**Predicates, not enumerations.** Gates are `fact:length_m < 7`, never a pre-built
list of configurations. Enumerated tables are where prior art silently loses
rules; a predicate cannot omit a case it was never asked about.

**Alternatives are first-class.** COLREGS routinely permits a choice: a
tricolor *in lieu of* separate sidelights, a torch *in lieu of* either. The data
carries every lawful option with its modality and gate, and picks none of them.
Selection belongs to the consumer.

## Predicate semantics

An entry applies when **every** constraint in its `when` is satisfied. An
absent fact never satisfies a constraint. Numeric constraints are
`{gte, gt, lte, lt}`; a list means membership; anything else is equality.
`fact:activity: "activity:ram"` also matches `activity:ram_underwater`, which
is a refinement of it.

Entries **compose**: several apply to one fact record, and Rule 28 or Rule 26
add to Rule 23 rather than replacing it. Relations between them:

| relation | meaning |
|---|---|
| `rel:includes` | import the referenced entry's **lights only**, never its predicate |
| `rel:conditional_includes` | import lights when the stated `when` holds; `one_of` is a set of legal alternatives |
| `rel:in_lieu_of` | this entry's lights replace the referenced entries' lights |
| `rel:excludes` | must not be shown together (25(c) and the tricolor) |
| `rel:exempts` | the referenced requirement does not apply (30(e)) |

Where the rules permit a choice, the data keeps every lawful option instead of
picking one. A 12 m sloop under sail has three legal displays: 25(a), the
25(b) tricolor, or 25(a) plus the 25(c) red-over-green. Which one a given boat
shows depends on what's installed, and that decision belongs to the consumer.

Modality is `shall`, `may`, `shall-if-practicable`, or `conditional` with a
`modality_by` table when it turns on a fact (23(a)(ii) is `shall` at 50 m and
above, `may` below).

## What this package does not do

It does not infer anything. It is a pure function of the fact record. Deciding
*that* a vessel is making way, or fishing, or aground is somebody else's job.
Nothing here reads a sensor.

It does not select a single display. Where the rules offer alternatives, all of
them come back.

## Verifying

```bash
npm test
```

Every fixture reproduces exactly; every citation, cross-reference, light and
geometry reference resolves; every image is on disk with its SHA-256 recorded;
every decoded `navigation.state` value and every fact a predicate reads is
declared.

A **drift test** (REQ-VERIFY-2) cross-checks two directions: forward, fact
record to lights, and reverse, lights already shown to which other entries
could explain them. It fails on any collision the data doesn't already
declare through `rel:includes`/`rel:in_lieu_of`/`rel:excludes`/
`rel:exempts`/`rel:conditional_includes`.

Every numeric gate that affects *which entries apply* has fixtures immediately
either side of its threshold (REQ-VERIFY-5), and every entry is exercised by
at least one fixture and absent from at least one other (REQ-VERIFY-3). Three
gates that affect only *modality*, not which entries apply, are flagged as an
open question rather than fixtured against a schema that can't express the
distinction; see [Q-5](docs/requirements.md#9-open-questions).

`fixtures/applicability-fixtures.json` is the cross-implementation contract: an
implementation in any language should reproduce those entry sets exactly.

## Provenance and licence

Rule text and `NRHB_*` diagrams are USCG publications, public domain. The five
`*arc.gif` files came from an older repo and their provenance is unresolved;
see [PROVENANCE.md](PROVENANCE.md). The compilation is Apache-2.0.

Not authoritative, not endorsed by the Coast Guard. Navigate by the published
rules.
