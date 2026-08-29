# ADR 0001 — Package name, and jurisdiction as a dimension

Date: 2026-08-29
Status: accepted

## Context

The data package needed a name, and the naming had to fit an existing family:
`ampacity` and `coastlines` (plain or term-of-art nouns for ready-made data),
`portolani` (an archaic term of art naming a format), `wire-wright` and
`coast-wright` (code that derives or draws).

Three candidates were considered.

**`fanali`** — Italian for ships' lanterns. Matched the `portolani` register
exactly. Rejected: a *fanale* is a lantern, and day shapes are black balls,
cones and diamonds. Part C's own title is "Lights and Shapes" precisely because
no single word covers the pair, so the name would have been wrong as soon as
day shapes landed.

**`navrules`** — the USCG's term. Rejected on reflection: "Navigation Rules" is
the name of *one country's amalgamation*. It denotes COLREGS plus the US Inland
Navigational Rules plus 33 CFR 26 and the VTS regs. Naming a multi-jurisdiction
package after one jurisdiction's compilation is backwards.

**`colregs`** — accepted. It was unclaimed on npm, which for a canonical domain
term is unusual enough to be worth taking on sight.

## Decision

The package is **`colregs`**, and jurisdiction is a first-class dimension
(REQ-SCOPE-2) rather than a fork or a later bolt-on.

The name and the data model agree, which is the actual argument:

The national amalgamations are *deltas on COLREGS*, not peer bodies of rules.
The US Inland Navigational Rules were harmonised with COLREGS in 1980 and share
its rule numbering — Rule 25 is Rule 25 in both. That is why keying on paragraph
paths works across jurisdictions at all. COLREGS is the stem every national
version grows from, so it is the correct name for the trunk, and each
jurisdiction is a set of overrides hanging off it.

`navrules` would have been actively wrong under this model. `fanali` would have
been too narrow. Neither failure was about taste.

## Consequences

- The README must state covered jurisdictions explicitly (REQ-SCOPE-6). A name
  this broad promises more than v1 ships, and the honest fix is disclosure, not
  a narrower name that would have to change later.
- `navrules`, `inland-rules`, `33-cfr-83` and `cevni` go in package keywords
  (REQ-PKG-5) so jurisdiction-specific searches land.
- Jurisdictions become a work queue rather than a scope question. Ranked by
  delta-worth-modelling against licence cleanliness, and all licence terms
  below are **unverified** (Q-3):

  | Jurisdiction | Instrument | Delta | Licence, unverified |
  |---|---|---|---|
  | `us/inland` | 33 CFR 83–90 | large | public domain |
  | `eu/cevni` | CEVNI (UNECE) / RPNR | largest of any | UN copyright — the risk |
  | `ca/inland` | Collision Regs, C.R.C. c.1416 | moderate | Reproduction of Federal Law Order |
  | `de/binnen` | SeeSchStrO / BinSchStrO | large | §5 UrhG, *amtliche Werke* |
  | `uk` | SI 1996/75 | near-zero | OGL v3.0 |
  | `au` | Marine Order 30 | near-zero | CC BY 4.0 |

  UK and Australia are worth taking *because* their delta is near-zero: they
  cost almost nothing and let the README name six jurisdictions honestly.
  CEVNI is the interesting one — genuinely different inland light
  configurations, no prior art as structured data, and the only licence on the
  list that might block outright.

## Not decided here

The switching plugin's name and the renderer's name. The plugin needs a
`signalk-` prefix for app-store discovery regardless; `lamp-wright` and
`fanali` are both available and both fit the family for the renderer.
