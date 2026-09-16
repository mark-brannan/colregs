# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, and others) when working with code in this repository.

## What this is

A **data-only** package: COLREGS 72 and its national amalgamations as
language-neutral JSON. No runtime, no dependencies, no inference engine.
Nothing here decides what a vessel *is doing* — it's a pure function of a
fact record supplied by the consumer.

`docs/requirements.md` is the source of truth for what the package must do;
requirement IDs (`REQ-SCOPE-2`, `REQ-VERIFY-5`, …) are stable and cited by
tests. `docs/adr/` records decisions so they aren't re-argued — for the whole
family (colregs-engine, searoom, nav-wright), one sequence; a bare `ADR NNNN`
anywhere in the family means this directory. An ADR lands by PR. Read both
before making a design change — don't infer intent from the data alone.
`docs/identifiers.md` states the naming scheme: paragraph paths are bare,
every other identifier — an entry, a light, a fact, a relation — carries a
type prefix. Read it before adding one; ADR 0015 says how an entry is named.
`docs/conventions.md` states the ink/pencil convention: a `✎` marker is the
rule for *who may change that item and on what grounds*, not a confidence
note — read it before editing anything a design doc has marked.
`docs/part-b-invariants.md` states Rules 13–19 as trace invariants with stable `INV-` ids; read `REQ-INV-5` (§4.2) first — it forbids choosing a reading.

## Commands

```bash
npm test              # node --test test/*.mjs — the entire verification surface
```

There is no build, lint, or type-check step. `test/*.mjs` is the
whole suite; there's no per-test filter script — use Node's own `--test-name-pattern`
if you need to run one test (e.g. `node --test --test-name-pattern=drift test/data.test.mjs`).

## Architecture

Everything lives in `data/*.json`, cross-referenced by string keys. There is
no code to trace — the "architecture" is the referential integrity between
these files, which `test/data.test.mjs` enforces exhaustively:

- **`data/rules.json`** — the language-neutral skeleton keyed by **paragraph
  path** (`27(a)(i)`, not "Rule 27") — the citation unit everything else
  points at. The words live in `data/text/<jurisdiction>/<edition>/<lang>.<source>.json`,
  one corpus per edition × language × source; `data/editions.json` registers editions, `data/corpora.json` indexes corpora.
- **`data/lights.json`** — the Rule 21 lights: colour, bearing arc, Rule 22
  range. Referenced by id (`light:masthead`, `light:sidelight_starboard`, …) from
  applicability entries.
- **`data/applicability.json`** — the core table: `entries[]`, each
  `when` (predicate over facts) → `lights` → `modality` → `cite`
  (paragraph path) → `jurisdiction`. Entries cross-reference each other by
  id via `rel:includes` / `rel:conditional_includes` / `rel:in_lieu_of` /
  `rel:excludes` / `rel:exempts` / `rel:overrides` (semantics in README.md — **read it before
  editing an entry's relations**, the six verbs are not interchangeable).
- **`data/facts.json`** — the input vocabulary: three orthogonal axes
  (`fact:propulsion`, `fact:activity`, `fact:position`) plus scalar facts, and the
  `navigation.state` (SignalK) → axes decode table.
- **`data/geometry.json`** — Annex I: heights, spacings, colour, intensity;
  `applies_to_entries` references back into `applicability.json`.
- **`data/images.json`** — every file in `images/`: source, SHA-256, paragraphs
  and entries it illustrates, `depicts`, printed `transcript`, `subjects`, `description`, `shapes`.
- **`fixtures/applicability-fixtures.json`** — the cross-implementation
  contract: fact record → expected entry ids. Any implementation, in any
  language, should reproduce these exactly.
- **`data/operations.json`** — the engine interface (ADR 0014): verb →
  input schemas → result schema → companion → fixture file. The
  `*-evaluation` and input schemas under `schema/` it names are the
  machine-readable form of ADR 0011/0012's envelopes.

### The load-bearing ideas

- **The paragraph is the unit.** Citation and composition both key on
  paragraph path, not rule number.
- **Jurisdiction is a dimension** (`intl`, `us/inland`, …), not a fork.
  `intl` is the reserved base; other jurisdictions are deltas — entries
  they don't override are inherited. Only `intl` is populated so far.
- **Predicates, not enumerations.** Gates are `{gte, gt, lte, lt}` /
  list-membership / equality over facts, never pre-built configuration lists.
- **Entries compose.** Multiple entries normally apply to one fact record
  (Rule 28 adds to Rule 23, doesn't replace it).
- **Alternatives are first-class and unresolved.** Where COLREGS permits a
  choice, all lawful options come back with their own modality/gate; the
  package never picks one for the consumer.

### Verification model (`test/data.test.mjs`)

Beyond fixture replay, the suite runs a **drift test** (REQ-VERIFY-2): for
every fixture, any other entry whose entire light output is already shown
must be absent either because its own predicate rules it out, or because a
relation (`rel:includes`/`rel:in_lieu_of`/`rel:excludes`/`rel:exempts`/
`rel:conditional_includes`)
explicitly declares it related to something shown — an undeclared silent
collision between forward and reverse evaluation fails the build. Plus
integrity checks: every citation resolves to `rules.json`, every
cross-reference resolves to an entry id, every light id resolves to
`lights.json`, every image on disk matches its catalogued size/SHA-256,
every fact an entry reads is declared in `facts.json`, and every light's
`arc_deg` matches its `arc.from_deg`/`to_deg` span.

**When adding or editing an applicability entry**, all of the following
need to stay consistent or a test will catch it: the `cite` must exist in
`rules.json`, every `light` id must exist in `lights.json`, every
cross-referenced entry id must exist, every fact key in `when` must be
declared in `facts.json`, and (REQ-VERIFY-3/5) it should be exercised by at
least one fixture and excluded by at least one other, with fixtures on both
sides of any numeric threshold it introduces.

## Releases

Versioning is release-please's job, not a commit's. **Never hand-edit
`package.json`'s `version`, `.release-please-manifest.json`, or
`CHANGELOG.md`, and never create a version tag locally** — merges to `main`
update a standing release pull request automatically; merging that PR is the
release. Write honest conventional-commit subjects (`feat:`, `fix:`, …) —
that's the only input release-please reads. `versioning: always-bump-patch`
in `release-please-config.json` keeps this pre-1.0, so a `feat` is a patch
bump, not a minor. Unlike the pre-major-only settings it replaced, this
doesn't self-cancel at 1.0 — someone has to deliberately remove it then.

## Coverage (changes as jurisdictions/parts land — check README.md, not this file, for current state)

Part C lights (Rules 20–31), `intl` jurisdiction, night only. Day shapes, Part D
signals, and every non-`intl` jurisdiction are modelled for but not yet present.

## Prose budget

One home per argument: a JSON `note` is one sentence plus the Q-/REQ-/ADR id it points at, and the argument lives there. No PR numbers, phase ids, dates or session references in data, fixtures, tests or this file. Budgets are in `docs/budgets.json` (the shared `prose-budget` engine looks there first, then `.prose-budgets.json`, walking up to the git root) and enforced by `npm test` and CI; raising one is a deliberate diff. READMEs describe the project's intended state in present tense; do not flag a README for describing behaviour the code does not yet have.

## Stage: pre-consumer

Published on npm at 0.x. Nobody outside this family depends on it: the only
consumers are colregs-engine and colregs-mcp, repos Solace owns and can fix in
the same afternoon. Until Solace says otherwise that is a fact about the world,
not an estimate, and not an agent's to re-evaluate.

**Breaking changes to the surface need no ceremony.** Reshape a record, drop a
field, split a corpus, retire a relation verb's use in a given place — no
deprecation window, no alias, no compatibility shim, no migration note, no
paragraph weighing who might be hurt. Fix the consumers in their own PR or let
them break and fix them next. `git revert` is the migration path.

**Where the rigour goes instead.** Identifiers, the six relation verbs and their
semantics, editions and corpora, the Part B invariants, the requirement IDs and
the verification notes. Those are expensive to change *later* no matter who is
consuming today, and `docs/identifiers.md`, `docs/requirements.md` and the
ink/pencil convention govern them — including REQ-MODEL-10/11's ban on renaming
or silently removing an identifier, which `test/data.test.mjs` enforces
mechanically against the last release tag. Get the model right; treat the
surface and the version number as disposable.

**Two failure modes, both of which have cost repeated correction.**

- *Withholding.* Not naming, not exporting, not landing a thing because it isn't
  finished. Land it unfinished and named. A name in a design doc gets its entry
  the same day, empty or provisional.
- *Hedging.* Disclaimers, caveats, "for now", "may change", liability language,
  or any sentence that closes an option on risk grounds. Risk is Solace's call,
  always, however small the decision looks and however sure the agent feels. An
  agent that has done risk arithmetic silently, in a subordinate clause, has made
  her decision for her. Write the card; don't narrow the work.

**When this changes:** Solace says so, in as many words. A 1.0 with formal
verification behind it is the earliest plausible date and it is far off. An agent
that finds itself reasoning about consumer breakage before then is reasoning
about nobody.
