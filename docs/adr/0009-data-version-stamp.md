# ADR 0009 — `data/version.json` is the single version stamp for `data/`

Date: 2026-09-08
Status: accepted

## Context

Nothing in this package's schema or data files carries a version anywhere a
consumer can check it against. colregs-engine's `Evaluation.colregs.version`
names the engine's own resolved npm dependency, not the `data` object it was
actually handed — so a caller evaluating against a stale cached fixture, a
monorepo with mismatched `colregs` versions, or applicability data
reconstructed by hand from an old export gets a result silently attributed
to whatever release happens to be resolved locally: not a crash, not a
warning, just a wrong-but-plausible `Evaluation`.

Two alternatives were considered and rejected:

- **A `version`/`dataVersion` field on each of the seven `data/*.json`
  files.** The files already release as one unit — one npm version, one
  `package.json` — so seven independent copies can only drift, never add
  information.
- **Leaning on the npm package version alone (status quo).** That is
  exactly what colregs-engine already does, and exactly what it cannot
  verify against, because the installed package version and the data
  actually passed into `evaluate()` are two different things once the data
  crosses a process/cache/file boundary.

## Decision

A single manifest, `data/version.json`, is the one source of truth:

- `{"version": "<semver>"}`, matching `package.json` at release time.
- `schema/version.schema.json` validates it, same pattern as every other
  `data/*.json` file.
- `release-please-config.json`'s `extra-files` generic JSON updater keeps
  it in sync on every release, the same way `.release-please-manifest.json`
  already is — the version cannot go stale without the release itself
  failing.

## Consequences

- colregs-engine (or any consumer) can compare its resolved package version
  against `data/version.json` at the point `evaluate()` receives `data`,
  and throw or warn on a mismatch instead of silently reporting the wrong
  version. That comparison is a colregs-engine change, tracked separately.
- `data/version.json` is never hand-edited; release-please owns it.
