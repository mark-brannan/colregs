# ADR index

Every allocated ADR number, one line, in numeric order. Append-only: a
promotion adds a line and nothing rewrites one, so two branches reaching for
the same number conflict here in git rather than colliding on `main`.

Numbers are allocated by `scripts/adr.mjs` when a proposal is approved, never
typed by hand — [docs/proposals/README.md](../proposals/README.md) says how a
proposal becomes an ADR. `test/adr.test.mjs` enforces what this file claims:
numbers unique, no gaps, nothing reused from `origin/main`, and one entry per
file in this directory.

A `reserved` line holds a number that is allocated but whose text does not
live here — a number cited elsewhere before its document landed. A proposal
whose filename starts with that number is claiming it: promotion lands it at
the reserved number and rewrites the line in place. Every other proposal is
unnumbered and takes the next free number, appended.

- 0001 [Package name, and jurisdiction as a dimension](0001-name-and-jurisdiction-model.md)
- 0002 [WIG operating-condition gate, and dropping the file-level `jurisdiction` field](0002-wig-gate-and-jurisdiction-field.md)
- 0003 [Language as a dimension, text corpora, and display catalogs](0003-language-as-a-dimension.md)
- 0004 [Licence layering across the family, and Apache-2.0 here](0004-licence-layering.md)
- 0005 [Rule categories, the situation record, and the Rule 2 region](0005-rule-categories-and-the-situation-record.md)
- 0006 [JSON Schema for structural validation, identifier diff for version discipline](0006-json-schema-and-identifier-diff.md)
- 0007 [Rule 26 overrides Rule 30, and neither reaches a vessel aground](0007-rule26-overrides-and-aground.md)
- 0008 [`position:moored` stays one value; a mooring buoy is a modifier](0008-mooring-buoy-modifier.md)
- 0009 [`data/version.json` is the single version stamp for `data/`](0009-data-version-stamp.md)
- 0010 [A jurisdiction may ship without its rule text](0010-text-withheld-jurisdictions.md)
- 0011 [The public API: one verb per input](0011-api-shape.md)
- 0012 [The trace and Rule 2 departure verbs: kinematic and temporal evaluation](0012-trace-and-rule2-departure-api.md)
- 0013 [Rule text as corpus files under an edition registry (GATE-2 adopted)](0013-corpus-files-with-editions.md)
- 0014 [The engine interface is colregs' to own: an operations manifest and result schemas](0014-engine-interface-owned-by-colregs.md)
- 0015 [Rule ids are paragraph keys in the `rule:` namespace](0015-rule-ids-are-paragraph-keys.md)
- 0016 [An encounter's roles are read from both frames, pooled, then resolved](0016-encounter-roles-are-pooled-across-frames.md)
- 0017 [Closed vocabularies are prefixed identifiers](0017-closed-vocabularies-are-prefixed-identifiers.md)
- 0018 [A jurisdiction delta is an RFC 7396 merge patch, and a tombstone is its `null`](0018-jurisdiction-delta-is-a-merge-patch.md)
- 0019 [What a relation reaches, and what an import reads](0019-relation-reach-and-import-reads.md)
- 0020 [The skeleton is a delta too: a jurisdiction's paragraphs are a merge patch over `intl`](0020-skeleton-is-a-delta.md)
- 0021 [Rule 20(c) is a modality shift, not a gate on the lights](0021-rule-20c-is-a-modality-shift.md)
- 0022 reserved — proposal in flight, mark-brannan/colregs#187
- 0023 reserved — proposal in flight, mark-brannan/colregs#191
- 0024 reserved — proposal in flight, mark-brannan/colregs#193
- 0025 reserved — proposal in flight, mark-brannan/colregs#194
- 0026 [Part D is in the corpus; a proposal that the thing is `signals`](0026-the-thing-is-signals.md)
