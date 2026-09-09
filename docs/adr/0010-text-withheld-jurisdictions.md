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

How a withheld paragraph reads on screen — "text withheld, see CEVNI 6.10"
or something friendlier — is a display choice, not a data one, and may
change before a general release without another ADR.

**Rejected: a hash or checksum of the withheld text.** It reads as rigour
and buys nothing — only a reader who already holds the text could verify it,
and that reader did not need us.

**Rejected: a machine-condensed or summarised text.** The option that looks
safest is the most exposed: a condensation of a protected text is a
derivative work, precisely what the UN terms withhold. Redaction is a
smaller act than paraphrase, not a larger one.

## Consequences

- **No future session may record CEVNI as blocked.** It is unblocked for
  structure as of this ADR, blocked for text until ADR 0001's licence
  question is answered. The same route is open to any jurisdiction that
  fails REQ-PROV-2 later; nothing here is CEVNI-specific.
- `schema/rules.schema.json` needs the conditional: `text` required unless
  `text_status` is `withheld`, in which case it is forbidden and
  `withheld_reason` is required. Adding `text_status`, `withheld_reason`
  and `mirrors` is an additive schema change under ADR 0006.
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
