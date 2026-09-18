# Proposals

A proposal is a design argument that has not been ruled on. It lives here as
`docs/proposals/<slug>.md` and **carries no number**, because a number is a
citation and nothing should be cited until it is settled.

## Writing one

One file, the slug describing the thing rather than the week. Open with the
title as an H1 and no number:

```markdown
# The engine's surface is the manifest
```

Write it as a proposal: what is being argued, and what would be true if it
were accepted. A ruling is the maintainer's to make, so the document does not
make one.

## Promoting one

Merging a proposal settles nothing — it publishes the argument. The ruling is
the label: put `adr-approved` on the pull request that merges it, and
[`.github/workflows/adr-promote.yml`](../../.github/workflows/adr-promote.yml)
opens a follow-up pull request that

- moves the file to `docs/adr/NNNN-<slug>.md` at the next free number,
- rewrites the H1 to `# ADR NNNN — <title>`,
- moves its `docs/budgets.json` line budget with it, and
- appends its entry to [`docs/adr/INDEX.md`](../adr/INDEX.md).

Squash-merging that pull request is what lands the ADR.

## Why the bot holds the pen

`scripts/adr.mjs` allocates the number, the same way release-please allocates
a version: nobody types one, so nobody can type a duplicate. Two proposals
approved on the same day get consecutive numbers without anyone coordinating,
and a branch that tried to claim a number by hand collides in `INDEX.md`,
which is append-only, instead of landing a second ADR 0027 on `main`.

`test/adr.test.mjs` runs under `npm test` and in CI: numbers unique, no gaps,
none already allocated on `origin/main`, and `INDEX.md` in bijection with
`docs/adr/*.md`.
