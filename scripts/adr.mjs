#!/usr/bin/env node
// The ADR numbering mechanism: the bot owns the number, nobody types one.
//
// A proposal is unnumbered -- docs/proposals/<slug>.md. docs/adr/INDEX.md is
// the register of allocated numbers -- append-only, numeric order -- so two
// branches claiming one number conflict there in git instead of colliding on
// main. test/adr.test.mjs is the guard that says so.
//
// This file is the read side only: parsing and validating the register.
// Promotion -- moving an approved proposal into docs/adr/ -- is a separate
// PR, once this guard is in place.

import { readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = fileURLToPath(new URL('../', import.meta.url))
export const INDEX = 'docs/adr/INDEX.md'

// `- 0021 [Rule 20(c) is a modality shift, not a gate on the lights](0021-rule-20c-is-a-modality-shift.md)`
// `- 0022 reserved — <where the text is, and why it holds the number>`
const ENTRY = /^- (\d{4}) (?:\[(.+)\]\((.+\.md)\)|reserved\b)/

export const pad = (n) => String(n).padStart(4, '0')
const read = (path, root) => readFileSync(join(root, path), 'utf8')

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
