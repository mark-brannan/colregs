#!/usr/bin/env node
// The ADR numbering mechanism: the bot owns the number, nobody types one.
//
// A proposal is unnumbered -- docs/proposals/<slug>.md. When a pull request
// labelled `adr-approved` merges, .github/workflows/adr-promote.yml runs
// `node scripts/adr.mjs promote <file>...` over the proposals that merge
// added. Each becomes docs/adr/NNNN-<slug>.md at the next free number: the
// file is git-mv'd, its H1 gains the number, its docs/budgets.json key
// follows it, and a line is appended to docs/adr/INDEX.md.
//
// INDEX.md is the register of allocated numbers -- append-only, numeric
// order -- so two branches claiming one number conflict there in git instead
// of colliding on main. test/adr.test.mjs is the guard that says so.

import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = fileURLToPath(new URL('../', import.meta.url))
export const INDEX = 'docs/adr/INDEX.md'
const BUDGETS = 'docs/budgets.json'

// `- 0021 [Rule 20(c) is a modality shift, not a gate on the lights](0021-rule-20c-is-a-modality-shift.md)`
// `- 0022 reserved — <where the text is, and why it holds the number>`
const ENTRY = /^- (\d{4}) (?:\[(.+)\]\((.+\.md)\)|reserved\b)/

export const pad = (n) => String(n).padStart(4, '0')
const read = (path, root) => readFileSync(join(root, path), 'utf8')
const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })

export function parseIndex(text) {
  return text.split('\n').flatMap((line, i) => {
    if (!line.startsWith('- ')) return []
    const m = ENTRY.exec(line)
    if (!m) throw new Error(`${INDEX}:${i + 1}: not an index entry: ${line}`)
    return [{ n: Number(m[1]), title: m[2] ?? null, file: m[3] ? `docs/adr/${m[3]}` : null, line, lineno: i + 1 }]
  })
}

export const readIndex = (root = ROOT) => parseIndex(read(INDEX, root))

export const adrFiles = (root = ROOT) =>
  readdirSync(join(root, 'docs/adr'))
    .filter((f) => /^\d{4}-.+\.md$/.test(f))
    .sort()
    .map((f) => ({ n: Number(f.slice(0, 4)), file: `docs/adr/${f}` }))

export const nextNumber = (entries) => Math.max(0, ...entries.map((e) => e.n)) + 1

// A proposal may carry a date prefix; an ADR filename never does.
export const slugOf = (path) => basename(path, '.md').replace(/^\d{4}-\d{2}-\d{2}-/, '')

// The budget key is the path, so a move that leaves it behind fails
// prose-budget with "budgeted but not on disk". Rewrite the key, not the file.
function rekeyBudget(root, from, to) {
  const text = read(BUDGETS, root)
  if (text.includes(`"${from}"`)) writeFileSync(join(root, BUDGETS), text.replace(`"${from}"`, `"${to}"`))
}

export function promote(paths, root = ROOT) {
  const entries = readIndex(root)
  let n = nextNumber(entries)
  const promoted = []
  for (const path of paths) {
    const text = read(path, root)
    if (!text.startsWith('# ')) throw new Error(`${path}: no H1 on the first line; a proposal opens with its title`)
    const title = text.split('\n', 1)[0].replace(/^# (?:ADR \d{4} — )?/, '')
    const dest = `docs/adr/${pad(n)}-${slugOf(path)}.md`
    git(root, 'mv', path, dest)
    writeFileSync(join(root, dest), `# ADR ${pad(n)} — ${text.slice(2)}`)
    rekeyBudget(root, path, dest)
    promoted.push({ n, title, dest, entry: `- ${pad(n)} [${title}](${basename(dest)})` })
    n += 1
  }
  const index = read(INDEX, root).replace(/\n*$/, '\n')
  writeFileSync(join(root, INDEX), index + promoted.map((p) => p.entry).join('\n') + '\n')
  return promoted
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, ...paths] = process.argv.slice(2)
  if (cmd !== 'promote' || paths.length === 0) {
    console.error('usage: node scripts/adr.mjs promote docs/proposals/<slug>.md ...')
    process.exit(2)
  }
  const promoted = promote(paths)
  const subject =
    promoted.length === 1
      ? `docs(adr): promote ${slugOf(promoted[0].dest)} to ADR ${pad(promoted[0].n)}`
      : `docs(adr): promote ${promoted.length} proposals to ADRs ${promoted.map((p) => pad(p.n)).join(', ')}`
  for (const p of promoted) console.log(p.dest)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `subject=${subject}\n`)
}
