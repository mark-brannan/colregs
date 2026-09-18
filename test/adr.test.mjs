import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, INDEX, adrFiles, claimOf, pad, parseIndex, readIndex, slugOf } from '../scripts/adr.mjs'

// docs/adr/INDEX.md is the register of allocated ADR numbers and this is what
// makes it one. docs/proposals/README.md states the mechanism it guards.

const git = (...args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' })
const entries = readIndex()

// The comparison base for "not already allocated". CI checks out full history,
// so origin/main resolves there; a clone that has never fetched it skips that
// one check locally and never in CI. No entry on main yet is not the same as
// no main: the first returns [], the second null.
function baseEntries() {
  const resolve = () =>
    ['origin/main', 'refs/remotes/origin/main', 'main'].find((r) => git('rev-parse', '--verify', '--quiet', r).status === 0)
  let ref = resolve()
  if (!ref && process.env.CI) {
    git('fetch', '--no-tags', '--depth=1', 'origin', 'main:refs/remotes/origin/main')
    ref = resolve()
  }
  if (!ref) return null
  const r = git('show', `${ref}:${INDEX}`)
  return r.status === 0 ? parseIndex(r.stdout) : []
}
const base = baseEntries()

test('ADR index: numbers are unique, ordered, and have no gaps', () => {
  assert.ok(entries.length > 0, `${INDEX} has no entries`)
  entries.forEach((e, i) => {
    assert.equal(e.n, i + 1, `${INDEX}:${e.lineno}: expected ADR ${pad(i + 1)}, got ${pad(e.n)} — the register runs 0001 upward with no gap and no repeat`)
  })
})

test('ADR index: INDEX.md and docs/adr/*.md are in bijection', () => {
  const landed = entries.filter((e) => e.file)
  assert.deepEqual(
    landed.map((e) => e.file),
    adrFiles().map((f) => f.file),
    `every docs/adr/NNNN-*.md needs an ${INDEX} entry and vice versa; a number whose text is elsewhere gets a "reserved" line`,
  )
  for (const e of landed) {
    const h1 = readFileSync(join(ROOT, e.file), 'utf8').split('\n', 1)[0]
    assert.equal(h1, `# ADR ${pad(e.n)} — ${e.title}`, `${e.file}: H1 disagrees with ${INDEX}:${e.lineno}`)
  }
})

test('ADR index: no number already allocated on origin/main', { skip: base === null && !process.env.CI && 'origin/main not fetched; run `git fetch origin main`' }, () => {
  assert.ok(base, 'could not resolve origin/main, so the allocation check cannot run')
  const here = new Map(entries.map((e) => [e.n, e]))
  const high = Math.max(0, ...base.map((e) => e.n))
  for (const was of base) {
    const now = here.get(was.n)
    assert.ok(now, `ADR ${pad(was.n)} is on origin/main but missing here; ${INDEX} is append-only`)
    // A landed number is spent. A reserved one may still be landed by the
    // document it was held for -- that is what reserving it was for.
    if (was.file) {
      assert.equal(now.file, was.file, `ADR ${pad(was.n)} is already allocated to ${was.file} on origin/main; take the next free number (${pad(high + 1)})`)
    }
  }
  for (const e of entries) {
    if (base.some((b) => b.n === e.n)) continue
    assert.ok(e.n > high, `ADR ${pad(e.n)} is already allocated on origin/main; rebase and take the next free number (${pad(high + 1)})`)
  }
})

test('ADR proposals: a number prefix is a claim, a date prefix is not', () => {
  assert.equal(claimOf('docs/proposals/0022-part-d-signals.md'), 22)
  assert.equal(claimOf('docs/proposals/2026-01-15-some-idea.md'), null)
  assert.equal(claimOf('docs/proposals/some-idea.md'), null)
  for (const p of ['docs/proposals/0022-part-d-signals.md', 'docs/proposals/2026-01-15-part-d-signals.md', 'docs/proposals/part-d-signals.md']) {
    assert.equal(slugOf(p), 'part-d-signals', `${p}: the slug is the same whatever the prefix`)
  }
})
