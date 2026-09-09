# Security Policy

## Supported versions

This package is pre-release and maintained as a single moving line. Only the
latest version published to npm gets fixes; there are no maintenance
branches.

| Version | Supported |
| ------- | --------- |
| latest `0.x` on [npm](https://www.npmjs.com/package/colregs) | yes |
| anything older | no — upgrade first |

## Reporting a vulnerability

**Please do not open a public issue for a security problem.** Report it
privately through GitHub:

1. Go to
   [Security → Report a vulnerability](https://github.com/mark-brannan/colregs/security/advisories/new).
2. Describe what you found and how to reproduce it.

You should get an acknowledgement within a week. This is a spare-time project
maintained by one person, so a fix may take longer than that — you will be told
where it stands rather than left waiting. If a report is valid and you want
credit, you will be named in the advisory.

If you get no response at all within two weeks, open a public issue saying only
that you are waiting on a private report — no details — and it will be picked
up.

## What is in scope

This package ships no runtime code, so the surface is narrow:

- **The published tarball.** Anything shipped in `files` that should not be
  there, or a discrepancy between what is on npm and what is in this
  repository at the corresponding tag.
- **Malformed JSON that harms a consumer.** `data/`, `fixtures/` and
  `images.json` are parsed by implementations in several languages. A
  structure that crashes or hangs a reasonable parser, or that drives
  unbounded memory from a small file, is in scope.
- **The supply chain around publishing** — the `publish.yml` and
  `release-please.yml` workflows and the credentials they use.

## What is out of scope

- **Consumers of this data** —
  [colregs-engine](https://github.com/mark-brannan/colregs-engine/security),
  [nav-wright](https://github.com/mark-brannan/nav-wright/security) and
  [searoom](https://github.com/mark-brannan/searoom/security). Report those in
  their own repositories.
- **The COLREGS themselves**, and whether a given jurisdiction's amalgamation
  is complete or correctly interpreted. This package transcribes rule text and
  applicability predicates; it does not endorse them as a substitute for the
  published regulations or for a competent navigator's judgment.
- **Transcription and modelling errors** — a wrong paragraph, a mis-cited
  light, an applicability predicate that doesn't match the rule text. Those
  are ordinary bugs, however high-priority: open a public issue with the
  citation.
- **Navigational use.** This package is not fit for navigation, and nothing
  built on it should be used to make collision-avoidance decisions at sea.

## Notes on how this package is built

- **No runtime dependencies.** `ajv` validates the schema at build/test time
  only; nothing here executes at install or at a consumer's run time beyond
  reading JSON.
- Applicability entries carry a `cite` back to rule text, and images carry
  their `provenance`, so a reader can check the data against its source
  without trusting this repository.
- `npm test` runs against the committed fixtures with the network
  unavailable.
