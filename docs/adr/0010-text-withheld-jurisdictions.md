# ADR 0010 — A jurisdiction may ship without its rule text

Date: 2026-09-09
Status: accepted

## Context

REQ-PROV-2 blocks a jurisdiction until its reproduction terms are checked
against the primary source. Three passes have now checked CEVNI's and come
back the same way: unece.org is unreachable from the checking hosts (403,
reproduced independently), and the UN's default terms grant personal,
non-commercial use with "no right to resell, redistribute, or create
derivative works" — see ADR 0001's 2026-09-05 and 2026-09-09 amendments. The
remedies named there — written permission from UN Publications, or a national
transposition such as Germany's BinSchStrO — are both slow, and one of them
is somebody else's decision.

Meanwhile `eu/cevni` has sat in the jurisdiction vocabulary
(requirements.md §2) as a value nothing may populate, and every session that
has looked at it has read "licence blocked" as "jurisdiction blocked" and
stopped.

That reading is wrong, and it is the cost here. What this package is for is
**evaluating rules correctly**: which entries apply, what modality they
carry, which gates they turn on. None of that needs a word of the rule text.
A licence forbidding reproduction of an expression does not forbid modelling
what the expression provides, any more than a copyright in a timetable
forbids knowing when the train leaves.

## Decision

**A jurisdiction whose reproduction terms fail or cannot be verified MAY be
implemented as structure, with its text withheld.** REQ-PROV-2 continues to
govern *reproducing text*; it does not govern *modelling rules*. Structure
here means everything except the words: paragraph paths, rule numbers,
applicability entries, facts, gates, geometry, modality, and the relations
between a jurisdiction's paragraphs and the international ones.

Referencing a rule by number is not reproduction: a citation is a fact about
which provision is invoked, not its protected expression, and the package
needs nothing more than that to be correct.

**Mechanism.** `data/rules.json` gains a per-paragraph `text_status`:

| `text_status` | `text` | meaning |
|---|---|---|
| `verbatim` (default when absent) | required | today's state: the source's own words |
| `withheld` | MUST be absent | the paragraph is modelled; its text is not ours to ship |

A `withheld` paragraph carries a `withheld_reason` naming the licence
barrier, and its `rule_title` MUST be a neutral label written for this
package — "Overtaking", "Sound signals in reduced visibility" — never a
heading copied from the source. Where a withheld paragraph is substantively
the same provision as an international one, it carries `mirrors`, a path
into the `intl` ruleset; a consumer may then display the international text
**labelled as the international equivalent**, never as that jurisdiction's
text. CEVNI is largely a restatement of the Rules for inland waters, so
`mirrors` should cover most of it, leaving the genuine CEVNI-only provisions
as the short list that shows a placeholder.

### ✎ What a withheld paragraph carries in place of text — pencil

**Ink is only that the text is withheld and the structure ships.** What
stands in for the text is deliberately *not* settled here, and this ADR does
not license a later session to settle it by inference. Any of the following
may be adopted, dropped or combined before a general release without another
ADR, and more than one may ship at once — they occupy different keys:

| option | key | note |
|---|---|---|
| **Redaction** — the citation alone | — | the floor; ships today, needs no decision |
| **Digest** — a hash of the normalised text, algorithm-qualified | `text_digest` | lets a holder of a lawful copy bind it to our structure, and catches a silent upstream amendment |
| **Slug** — key nouns and verbs lifted from the paragraph, lemmatised, English counterparts where the source is another language | `text_slug` | the straw man below |
| **`mirrors`** — the `intl` equivalent | `mirrors` | real, lawful text for the majority of CEVNI; silent exactly where CEVNI differs |

**Straw man for the slug**, so the option is designed against something
rather than argued about in the abstract: take the paragraph, keep the key
nouns and verbs, drop everything else, lemmatise, emit a sorted set —
`blue-board`, `overtake`, `sound-signal`. Deterministic, reproducible from
the same input, no word order, no syntax, no prose. Where the source is not
English, the terms map to their English counterparts, which is the same
vocabulary the applicability entries already use. Build it and judge it; it
may be replaced or dropped. See the research issue.

Nothing here turns on where the line between indexing and a derivative work
falls. That question is not this ADR's to answer and does not gate the work:
redaction ships today whatever the answer, and the slug is a straw man to be
built, investigated or thrown away later.

How a withheld paragraph reads on screen is likewise a display choice, not a
data one.

## Consequences

- **No future session may record CEVNI as blocked.** It is unblocked for
  structure as of this ADR, blocked for text until ADR 0001's licence
  question is answered. The same route is open to any jurisdiction that
  fails REQ-PROV-2 later; nothing here is CEVNI-specific.
- **A different bar still stands, and it is not this one.** REQ-SCOPE-3 and
  Q-11 hold that no non-`intl` jurisdiction lands until an explicit
  suppression mechanism exists, because silence-means-inherit would apply
  international law where a national body deliberately has none. That is
  about deltas, not licences; it survives this ADR untouched and is the live
  blocker on CEVNI. Read the two together or the wrong one gets blamed.
- `schema/rules.schema.json` carries the conditional: `text` required unless
  `text_status` is `withheld`, in which case it is forbidden and
  `withheld_reason` is required. Only `withheld_reason` is refused on a
  verbatim paragraph; `mirrors`, `text_digest` and `text_slug` are open to
  any paragraph, defined but unwritten, so the pencil options above cannot be
  foreclosed by `additionalProperties: false`. Additive under ADR 0006. Since
  `data/rules.json` is entirely verbatim `intl`, nothing in the data
  exercises that branch — the cases are asserted in `test/data.test.mjs`.
- **Nothing in evaluation may read `text`.** That is the invariant this
  decision rests on, so it wants a test rather than a promise: fixtures and
  the evaluator output envelope must stay green over a ruleset with every
  `text` stripped.
- REQ-PROV-1 still binds: a withheld paragraph records its source, its
  retrieval date and why the text is absent. Withholding is a provenance
  record, not a gap in one — and not a `gaps` entry either, which keeps its
  meaning of a paragraph we could not obtain at all.
- The licence question stays open where it already is. If permission or a
  national transposition arrives, `withheld` paragraphs gain their text and
  drop the key; no modelling is redone.
