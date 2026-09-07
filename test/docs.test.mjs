import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'

// Mechanical guardrails against prose bloat. Every number and every
// grandfathered exception lives in docs/budgets.json so that loosening a rule
// is a visible diff in review, not a quiet edit to a test. The precedent is
// data.test.mjs reading requirements.md as text for the gate registry.

const root = new URL('../', import.meta.url)
const path = (p) => new URL(p, root)
const read = (p) => readFileSync(path(p), 'utf8')
const load = (p) => JSON.parse(read(p))
const exists = (p) => existsSync(path(p))
const budgets = load('docs/budgets.json')
const BUDGET_NOTE = 'The budget lives in docs/budgets.json; raising it is a deliberate, reviewable diff.'

const lineCount = (text) => text.replace(/\n$/, '').split('\n').length
const hash = (s) => createHash('sha256').update(s.trim()).digest('hex').slice(0, 12)

function mdFiles(dir) {
  const out = []
  for (const name of readdirSync(path(dir))) {
    const rel = `${dir}/${name}`
    if (statSync(path(rel)).isDirectory()) out.push(...mdFiles(rel))
    else if (name.endsWith('.md')) out.push(rel)
  }
  return out
}
const jsonFiles = (dir) => readdirSync(path(dir)).filter((n) => n.endsWith('.json')).map((n) => `${dir}/${n}`)
const testFiles = () => readdirSync(path('test')).filter((n) => n.endsWith('.mjs')).map((n) => `test/${n}`)

// Every string under a prose key, with its JSON pointer.
function* proseStrings(value, keys, ptr = '') {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) yield* proseStrings(value[i], keys, `${ptr}/${i}`)
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (keys.includes(k) && typeof v === 'string') yield { ptr: `${ptr}/${k}`, text: v }
      else yield* proseStrings(v, keys, `${ptr}/${k}`)
    }
  }
}

// --- 1. line budgets ---------------------------------------------------------
test('docs: every budgeted file is within its line budget', () => {
  const over = []
  for (const [file, max] of Object.entries(budgets.lines)) {
    if (!exists(file)) continue
    const n = lineCount(read(file))
    if (n > max) over.push(`${file}: ${n} lines, budget ${max}`)
  }
  assert.deepEqual(over, [], `Over budget:\n  ${over.join('\n  ')}\n${BUDGET_NOTE}`)
})

// --- 2. prose caps in JSON --------------------------------------------------
const proseFiles = [...jsonFiles('data'), ...jsonFiles('fixtures')]
const proseKeys = budgets.prose.keys

test('docs: JSON prose fields stay within the character cap', () => {
  const grandfathered = new Set(budgets.prose.grandfathered)
  const over = []
  let stillOver = 0
  for (const file of proseFiles) {
    for (const { ptr, text } of proseStrings(load(file), proseKeys)) {
      if (text.length <= budgets.prose.max_chars) continue
      const id = `${file}#${ptr}`
      if (grandfathered.has(id)) stillOver++
      else over.push(`${id} (${text.length} chars)`)
    }
  }
  console.log(`  prose cap: ${stillOver} grandfathered field(s) still over ${budgets.prose.max_chars} chars`)
  assert.deepEqual(over, [], `Prose over ${budgets.prose.max_chars} chars (a note is one sentence plus the id it points at):\n  ${over.join('\n  ')}\n${BUDGET_NOTE}`)
})

// --- 3. no session narration in artifacts -----------------------------------
const narration = {
  issue: /colregs(-engine)?#\d+/,
  pr: /\bPR ?#?\d+\b/,
  phase: /\bP\d\.\d\b/,
  session: /\b(this|that|the) session\b/i,
  seeded: /\bseeded \d{4}-/i,
}
const allNarration = Object.keys(narration)
const docsNarration = ['session', 'seeded']

function* narrationHits(file, lines, which) {
  for (const line of lines) {
    for (const name of which) {
      const m = narration[name].exec(line)
      if (m) yield { file, hash: hash(line), match: m[0] }
    }
  }
}

test('docs: no session narration in data, fixtures, docs, test titles, README or CLAUDE.md', () => {
  const grandfathered = new Set(budgets.narration.grandfathered.map((g) => `${g.file}:${g.hash}`))
  const hits = []
  let old = 0
  const scan = (file, lines, which) => {
    for (const h of narrationHits(file, lines, which)) {
      if (grandfathered.has(`${h.file}:${h.hash}`)) old++
      else hits.push(h)
    }
  }
  for (const f of [...proseFiles, 'CLAUDE.md', 'README.md']) scan(f, read(f).split('\n'), allNarration)
  for (const f of mdFiles('docs')) scan(f, read(f).split('\n'), docsNarration)
  for (const f of testFiles()) {
    const titles = [...read(f).matchAll(/^test\((['"`])(.*?)\1/gm)].map((m) => m[2])
    scan(f, titles, allNarration)
  }
  console.log(`  narration: ${old} grandfathered hit(s)`)
  assert.deepEqual(hits, [], `Session narration in an artifact (PR numbers, phase ids, dates and session references belong in the PR body or the log, not here):\n  ${hits.map((h) => `${h.file} ${h.hash} "${h.match}"`).join('\n  ')}\n${BUDGET_NOTE}`)
})

// --- 4. model-voice words ------------------------------------------------------
// A hyphenated token like `no-robust-policy-in-model` is an identifier, not prose.
const voiceWords = budgets.voice.words.map((w) => new RegExp(`(?<![\\w-])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'i'))
const voicePatterns = [
  /\bit'?s worth noting\b/i,
  /\bnot just\b[^.;\n]{1,80}\bbut\b/i,
  /(^|[.!?]\s+)(Moreover|Additionally|Certainly)\b/,
]

function voiceHits(file, text) {
  const out = []
  text.split('\n').forEach((line, i) => {
    for (const re of [...voiceWords, ...voicePatterns]) {
      const m = re.exec(line)
      if (m) out.push(`${file}:${i + 1} "${m[0].trim()}"`)
    }
  })
  return out
}

test('docs: no model-voice words in docs, README, CLAUDE.md or JSON prose', () => {
  const hits = []
  for (const f of [...mdFiles('docs'), 'README.md', 'CLAUDE.md']) hits.push(...voiceHits(f, read(f)))
  for (const f of proseFiles) {
    for (const { ptr, text } of proseStrings(load(f), proseKeys)) hits.push(...voiceHits(`${f}#${ptr}`, text))
  }
  // "rather than" is a tell but not a fault: a human rule can't ban it. Count only.
  const counts = [...mdFiles('docs'), 'README.md', 'CLAUDE.md']
    .map((f) => [f, (read(f).match(/\brather than\b/gi) || []).length])
    .filter(([, n]) => n > 0)
  console.log(`  "rather than": ${counts.map(([f, n]) => `${f} ${n}`).join(', ') || 'none'}`)
  assert.deepEqual(hits, [], `Model-voice wording:\n  ${hits.join('\n  ')}`)
})

// --- 5. requirement and question ids are defined once ---------------------------
test('docs: Q- and REQ- ids are defined once in requirements.md', () => {
  const text = read('docs/requirements.md')
  const seen = new Map()
  for (const [, id] of text.matchAll(/\*\*(Q-\d+|REQ-[A-Z]+-\d+)\*\*/g)) seen.set(id, (seen.get(id) || 0) + 1)
  const dupes = [...seen].filter(([, n]) => n > 1).map(([id, n]) => `${id} x${n}`)
  assert.deepEqual(dupes, [], `Ids defined more than once: ${dupes.join(', ')}`)
})
