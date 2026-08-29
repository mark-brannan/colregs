# colregs

The international collision regulations, and the national amalgamations derived
from them, as language-neutral JSON — with the provenance to check every line
against its source and fixtures a second implementation can verify against.

Data only. No runtime, no dependencies, no inference.

> **Status: pre-release.** Nothing here is complete, and nothing here is fit for
> navigation. See [`docs/requirements.md`](docs/requirements.md) for what it is
> meant to become.

## Coverage

| | |
|---|---|
| **Rules** | Part C, lights (Rules 20–31). Day shapes and Part D signals are not here. |
| **Jurisdictions** | `intl` only. US Inland, Canada and the rest are modelled for but not present. |
| **Conditions** | Night. |

Coverage is stated because silence must not imply it (REQ-SCOPE-6).

## Design

This repo is requirements-first. Coding sessions work against numbered
requirements and cite them; decisions that shaped the design are recorded as
ADRs rather than argued again.

- [`docs/requirements.md`](docs/requirements.md) — the source of truth
- [`docs/adr/`](docs/adr/) — decisions, with the reasoning that produced them

Three ideas carry most of the design:

**The paragraph is the unit.** Rule text, citations and composition all key on
the paragraph path — `27(a)(i)`, not "Rule 27". Citation unit and composition
unit turn out to be the same thing.

**Predicates, not enumerations.** Gates are `length_m < 7`, never a pre-built
list of configurations. Enumerated tables are where prior art silently loses
rules; a predicate cannot omit a case it was never asked about.

**Alternatives are first-class.** COLREGS routinely permits a choice — a
tricolor *in lieu of* separate sidelights, a torch *in lieu of* either. The data
carries every lawful option with its modality and gate, and picks none of them.
Selection belongs to the consumer.

## Licence

Code and fixtures: see `LICENSE`. Rule text and diagrams carry their own terms,
recorded per asset — see `PROVENANCE.md` once data lands.
