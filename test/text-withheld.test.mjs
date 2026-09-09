import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import Ajv2020 from 'ajv/dist/2020.js'

// ADR 0010 rests on one invariant: nothing in evaluation reads `text`. A
// withheld jurisdiction ships structure only, so every fixture, every
// integrity check and the reference evaluator must stay green over a ruleset
// with every paragraph's text stripped. This runs the whole of
// test/data.test.mjs over exactly that ruleset. The assertions there that
// quote the words guard themselves: a withheld paragraph has none to quote.
// colregs-engine owns the other half, the evaluator output envelope.

const here = new URL('.', import.meta.url)
const rules = JSON.parse(readFileSync(new URL('../data/rules.json', here)))
const schema = JSON.parse(readFileSync(new URL('../schema/rules.schema.json', here)))

const withheld = {
  ...rules,
  paragraphs: Object.fromEntries(Object.entries(rules.paragraphs).map(([path, p]) => {
    const { text, ...structure } = p
    return [path, { ...structure, text_status: 'withheld', withheld_reason: 'stripped for the ADR 0010 invariant' }]
  })),
}

test('ADR 0010: a ruleset with every text withheld validates against rules.schema.json', () => {
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema)
  assert.ok(validate(withheld), JSON.stringify(validate.errors, null, 1))
  assert.ok(Object.values(withheld.paragraphs).every((p) => !('text' in p)), 'a text survived the strip')
})

test('ADR 0010: fixtures, integrity checks and the reference evaluator stay green with every text stripped', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'colregs-withheld-')), 'rules.json')
  writeFileSync(file, JSON.stringify(withheld))
  // NODE_TEST_CONTEXT is how the runner tells a child it is one of its own; a
  // nested runner inheriting it reports nothing to stdout.
  const { NODE_TEST_CONTEXT, ...env } = process.env
  const run = spawnSync(process.execPath, ['--test', '--test-reporter=tap', new URL('data.test.mjs', here).pathname], {
    encoding: 'utf8',
    env: { ...env, COLREGS_RULES_JSON: file },
  })
  const summary = run.stdout.split('\n').filter((l) => /^not ok|^# (pass|fail)/.test(l)).join('\n')
  assert.equal(run.status, 0, `data.test.mjs is not green over a text-stripped ruleset:\n${summary}\n${run.stderr.slice(-2000)}`)
  assert.match(run.stdout, /^# fail 0$/m)
  assert.match(run.stdout, /^# pass [1-9]\d*$/m, 'no tests ran')
})
