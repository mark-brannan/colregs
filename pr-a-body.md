Option A of two for #98's key shape: rule text as flat corpus files, identity `(jurisdiction × language × source)`, GATE-2 confirmed declined. The sibling PR #100 adopts GATE-2 (an edition layer) so the two can be read side by side; #100 carries the side-by-side table. Neither lands any Finnish or Spanish words; both move the keys first.

## What it looks like

```text
data/rules.json                      skeleton: path, rule, jurisdiction, images -- no text
data/text/intl/en-US.uscg.json       today's text, verbatim, relabelled (212 paragraphs)
data/text/intl/fi.finlex.json        stub: identity + provenance, 0 paragraphs
data/text/intl/es.boe.json           stub, 0 paragraphs -- BOE instrument id not yet located
data/text/us/inland/en-US.ecfr.json  stub, 0 paragraphs -- second jurisdiction, so both axes show
data/corpora.json                    derived index; test fails on drift
```

A corpus paragraph is `rule_title` + `text` (or ADR 0010's withheld fields). Corpus metadata: `tier`, `normalization`, `amendment_state`, structured `source` and three-way `rights` (REQ-PROV-6), `gaps`, optional `translation_of`. The skeleton declares `amendment_state` per jurisdiction; a corpus declares its own, and a stub may leave it null until it carries text.

## What to judge

- **GATE-2**: here, concurrent editions = two corpora with different `amendment_state`; no registry. Compare with #100.
- **Filename vs id**: `data/text/<jurisdiction>/<lang>.<source>.json` with `id` inside; CI checks they agree.
- **`24(g)(i)`** joins the skeleton (the Convention has it; the USCG page doesn't), and becomes the en-US corpus's gap. First real exercise of REQ-LANG-5's "silence never implies coverage".
- The `us/inland` stub is there only to show the key on two jurisdictions; drop it if it reads as a claim to model `us/inland`.

Provenance in the stubs: Finlex SopS 30/1977 title verified today; IMO's 2013 amendment verified on imo.org, its resolution number `A.1085(28)` recalled and marked so; BOE instrument id unlocated and marked so.

Breaking file layout (REQ-PKG-4): `data/rules.json` loses `text` and `rule_title`. colregs-engine's conformance script reads only paragraph keys and is unaffected.

ADR 0013 is `proposed`; `npm test` and the prose budget are green.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
