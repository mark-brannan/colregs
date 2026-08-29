# PR #4 i18n design — external criticism (raw)

Two external critiques of [PR #4](https://github.com/mark-brannan/colregs/pull/4)
(ADR 0003 / REQ-LANG: language as a dimension), pasted in by Mark on
2026-08-29 and landed here verbatim for triage. Neither has been
synthesized, endorsed, or checked against the actual ADR/REQ text yet —
treat both as raw input, not a merged position.

- [01-general-i18n-critique.md](01-general-i18n-critique.md) — general i18n
  pitfalls for regulatory data (locale-vs-jurisdiction conflation, invariant
  enums, provenance tiers, glossary, ICU interpolation, units, RTL,
  fallback/packaging).
- [02-adr-0003-detailed-review.md](02-adr-0003-detailed-review.md) — a
  closer read of the ADR's actual text, organized as 18 numbered issues
  plus a priority ranking (must-resolve / should-resolve / nice-to-have)
  and a proposed 4-layer model (semantic / legal instrument-version / text
  corpus / display localization).

Next step (not done yet): synthesize these into a single review comment or
follow-up issue against PR #4, reconciling overlap between the two
(both raise locale-vs-jurisdiction and provenance; #2 goes further on
legal versioning/amendments and paragraph-ID stability).
