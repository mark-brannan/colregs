# ADR 0017 — Closed vocabularies are prefixed identifiers

Date: 2026-09-16
Status: accepted — Solace's ruling, 2026-09-16

## Context

Issue #120 built a display catalog for the light, modality, role, encounter
and jurisdiction vocabularies and, in doing so, named a fiction in
`docs/identifiers.md`: "What is not an identifier" declared modality, role,
jurisdiction and encounter values outside `REQ-MODEL-10`'s identifier space,
on the theory that a closed vocabulary is a different kind of thing from a
name. The carve-out never reduced what a rename costs. Every one of these
values is emitted by the engine (`DisplayEvaluation.modality`,
`EncounterEvaluation.roles[].role`, `.encounter`, `provenance.jurisdictions`,
`evaluated_categories`) and compared by a consumer the same way an entry id
or a fact value is — `if (role === 'give-way')` breaks on a rename exactly
as `if (activity === 'nuc')` would. Declining to promise stability does not
make the rename cheaper; it only leaves the promise unwritten.

The collision that follows from treating them as a separate kind is not
hypothetical. It has already happened, in the data on `main`:

| string | is a … | and also a … |
|---|---|---|
| `shall-not-impede` | modality (`modalities`) | role (`effects.roles`) |
| `none` | role (`effects.roles`) | encounter (`effects.encounters`) |

This is the identical shape as `towing`, the collision ADR 0001's `light:`
prefix and `activity:` axis already resolved: a consumer holding the bare
string cannot say which field it came out of. The rule already on file —
"the prefix makes the namespace part of the identifier, which resolves that
collision by construction rather than by convention" — already applies here;
it was only not applied.

Issue #120's own draft, before this ruling, reached the opposite
recommendation on its Q2: that prefixing sections into identifiers "later"
costs the same as doing it now. That held only if the bare strings were not
identifiers. They are — held and compared by consumers — so the option runs
one way: pre-1.0, prefixing is a data-layer, one-PR change; post-1.0 it is
an identifier-layer change REQ-MODEL-10 forbids outright, leaving only the
two-names-forever shape `docs/identifiers.md` already rejected for
`fact:own_activity`. Ruled by Solace, 2026-09-16.

## Decision

1. **Four closed vocabularies take a type prefix**, the same mechanism as
   `light:`, `fact:`, `rel:`: `modality:` (`data/applicability.json`
   `modalities`, every entry's `modality`, `modality_by` branches),
   `role:` (`effects.roles`, `effect.own`/`effect.other`), `encounter:`
   (`effects.encounters`, `effect.encounter`), and `category:` (`categories`,
   every entry's and `represented_paragraphs` record's `category`) — new to
   this list because it is the same class (package-coined, closed, emitted,
   compared) and leaving it bare while prefixing the other three would
   recreate the inconsistency this ADR closes.
2. **Jurisdiction stays bare.** `intl` and `us/inland` are not names this
   package coined. Jurisdiction is a coordinate with REQ-SCOPE-2's own
   `<body>/<waters>` grammar, its left segment borrowed from ISO 3166, the
   whole value doubling as a corpus key (REQ-LANG-3) and a `data/text/`
   filesystem path — its sibling axis, `language`, is a bare BCP 47 tag for
   the same reason. `jurisdiction:us/inland` would put a colon namespace in
   front of a slash path and claim the package minted `us`, which it did
   not. Its stability is a property of the grammar (REQ-SCOPE-4 makes
   adding a jurisdiction additive; no fact, light or role value can spell
   `us/inland`), not of a prefix — the same reason a paragraph path carries
   none. Jurisdiction moves from "What is not an identifier" to the bare
   class beside paragraph paths in `docs/identifiers.md`: it *is* an
   identifier, immutable under REQ-MODEL-10 exactly like `27(a)(i)`, and it
   just carries no prefix.
3. **The two live collisions are recorded, not just resolved.**
   `modality:shall-not-impede` and `role:shall-not-impede` are two names;
   `role:none` and `encounter:none` are two names. Each pair collided under
   the old bare scheme and does not under this one.

## Consequences

- **One-pass rename, one commit.** `data/applicability.json`'s four
  vocabulary maps and every entry field that names a value; both fixture
  files (`applicability-fixtures.json` has no modality field to touch;
  `situation-fixtures.json`'s `expect[].modality`); every schema enum/pattern
  naming one of the four (`applicability.schema.json`,
  `evaluation.schema.json`, `encounter-evaluation.schema.json`,
  `i18n-catalog.schema.json`); the two i18n catalogs' `modality` section
  keys; the test suite's literal comparisons; `docs/identifiers.md`,
  `docs/requirements.md`, `README.md`. Jurisdiction values, patterns and
  every corpus path are untouched.
- **colregs-engine follow-up.** Its generated types (`DisplayEvaluation`,
  `EncounterEvaluation`, and any hand-written literal comparing against a
  modality, role, encounter or category string) regenerate from this
  package's schemas and wait on a colregs release carrying this ADR. Until
  that release, colregs-engine's own types name the pre-ADR bare values;
  this is a breaking change for it in the ordinary pre-1.0 sense (no
  deprecation window, no shim — `AGENTS.md` "Stage: pre-consumer"), tracked
  as its own follow-up, not blocking this PR.
- **The i18n catalog keys change shape**, not content: `modality:shall`
  replaces `shall` as the key into `data/i18n/*.json`'s `modality` section;
  the label strings themselves are untouched. A catalog section for role,
  encounter or category is not added by this ADR — only the vocabulary
  values those sections would key against.
- Rule ids (`rule:15a:crossing`) and shape keys (`when`, `effect`, a
  `category:scope` effect's `part`/`section`/`applies_rules`) are untouched: only
  the four vocabularies' *values* take the prefix, never a key or an id
  that happens to share a word with one.

Ruled by Solace, 2026-09-16.
