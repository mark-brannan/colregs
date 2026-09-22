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
import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
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

// A proposal may carry a date prefix, or a number it is claiming; an ADR
// filename carries only its own number.
export const slugOf = (path) => basename(path, '.md').replace(/^(?:\d{4}-\d{2}-\d{2}|\d{4})-/, '')

// A four-digit prefix claims a number the register holds reserved. A date
// prefix starts the same way and claims nothing, so it is excluded here --
// otherwise 2026-01-15-some-idea.md reads as a claim on ADR 2026.
export const claimOf = (path) => {
  const m = /^(\d{4})-(?!\d{2}-\d{2}-)/.exec(basename(path))
  return m ? Number(m[1]) : null
}

// The budget key is the path, so a move that leaves it behind fails
// prose-budget with "budgeted but not on disk". Rewrite the key, not the
// file. A proposal that never had one gets one at the length it landed at:
// docs/proposals/ is outside the delta rule and docs/adr/ is inside it, so
// an unbudgeted ADR would fail the promotion's own CI on its whole word
// count, and a budget is the exemption -- growing it later is a deliberate
// diff, which is what budgets are for.
function rekeyBudget(root, from, to, lines) {
  const text = read(BUDGETS, root)
  if (text.includes(`"${from}"`)) return writeFileSync(join(root, BUDGETS), text.replace(`"${from}"`, `"${to}"`))
  const budgets = JSON.parse(text)
  budgets.lines[to] = lines
  writeFileSync(join(root, BUDGETS), JSON.stringify(budgets, null, 2) + '\n')
}

// prose-budget's line count: newlines, plus one for an unterminated last line.
const lineCount = (text) => (text ? text.split('\n').length - (text.endsWith('\n') ? 1 : 0) : 0)

export function promote(paths, root = ROOT) {
  // Promotion is idempotent: the workflow can fire again on the same merge
  // (a second label event), and a proposal already moved is already promoted
  // -- its ADR is on disk under the same slug. A path that is neither is a
  // typo or a withdrawn proposal, and either deserves a refusal, not a
  // "nothing to promote" that reads as success.
  const landed = new Set(adrFiles(root).map((f) => slugOf(f.file)))
  const pending = [...new Set(paths)].filter((path) => {
    if (existsSync(join(root, path))) return true
    if (landed.has(slugOf(path))) return false
    throw new Error(`${path}: not found, and no docs/adr/NNNN-${slugOf(path)}.md says it was promoted`)
  })
  if (pending.length === 0) return []
  const entries = readIndex(root)
  const reserved = new Map(entries.filter((e) => !e.file).map((e) => [e.n, e]))
  let free = nextNumber(entries)
  // Two passes, because one is not atomic. Every path is checked and
  // numbered before anything is written: a bad claim or a missing H1 on the
  // third proposal would otherwise throw with the first two already git-mv'd
  // and no INDEX.md line for them -- a tree that fails the bijection guard,
  // and one that re-running cannot repair, because a proposal already moved
  // is filtered out as already promoted.
  const promoted = []
  for (const path of pending) {
    // A numbered proposal filename claims a number the register already
    // holds reserved -- an ADR cited before its text landed here. Anything
    // else takes the next free number.
    const claim = claimOf(path)
    const held = claim !== null && reserved.get(claim)
    if (claim !== null && !held) {
      throw new Error(`${path}: ADR ${pad(claim)} is not reserved in ${INDEX}; drop the number and let the next free one be allocated`)
    }
    const n = held ? held.n : free++
    if (held) reserved.delete(n)
    const text = read(path, root)
    if (!text.startsWith('# ')) throw new Error(`${path}: no H1 on the first line; a proposal opens with its title`)
    const nl = text.indexOf('\n')
    const title = (nl === -1 ? text : text.slice(0, nl)).replace(/^# (?:ADR \d{4} — )?/, '')
    const dest = `docs/adr/${pad(n)}-${slugOf(path)}.md`
    const body = `# ADR ${pad(n)} — ${title}\n${nl === -1 ? '' : text.slice(nl + 1)}`
    promoted.push({ n, title, path, dest, body, held, entry: `- ${pad(n)} [${title}](${basename(dest)})` })
  }
  for (const p of promoted) {
    git(root, 'mv', p.path, p.dest)
    writeFileSync(join(root, p.dest), p.body)
    rekeyBudget(root, p.path, p.dest, lineCount(p.body))
  }
  // A claimed number replaces its reserved line where it already sits; a new
  // one is appended, which is what makes two branches collide in git.
  let index = read(INDEX, root).replace(/\n*$/, '\n')
  const appended = []
  for (const p of promoted) {
    if (p.held) index = index.replace(`${p.held.line}\n`, `${p.entry}\n`)
    else appended.push(p.entry)
  }
  writeFileSync(join(root, INDEX), index + appended.map((e) => `${e}\n`).join(''))
  return promoted
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, ...paths] = process.argv.slice(2)
  if (cmd !== 'promote' || paths.length === 0) {
    console.error('usage: node scripts/adr.mjs promote docs/proposals/<slug>.md ...')
    process.exit(2)
  }
  const promoted = promote(paths)
  if (promoted.length === 0) {
    console.log('nothing to promote; every proposal named has already moved')
    process.exit(0)
  }
  const subject =
    promoted.length === 1
      ? `docs(adr): promote ${slugOf(promoted[0].dest)} to ADR ${pad(promoted[0].n)}`
      : `docs(adr): promote ${promoted.length} proposals to ADRs ${promoted.map((p) => pad(p.n)).join(', ')}`
  for (const p of promoted) console.log(p.dest)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `subject=${subject}\n`)
}
