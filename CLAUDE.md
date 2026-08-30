# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **data-only** package: COLREGS 72 and its national amalgamations as
language-neutral JSON. No runtime, no dependencies, no inference engine.
Nothing here decides what a vessel *is doing* — it's a pure function of a
fact record supplied by the consumer.

`docs/requirements.md` is the source of truth for what the package must do;
requirement IDs (`REQ-SCOPE-2`, `REQ-VERIFY-5`, …) are stable and cited by
tests. `docs/adr/` records decisions so they aren't re-argued. Read both
before making a design change — don't infer intent from the data alone.
`docs/identifiers.md` states the naming scheme: citation-derived identifiers
are bare, vocabulary identifiers carry a type prefix. Read it before adding
a light, a fact or a relation.

## Commands

```bash
npm test              # node --test test/*.mjs — the entire verification surface
```

There is no build, lint, or type-check step. `test/data.test.mjs` is the
whole suite; there's no per-test filter script — use Node's own `--test-name-pattern`
if you need to run one test (e.g. `node --test --test-name-pattern=drift test/data.test.mjs`).

## Architecture

Everything lives in `data/*.json`, cross-referenced by string keys. There is
no code to trace — the "architecture" is the referential integrity between
these files, which `test/data.test.mjs` enforces exhaustively:

- **`data/rules.json`** — verbatim rule text keyed by **paragraph path**
  (`27(a)(i)`, not "Rule 27") — the citation unit everything else points at.
- **`data/lights.json`** — the Rule 21 lights: colour, bearing arc, Rule 22
  range. Referenced by id (`light:masthead`, `light:sidelight_starboard`, …) from
  applicability entries.
- **`data/applicability.json`** — the core table: `entries[]`, each
  `when` (predicate over facts) → `lights` → `modality` → `cite`
  (paragraph path) → `jurisdiction`. Entries cross-reference each other by
  id via `rel:includes` / `rel:conditional_includes` / `rel:in_lieu_of` /
  `rel:excludes` / `rel:exempts` (semantics in README.md — **read it before editing an entry's
  relations**, the five verbs are not interchangeable).
- **`data/facts.json`** — the input vocabulary: three orthogonal axes
  (`fact:propulsion`, `fact:activity`, `fact:position`) plus scalar facts, and the
  `navigation.state` (SignalK) → axes decode table.
- **`data/geometry.json`** — Annex I: heights, spacings, colour, intensity;
  `applies_to_entries` references back into `applicability.json`.
- **`data/images.json`** — every file in `images/`, its source, SHA-256, and
  which paragraphs/entries it illustrates.
- **`fixtures/applicability-fixtures.json`** — the cross-implementation
  contract: fact record → expected entry ids. Any implementation, in any
  language, should reproduce these exactly.

### The load-bearing ideas

- **The paragraph is the unit.** Citation and composition both key on
  paragraph path, not rule number.
- **Jurisdiction is a dimension** (`intl`, `us/inland`, …), not a fork.
  `intl` is the reserved base; other jurisdictions are deltas — entries
  they don't override are inherited. Only `intl` is populated so far.
- **Predicates, not enumerations.** Gates are `{gte, gt, lte, lt}` /
  list-membership / equality over facts, never pre-built configuration
  lists.
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
that's the only input release-please reads. `bump-patch-for-minor-pre-major`
in `release-please-config.json` keeps this pre-1.0, so a `feat` is a patch
bump, not a minor, until that's deliberately turned off at 1.0.

## Coverage (changes as jurisdictions/parts land — check README.md, not this file, for current state)

Part C lights (Rules 20–31), `intl` jurisdiction, night only. Day shapes,
Part D signals, and every non-`intl` jurisdiction are modelled for but not
yet present.
