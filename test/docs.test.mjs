import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Prose budgets are enforced by the shared `prose-budget` engine (dotfiles
// .local/bin); every number and exception lives in docs/budgets.json. This
// wrapper only finds the engine and runs it over the tree. Set
// PROSE_BUDGET=/path/to/prose-budget to use a specific copy, or
// PROSE_BUDGET_ALLOW_MISSING_ENGINE=1 to skip loudly on a machine without
// one -- it does not relax the budgets themselves.

const root = fileURLToPath(new URL('../', import.meta.url))
const onPath = (cmd) => spawnSync(cmd, ['--version'], { stdio: 'ignore' }).status === 0
const engine = [process.env.PROSE_BUDGET, 'prose-budget', `${process.env.HOME}/.local/bin/prose-budget`]
  .filter(Boolean)
  .find((c) => (c.includes('/') ? existsSync(c) : onPath(c)))
const skip = !engine && process.env.PROSE_BUDGET_ALLOW_MISSING_ENGINE === '1' && 'PROSE_BUDGET_ALLOW_MISSING_ENGINE=1: SKIPPING prose budgets, no prose-budget engine found'

test('docs: prose budgets hold (prose-budget --tree --require-config)', { skip }, () => {
  assert.ok(engine, 'prose-budget engine not found; looked at $PROSE_BUDGET, `prose-budget` on PATH and $HOME/.local/bin/prose-budget. Set PROSE_BUDGET_ALLOW_MISSING_ENGINE=1 to skip.')
  const r = spawnSync(engine, ['--tree', '--require-config'], { cwd: root, encoding: 'utf8' })
  assert.equal(r.status, 0, `prose-budget exited ${r.status}:\n${r.stdout}${r.stderr}`)
})
