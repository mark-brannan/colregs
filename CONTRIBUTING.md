# Contributing

**Opening a pull request against this repository means you agree to the
terms below.** There is nothing else to sign.

## The terms

By opening a pull request you certify and agree that:

1. **You have the right to submit the work.** Either you wrote it, or it
   comes from a source whose licence permits you to contribute it and you
   have said so in the PR. This is the
   [Developer Certificate of Origin 1.1](https://developercertificate.org/)
   in substance — you are not contributing anyone else's work without the
   right to.

2. **You grant the maintainer a licence to your contribution broad enough
   to relicense it** — a perpetual, worldwide, irrevocable, royalty-free
   licence to use, reproduce, modify, sublicense and distribute it under
   any terms, including under a licence other than the one this repository
   currently carries. You keep your copyright; this is a grant, not an
   assignment.

Point 2 exists because the package's outbound licence is still in play
before 1.0 (`docs/requirements.md` GATE-6, `docs/adr/0004-licence-layering.md`).
A certification of origin alone would freeze the licence at the first
merged contribution; the grant is what keeps it changeable. If you are not
willing to give it, say so in the PR rather than opening one silently —
the contribution can still be discussed, it just cannot be merged
(REQ-PROV-7).

## Practicalities

- `npm test` must pass. It is the whole verification surface.
- `docs/requirements.md` is the source of truth for what the package must
  do; `docs/adr/` records decisions already taken. Read both before
  proposing a design change — don't infer intent from the data alone.
- Data changes cross-reference each other by string key. `README.md`
  explains the five relation verbs; they are not interchangeable.
