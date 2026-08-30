# ADR 0004 — Licence layering across the family, and Apache-2.0 here

Date: 2026-08-29
Status: accepted

## Context

`colregs` shipped 0.1.1 under MIT. `2669e2a` changed the compilation to
Apache-2.0 with the rationale in the commit body and nowhere else. The
external review of PR #4 flagged this as the most irreversible change in
flight and the only one with no record: relicensing is cheap while the
copyright holder is one person, and stops being cheap at the first merged
external contribution — which is precisely what the language work exists
to invite.

This ADR records the decision taken in the 2026-08-29 naming/branding
session. It is a record of a ruling already made, not a re-argument.

## Decision

Licensing is **layered across the product family**, matched to where the
novel work lives:

| package | licence | status |
|---|---|---|
| `colregs` | Apache-2.0 | landed on `main`, `2669e2a` |
| `colregs-engine` | Apache-2.0 | repo staked, pre-code |
| `nav-wright` | AGPL-3.0 | repo staked, pre-code |
| `searoom` (the app) | AGPL-3.0 | repo seeded |

**Why permissive at the data layer.** The rule text is public law and
carries no copyright claim here. The fixture file is deliberately a
cross-implementation contract (REQ-VERIFY-1), so the evaluation logic is
reimplementable by anyone whatever the engine is licensed as — restricting
the data or the engine protects almost nothing. Adoption is the point: the
data package sells the ecosystem. Protection of the novel work — renderer,
app — lives one layer up under AGPL-3.0, where a sole copyright holder can
still dual-license store builds.

**Why Apache-2.0 rather than MIT.** Two reasons. The explicit patent grant,
where MIT's is ambiguous. And ecosystem fit: signalk-server and the
prominent community plugins are Apache-2.0, and the planned switching
plugin loads in-process into that Apache-2.0 host, so every layer it
consumes has to stay permissive regardless. Sampled 2026-08-30, 19 of the
top 20 SignalK-ecosystem projects by stars are Apache-2.0 — table in
<https://github.com/mark-brannan/colregs/pull/4#issuecomment-5467185331>.

**npm timing is deliberate.** The change was committed as `chore:` so
release-please cuts no discrete version for it. npm stays `colregs@0.1.1`
under MIT until the next release — the i18n work — ships. Published
artifacts keep the licence they shipped with permanently; the switch
applies from the next release forward, never retroactively.

## Consequences

- Recorded as **GATE-6** (requirements §10). Closing event: the first
  merged external contribution. After it, any relicense needs every
  contributor's consent.
- Already-published npm versions are irreversibly under their shipped
  licence. The gate governs future releases only.
- The gate is **held open deliberately**, by REQ-PROV-7: `CONTRIBUTING.md`
  states that opening a pull request agrees to a DCO-style certification
  *and* a licence grant to the maintainer sufficient to relicense. The
  grant is the part that holds the gate open; a bare DCO certifies origin
  and grants nothing, so it would not.
- Honestly: implied assent is weaker than recorded assent. Nothing records
  that a given contributor read the terms — only that they opened a PR
  against a repo containing them. That is the cost of keeping the
  contribution path frictionless while contributors are hypothetical. The
  upgrade path, if they actually arrive, is a CLA-assistant bot that takes
  and stores an explicit per-contributor signature.
- The data-side question is *not* settled by this ADR. REQ-PROV-4 holds
  code licence and data licence apart, and whether the data wants CC0 or
  CC BY 4.0 separately is GATE-6's trigger, tracked as Q-9.
- Maintainer position, on record: external contributors are unlikely short
  of major success, so this gate is expected to stay open indefinitely. It
  is recorded anyway — REQ-GATE-1 makes a decline without a named closing
  event incomplete, and "unlikely" is not a closing event.
