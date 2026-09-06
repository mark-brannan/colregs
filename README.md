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

A `when` is a conjunction, and two constructs open it up. `{"not": C}` is a
constraint satisfied when the fact does *not* satisfy `C`; `any_of` is
disjunction, holding sub-predicates as a key of a `when` and constraints as the
value of a fact. **`not` over an absent fact is unsatisfied**, like every other
constraint over an absent fact — so `{"not": C}` and `C` are both false on a
record that never mentions the fact, and the two are not complements there. That
is deliberate: predicates stay conservative, and a duty is never laid on a vessel
because a consumer left a field out. It also means `not` is a constraint on one
fact and never a key of a `when` — a predicate-level negation would be satisfied
by silence, which is the one thing the absent-fact rule is there to forbid. Where
a paragraph really does mean "any vessel other than …", the negation goes on the
fact the paragraph names, and the fact has to be present for the entry to apply.

| form | where | means |
|---|---|---|
| `{"gte": n}` … `{"lt": n}` | a fact's constraint | numeric comparison |
| `["a", "b"]` | a fact's constraint | membership |
| `"a"` / `true` / `12` | a fact's constraint | equality |
| `{"not": C}` | a fact's constraint | the fact is present and does not satisfy `C` |
| `{"any_of": [C, …]}` | a fact's constraint | the fact satisfies at least one `C` |
| `"any_of": [W, …]` | a key of a `when` | at least one sub-predicate `W` holds |

The `ram`/`ram_underwater` refinement belongs to the *value*, not to one
constraint form: it applies to equality, to list membership and to each
`any_of` disjunct alike, and `{"not": C}` negates the refined reading rather
than sneaking underneath it. It used to fire on a scalar constraint only, so a
list quietly missed it; that is fixed, and a list and `{"any_of": […]}` are now
interchangeable wherever both are legal.

Some facts are **derived** rather than supplied. `facts.json`'s `derived`
section holds them, each with a decode table that is its definition — an ordered
list of predicate/value rows, first match wins — read the same way as the
SignalK `navigation.state` table. `fact:rule18_class` is the one that exists: a
vessel's rank under Rule 18, decoded from her propulsion, her activity and the
27(c) and WIG booleans, because Rule 18 ranks vessels by the Rule 3 terms of art
and `fact:activity` answers a different question — what she *shows*. A consumer
never supplies a derived fact.

Entries **compose**: several apply to one fact record, and Rule 28 or Rule 26
add to Rule 23 rather than replacing it. Relations between them:

| relation | meaning |
|---|---|
| `rel:includes` | import the referenced entry's **lights only**, never its predicate |
| `rel:conditional_includes` | import lights when the stated `when` holds; `one_of` is a set of legal alternatives |
| `rel:in_lieu_of` | this entry's lights replace the referenced entries' lights |
| `rel:excludes` | must not be shown together (25(c) and the tricolor) |
| `rel:exempts` | the referenced requirement does not apply (30(e)) |
| `rel:overrides` | the superiority relation: this paragraph's requirement prevails over the referenced one's when both apply (Rule 18's "except where Rules 9, 10 and 13 otherwise require") |

A condition on whether a paragraph applies to the vessel at all goes in the
predicate; a condition on which of two applicable paragraphs prevails is a
relation. Delete the other paragraph: if this one is still true of the vessel,
it is a relation. Rule 28 at anchor is a predicate; Rule 18 displacing Rule 15's
role is `rel:overrides` (REQ-MODEL-13, ADR 0005 §4).

Where the rules permit a choice, the data keeps every lawful option instead of
picking one. A 12 m sloop under sail has three legal displays: 25(a), the
25(b) tricolor, or 25(a) plus the 25(c) red-over-green. Which one a given boat
shows depends on what's installed, and that decision belongs to the consumer.

Modality is `shall`, `may`, `shall-if-practicable`, `shall-not`,
`shall-not-impede`, or `conditional` with a `modality_by` table when it turns
on a fact (23(a)(ii) is `shall` at 50 m and above, `may` below).

Most entries read one vessel and produce lights. A few read **two** — a
situation, not a fact record — and produce an `effect` instead. Rules 4, 11
and 19(a) say which section of Part B governs; Rules 18, 9, 10, 12 and 15 say
which vessel gives way, reading `fact:rule18_class` rather than re-listing the
activity axis; and Rules 7(d), 13, 14 and 15 say what kind of encounter it is —
`head-on`, `crossing` or `overtaking` — or that risk of collision exists.
Those carry `category` and `subjects: 2`, and address each vessel
through a subject segment: `own:fact:activity`, `other:fact:propulsion`,
`pair:geo:in_sight`. A key with no subject means `own:`, so nothing above
changes. `docs/identifiers.md` has the namespace and the effect vocabulary;
`fixtures/situation-fixtures.json` is their contract.

The three encounter types **partition** relative bearing. 13(b)'s overtaking
sector is written once, as one constraint; Rule 15's crossing is `not` over
that same constraint and `not` over Rule 14's head-on cone, so no crossing
sector is enumerated anywhere and none can drift out of step. The suite sweeps
both vessels' bearings in half-degree steps and asserts that exactly one
encounter applies at every point, that 13(b)'s 22.5°-abaft-the-beam edge is
exclusive on both sides, and that Rule 13(d)'s latch holds the classification
at `overtaking` however far the bearing afterwards draws out. The numbers the
Rules do not state — what counts as an appreciable bearing change, how wide
"nearly reciprocal" is — are declared once in `facts.json` under
`situation.constants`, marked pencil, and read from there by every entry.

A situation can state geometry no two vessels can occupy, so the suite checks
every fixture that states its kinematics against them (REQ-VERIFY-8): the two
relative bearings must be two readings of one line of sight, positions must
reproduce range and bearing, and CPA, TCPA and bearing rate must be the ones
the headings and speeds give. The equations and tolerances are declared once in
`facts.json` under `situation.geometry.consistency`. The sweeps construct
situations that pass the same check, and the property that no two vessels are
both give-way is asserted over a sweep of steady-bearing geometries — where it
is a theorem — with the both-starboard geometry that breaks it pinned as one
the check rejects.

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

Rule text, the `NRHB_*` diagrams and the five `*arc.gif` files are USCG
publications, public domain; see [PROVENANCE.md](PROVENANCE.md). The
compilation is Apache-2.0.

Not authoritative, not endorsed by the Coast Guard. Navigate by the published
rules.
