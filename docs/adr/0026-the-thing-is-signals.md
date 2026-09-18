# ADR 0026 — Part D is in the corpus; a proposal that the thing is `signals`

Date: 2026-09-17; reframed as a proposal 2026-09-18
Status: proposal, not a ruling. Nothing in §1–§5 has been ruled. They are an
AI agent's suggestions in the agent's own voice — not the maintainer's words
and not the maintainer's decision — held open for a tentative decision
alongside the other design ADRs of the same week, which are expected to be
rewritten together, merged or discarded. Merging this PR lands the Part D
transcription, which is data and revertible, and settles nothing else. ADR
0022 (#187), ADR 0023 (#191) and ADR 0025 (#194) sit on adjacent ground and
read the same way. Nothing may be built on §1–§5 until they are ruled on.

## Context

Rules 32–37 were the last part of the International text missing from
`data/text/intl/2016/en-US.uscg.json`. This PR transcribes them: 30
paragraphs, corpus 212 → 242, `rules.json` and `data/corpora.json` in step.
No applicability entry is written, so `REQ-PART-3`'s bar — an ADR before
any Part D *data* — is untouched; the ADR it asks for is 0022 (#187), and
`REQ-PART-3` is amended here to say which layer the bar is on.

Two questions arrive from the domain-vocabulary work: does
`Display` widen to hold sounds, or do signals get their own operation; and
where does Rule 34 land. ADR 0022 proposes answers to both. This ADR does
not re-argue either — §1 and §2 record agreement and why — and then puts a
suggestion on what 0022 leaves open and what a rename gets more expensive
every week: the noun.

The counts below are measured over the corpus **as this PR leaves it**, body
text of 242 paragraphs. Earlier counts in this family were taken over 212
and could not see Part D.

| word | whole corpus | Part C (20–31) | Part D (32–37) |
|---|---|---|---|
| signal | 53 | 4 | 34 |
| exhibit | 54 | 52 | 1 |
| display | **1** | 1 | 0 |
| sound | 25 | 0 | 19 |

Three readings argue for `signals`, and none of them was available before
the transcription:

- **Rule 27(h)**, a Part C paragraph: "The **signals** prescribed in this
  Rule are not signals of vessels in distress." The Rules' own collective
  noun for lights and shapes is *signal*. Rule 26(d) says the same of
  Annex II's lights: "the additional **signals**".
- **Rule 37**: "she shall **use or exhibit** the signals described in Annex
  IV." The Rules need two verbs for the act and have exactly one noun for
  the thing. `exhibit` cannot be widened to cover a whistle — it is Part C's
  verb, 52 of its 54 hits — and the one Part D hit is this paragraph, where
  it is paired with *use* precisely because a distress signal may be a sound.
- **`display` occurs once in 242 paragraphs**, at Rule 24(i), as a verb
  meaning *exhibit*. It is never a noun and never touches a sound. It is a
  model word, not the Rules'.

## What is proposed

None of the five is ruled. Each is a reading with its evidence; the register
at the foot says what would settle it.

### 1. Suggested: `Display` widens; signals get no operation of their own

Agreeing with ADR 0022 §5, itself an open proposal. The seam looks like
**derivation, not medium**: Rule 35 reads one vessel's facts and answers at a
point, which is what the category names, and the fact that the answer leaves
by a whistle rather than a masthead light changes the emitted vocabulary and
nothing else (`REQ-PART-2`). A second operation would need the same predicate
walker, the same `rel:in_lieu_of` (35(c), 35(d)), `rel:includes` (35(f)) and
`rel:exempts` (35(i), (j)), the same fixtures, and the same jurisdiction
delta the day `us/inland` Rule 34 lands — every mechanism twice, keyed the
same way, to hold a different appliance.

### 2. Suggested: Rule 34 stays in that category; it is not `conduct`

The domain-vocabulary draft's instinct was that Rule 34 is action-shaped and
belongs with conduct and an `Action` type. ADR 0005 §1's own definitions
read against it: `conduct` is "monitored over a trace, not evaluated at a
point" and produces an obligated or prohibited action, where Rule 34 produces
a *signal* and is due at the instant the manoeuvre is made, by the vessel
making it, who needs no window to know. The draft's real observation survives
in 0022 §2: Rule 34 **reads** an act. Reading one is what `subjects: 2` and
the `act` class are for; on this reading it is not a second category
(`REQ-CAT-1`).

The `Action` type the draft wants is still wanted, for Rule 8 and Rule 16 —
what a vessel shall *do*. Rule 34 is not its first customer.

### 3. Suggested: the noun is `signals` — unruled, the maintainer's call

`evaluateDisplay` and `DisplayEvaluation` are ink (ADR 0011 register,
row 2), so this is a suggestion with its evidence, not an edit an agent may
make. The evidence is the three readings above, and the fact that made them
relevant: the thing now carries sounds, which it did not when row 2 was inked.

| today | suggested |
|---|---|
| thing `display` | `signals` |
| `evaluateDisplay` | `evaluateSignals` |
| `DisplayEvaluation` | `SignalsEvaluation` |
| `Display`, `DisplayLight` | `Signals`, `SignalLight`, and `SignalSound` beside it |
| `category:display` | `category:signal` |

`Signal` would then name the same thing on both sides of the glass, which
Rule 19(e) — "hears … the fog signal of another vessel" — will need: what one
vessel sounds is what the other hears, and one noun for it is the Rules'
own economy, not a pun.

### 4. Suggested, if §3 holds: ADR 0022 §1's output key

With the category named `signal`, 0022's third output key `signal` beside
`lights` and `shapes` reads as a peer of two things that are equally signals.
The suggestion is three keys, each named for the **vocabulary** it emits —
`lights`, `shapes`, `sounds` — and 0022 §4's sequence-and-repeat carried on
the element, where a paragraph states one. Rule 34(b)'s flashes would then be
a `lights` element with a sequence, not a fourth kind of thing, and
`REQ-PART-2` would read literally: the parts differ only in the vocabulary
they emit. Nothing is shipped on either spelling, so this costs a line in
0022 while that ADR is still open.

### 5. Signal-as-observation is not proposed here

Rule 19(e)'s heard signal is an input, and it is blocked behind the
how-observed fact (seen / radar / heard) that Rules 19 and 3(k) need first.
Named so the noun above is weighed with it in view; carded, not suggested.

## Alternatives, none of them ruled out

- **Keep `Display`, widen its meaning.** Free today. The cost is that the
  package's most-used noun is a word the Rules use once, as a verb, for
  something a bell does not do — and the rename gets dearer with every
  consumer. searoom and colregs-mcp already import `Display`; a fourth
  consumer makes this a migration instead of a commit.
- **Two things: `Display` for Part C, `Signals` for Part D.** Rule 27(h)
  suggests the Rules do not draw that line, and §1 prices the duplication.
- **`Exhibit` / `Exhibition`.** The Rules' Part C verb, 52 hits, and the
  obvious candidate until Rule 37 pairs it with *use* for exactly this
  reason. A vessel does not exhibit a prolonged blast.

## Consequences

- The corpus covers Parts A–D of the International text. ADR 0022's
  citation of "the 2016 corpus in `data/text/intl/2016`" becomes true
  where it was forward-looking, and its paragraph-by-paragraph table can be
  checked against the words.
- Transcription notes — the source's own defects in Rule 34(a), the
  `‹ ›` / `‹‹ ››` resolution, and the table-cell layout Part D's Rule 34
  uses where Rules 32–37 otherwise run as prose — are in `PROVENANCE.md`.
- Nothing in §1–§5 is implemented. If §3 were ruled yes, the rename would be
  its own churn PR across `colregs` (the `category:` enum in two schemas, 29
  entries, `docs/identifiers.md`), `colregs-engine`, `colregs-mcp` and
  searoom. Pre-1.0, no consumer outside this family, so it is a commit, not
  a migration.
- **Cost to reverse.** §1–§5: delete this file; no code or data depends on
  them. The transcription: revert the data commit; no entry cites a Part D
  paragraph.

## Register

Levels are `docs/conventions.md`'s. Only the transcription lands with this
PR; every design row is unruled and none of them is pencil yet.

| item | level | what would settle it |
|---|---|---|
| Rules 32–37 transcribed, International only, no entries | ink | — |
| `REQ-PART-3`'s bar is on entries, not on the text layer | ✎ | a reader arguing the text layer is "Part D data" |
| §1 `display` widens; no signals operation (with ADR 0022 §5) | unruled | a Part D entry the display walker cannot evaluate |
| §2 Rule 34 is not `conduct` | unruled | Rule 34 needing a window, not an instant |
| §3 the rename to `signals` | unruled, ink | the maintainer's yes or no; the evidence is §"Context" |
| §4 `lights` / `shapes` / `sounds` as the three output keys | unruled | a ruling on §3, then ADR 0022's own |
| §5 signal-as-observation | ? | the how-observed fact |
