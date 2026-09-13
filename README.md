# colregs

Two vessels are closing.  *What must they do?  Who gives way?  What must they display?*

The COLREGS, the International Regulations for Preventing Collisions at Sea, answer all three.  This project
transforms the colregs so that a machine can evaluate and reason about them *deterministically*:
the whole of the rules as structured data, so the same situation always yields the same result,
and every result can be traced back to the rule that produced it.  Going further, the engine
and the rules are then *checked with formal methods*, which means mathematically proving the rule set
is consistent and complete rather than just testing it a bunch and hoping it all works out.

This package is the data: the rules as language-neutral JSON, the USCG's own diagrams, and
enough geometry to draw the lights yourself.  Jurisdictions are deltas on the international
base, so national amalgamations hang off it rather than forking it.

Related packages:
* [colregs](https://github.com/mark-brannan/colregs) - the data and JSON Schema
* [colregs-engine](https://github.com/mark-brannan/colregs-engine) - the engine that evaluates rules
* [colregs-mcp](https://github.com/mark-brannan/colregs-mcp) - an MCP server so AI can use the engine
* [nav-wright](https://github.com/mark-brannan/nav-wright) - draws vessels and displays (stub)
* [searoom](https://github.com/mark-brannan/searoom) - a study tool demo

See a [live demo](https://mark-brannan.github.io/searoom/) of searoom and the colregs data/engine.

> **Status: pre-release.** Not complete, and not fit for navigation. Navigate
> by the published rules.

```text
data/rules.json          the skeleton: paragraph paths, rule numbers, jurisdictions -- no text
data/text/               rule text, one corpus per jurisdiction x language x source
data/corpora.json        index of those corpora and how much each covers
data/lights.json         the six Rule 21 lights: colour, arc, Rule 22 range
data/facts.json          the fact record, and how to decode SignalK navigation.state
data/applicability.json  predicate -> lights, each entry also carrying modality, citation, jurisdiction
data/geometry.json       Annex I: heights, spacings, colour, intensity
data/images.json         every image, its source, and what it illustrates
data/deprecated-identifiers.json  retired identifiers: what they denoted, when, and their replacement
images/                  38 USCG diagrams + 5 arc GIFs
fixtures/                fact records and the entries that apply to them
```

## What this package does not do

It has no runtime and no dependencies. It does not infer anything: it is a
pure function of the fact record, and deciding *that* a vessel is fishing, or
aground, or making way is the caller's job. Nothing here reads a sensor.

It does not select a single display. Where the rules permit a choice, every
lawful option comes back and none is picked. Selection belongs to the consumer.

## Coverage

Every rule with a machine-checkable consequence: Part B conduct, Part C
lights and shapes, Part D sound and light signals, and Annex I geometry.
`intl` is the base; `us/inland`, `ca/inland` and `eu/cevni` are deltas on it.
[`docs/requirements.md`](docs/requirements.md) is the numbered contract for
all of it. One case the Convention cannot state, a vessel made fast to a
mooring buoy, lives only under `us/inland`
([ADR 0008](docs/adr/0008-mooring-buoy-modifier.md)).

## The layers

**Rule text.** Verbatim, keyed by *paragraph path*, like `27(a)(i)`, because
the paragraph is the unit you actually cite. The paths live in a
language-neutral skeleton; the words live in corpora, one per jurisdiction,
language and source, each with its own provenance and legal tier. A mixed
rendering across corpora is never a single authoritative edition. Where a licence bars republishing
a jurisdiction's words, the paragraph is still modelled and its text withheld
rather than paraphrased — evaluation never reads the text.

**Light definitions.** Rule 21's lights with colour, arc as a bearing range,
and Rule 22 range by length band. Bearings run clockwise from right ahead; an
arc whose `from_deg` exceeds its `to_deg` wraps through the bow.

**Facts.** Three orthogonal axes (`fact:propulsion`, `fact:activity`,
`fact:position`), a `fact:making_way` modifier, and scalars such as
`fact:length_m`. There is deliberately no vessel-class field: under COLREGS
what a vessel *is* follows from what it is *doing*. A decode table maps
SignalK's `navigation.state` onto the axes and names what the flattening
loses.

**Applicability entries.** Each is a predicate over facts, a set of lights or
references to other entries, a modality, a citation, and a jurisdiction. Every
entry has an id (`25b`, `27a-mw`) a consumer can point at.

**Identifiers.** Citation-derived ids (paragraph paths, entry ids) carry no
prefix, because the path *is* the citation. Vocabulary ids do:
`light:masthead`, `fact:activity`, `activity:nuc`, `rel:in_lieu_of`. Every
identifier is immutable once published; retirements go through
[`data/deprecated-identifiers.json`](data/deprecated-identifiers.json). See
[`docs/identifiers.md`](docs/identifiers.md).

## Design

Requirements-first: sessions work against the numbered requirements in
[`docs/requirements.md`](docs/requirements.md) and decisions live in
[`docs/adr/`](docs/adr/) rather than being argued again. Four ideas carry
most of it.

**The paragraph is the unit.** Rule text, citations and composition all key
on the paragraph path. Citation unit and composition unit turn out to be the
same thing.

**Jurisdiction is a dimension, not a fork.** Every record carries a
`jurisdiction`: `intl`, or `<country-or-body>/<waters>` as a delta on it.
Entries a jurisdiction doesn't override are inherited, not restated.

**Predicates, not enumerations.** Gates are `fact:length_m < 7`, never a
pre-built list of configurations. Enumerated tables are where prior art
silently loses rules; a predicate cannot omit a case it was never asked about.

**Alternatives are first-class.** A tricolor *in lieu of* separate sidelights,
a torch *in lieu of* either. The data carries every lawful option with its
modality and gate, and picks none of them.

## Predicate semantics

An entry applies when **every** constraint in its `when` is satisfied. An
absent fact never satisfies a constraint, including `not`: a duty is never
laid on a vessel because a consumer left a field out.

| form | where | means |
|---|---|---|
| `{"gte": n}` … `{"lt": n}` | a fact's constraint | numeric comparison |
| `["a", "b"]` | a fact's constraint | membership |
| `"a"` / `true` / `12` | a fact's constraint | equality |
| `{"not": C}` | a fact's constraint | the fact is present and does not satisfy `C` |
| `{"any_of": [C, …]}` | a fact's constraint | the fact satisfies at least one `C` |
| `"any_of": [W, …]` | a key of a `when` | at least one sub-predicate `W` holds |

Entries **compose**: several apply to one fact record, and Rule 26 adds to
Rule 23 rather than replacing it. A condition on whether a paragraph applies
at all goes in the predicate; a condition on which of two applicable
paragraphs prevails is a relation.

| relation | meaning |
|---|---|
| `rel:includes` | import the referenced entry's **lights only**, never its predicate |
| `rel:conditional_includes` | import lights when the stated `when` holds; `one_of` is a set of legal alternatives |
| `rel:in_lieu_of` | this entry's lights replace the referenced entries' lights |
| `rel:excludes` | must not be shown together: a pick-one between alternatives, never one obligation vetoing another |
| `rel:exempts` | the referenced requirement does not apply (30(e)) |
| `rel:overrides` | this paragraph's requirement prevails over the referenced one's when both apply (Rule 18; Rule 26(a) over Rule 30's anchor lights) |

Modality is `shall`, `may`, `shall-if-practicable`, `shall-not`,
`shall-not-impede`, or `conditional` with a `modality_by` table when it turns
on a fact.

Most entries read one vessel and produce lights. The Part B entries read
**two**, a situation rather than a fact record, and produce an `effect`:
which section governs, which vessel gives way, whether the encounter is
`head-on`, `crossing` or `overtaking`. They address each vessel through a
subject segment (`own:fact:activity`, `other:fact:propulsion`,
`pair:geo:in_sight`); a key with no subject means `own:`. The encounter
sectors partition relative bearing, so no crossing sector is enumerated and
none can drift. [`docs/identifiers.md`](docs/identifiers.md) has the
vocabulary, [`docs/part-b-invariants.md`](docs/part-b-invariants.md) the
invariants, and `fixtures/situation-fixtures.json` is the contract.

## Verifying

```bash
npm test
```

Every fixture reproduces exactly; every citation, cross-reference, light and
geometry reference resolves; every image is on disk with its SHA-256 recorded;
every fact a predicate reads is declared. A drift test cross-checks fact
record to lights and lights back to entries, and fails on any collision the
data doesn't declare through a relation. Every numeric gate has fixtures
either side of its threshold, and every entry is exercised by at least one
fixture and absent from another. The encounter sweeps assert that exactly one
encounter applies at every bearing, and that no steady-bearing geometry makes
both vessels give-way.

`fixtures/applicability-fixtures.json` and `fixtures/situation-fixtures.json`
are the cross-implementation contract: an implementation in any language
should reproduce those exactly.

## Provenance and licence

Rule text, the `NRHB_*` diagrams and the five `*arc.gif` files are USCG
publications, public domain; see [PROVENANCE.md](PROVENANCE.md). The
compilation is Apache-2.0.

Not authoritative, not endorsed by the Coast Guard. Navigate by the published
rules. The `ca/inland` delta carries the same condition its licence does: it
must not be represented as an official version.
