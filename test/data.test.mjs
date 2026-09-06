import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import Ajv2020 from 'ajv/dist/2020.js'

const load = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)))
const rules = load('data/rules.json')
const lights = load('data/lights.json')
const facts = load('data/facts.json')
const appl = load('data/applicability.json')
const images = load('data/images.json')
const geometry = load('data/geometry.json')
const deprecated = load('data/deprecated-identifiers.json')
const fixtures = load('fixtures/applicability-fixtures.json')

const byId = new Map(appl.entries.map((e) => [e.id, e]))

// --- reference evaluator -------------------------------------------------
// An entry applies when every constraint in its `when` is satisfied by the
// fact record. A fact that is absent never satisfies a constraint.
// One constraint. `k` is the fact key with any subject segment already
// stripped, so the two-subject evaluator below shares these semantics exactly
// rather than reimplementing them.
function satisfies(k, want, have) {
  // Absent is absent, and it is absent for `not` too: an absent fact never
  // satisfies a constraint, negated or not, so a norm is never attached to a
  // vessel on the strength of a fact the consumer did not supply.
  if (have === undefined) return false
  // 'activity:ram_underwater' is a refinement of 'activity:ram': predicates
  // written for ram read it too. The refinement belongs to the *value*, not to
  // one constraint form, so it is expanded once here and every form that
  // compares a value -- equality, list membership, and each `any_of` disjunct
  // through the recursion below -- sees the same reading. It used to be a
  // special case ahead of the array branch, which meant a list constraint
  // silently missed the refinement while a scalar caught it; the decode table
  // in facts.json carried an `any_of` written to work around exactly that.
  if (Array.isArray(want)) return want.includes(have) || readsAs(k, have).some((v) => want.includes(v))
  if (want !== null && typeof want === 'object') {
    // `not` negates the constraint, never the presence of the fact.
    if ('not' in want) return !satisfies(k, want.not, have)
    if ('any_of' in want) return want.any_of.some((w) => satisfies(k, w, have))
    if ('gte' in want && !(have >= want.gte)) return false
    if ('gt' in want && !(have > want.gt)) return false
    if ('lte' in want && !(have <= want.lte)) return false
    if ('lt' in want && !(have < want.lt)) return false
    return true
  }
  return have === want || readsAs(k, have).includes(want)
}
// The refinement table: a fact value that a predicate written for a coarser
// value also matches. Data rather than a branch, so that adding the next one
// is a line here and not a new special case in `satisfies`.
const REFINEMENTS = { 'fact:activity': { 'activity:ram_underwater': ['activity:ram'] } }
const NO_REFINEMENT = []
const readsAs = (k, have) => {
  const table = REFINEMENTS[k]
  if (table === undefined) return NO_REFINEMENT
  return table[have] ?? NO_REFINEMENT
}
// One walker for both evaluators, so `any_of` is written once rather than
// twice. `local` strips a key's subject segment for the refinement rule above;
// `read` maps a key to the value it denotes. `any_of` is the only key of a
// `when` that is not a fact -- every fact key carries a class prefix
// (`fact:`, `geo:`, ...), so the name is reserved without ambiguity.
function holds(when, local, read) {
  for (const k in when) {
    const want = when[k]
    if (k === 'any_of') {
      if (!want.some((sub) => holds(sub, local, read))) return false
    } else if (!satisfies(local(k), want, read(k))) return false
  }
  return true
}
function matches(when, f) {
  return holds(when, (k) => k, (k) => f[k])
}
// --- derived facts (facts.json `derived`) ----------------------------------
// A derived fact is one this package computes from the fact record instead of
// asking a consumer for. Its decode table *is* its definition -- the shape
// `signalk_navigation_state` already uses -- so this reads the table rather
// than restating it: an ordered list of rows, the first whose `when` matches
// wins, and no row matching leaves the fact absent.
const derivedFacts = Object.entries(facts.derived).filter(([k]) => k.startsWith('fact:'))
function derive(record) {
  const out = { ...(record ?? {}) }
  for (const [key, spec] of derivedFacts) {
    const row = spec.decode.find((r) => matches(r.when, out))
    if (row) out[key] = row.value
  }
  return out
}
// A situation's per-vessel records, with the derived facts filled in. `pair`
// has none: a derived fact is derived from one vessel's record.
function withDerived(s) {
  const out = { ...s }
  for (const subject of ['own', 'other']) {
    if (out[subject]) out[subject] = { ...out[subject], fact: derive(out[subject].fact) }
  }
  return out
}

// `applying` is the *display* evaluator: it answers 'what does this one vessel
// show'. A `scope` or `precedence` entry reads a situation, not a fact record,
// and Rule 4's predicate is empty because 'any condition of visibility' is the
// absence of a condition -- so an unfiltered evaluator would select it for
// every fact record in applicability-fixtures.json. REQ-CAT-1's `display`
// default is what makes the filter well-defined for the entries that predate it.
const isDisplay = (e) => (e.category ?? 'display') === 'display'
const applying = (f) => appl.entries.filter((e) => isDisplay(e) && matches(e.when, f)).map((e) => e.id)

test('fixtures: every fact record selects exactly the expected entries', () => {
  for (const c of fixtures.cases) {
    assert.deepEqual(applying(c.facts).sort(), [...c.expect].sort(), c.name)
  }
})

// --- schema (ADR 0006) ------------------------------------------------------
// Structure only: required keys, types, additionalProperties:false, id
// patterns, the closed modality/relation enums, and the shape of a predicate
// or a light reference. Cross-file references (cite -> rules.json, light id
// -> lights.json, etc.) are NOT the schema's job; they stay in the tests
// above and below. See docs/adr/0006-json-schema-and-identifier-diff.md.
const loadSchema = (p) => JSON.parse(readFileSync(new URL(`../schema/${p}`, import.meta.url)))
const schemaTargets = [
  ['data/rules.json', rules, loadSchema('rules.schema.json')],
  ['data/lights.json', lights, loadSchema('lights.schema.json')],
  ['data/facts.json', facts, loadSchema('facts.schema.json')],
  ['data/applicability.json', appl, loadSchema('applicability.schema.json')],
  ['data/geometry.json', geometry, loadSchema('geometry.schema.json')],
  ['data/images.json', images, loadSchema('images.schema.json')],
  ['data/deprecated-identifiers.json', deprecated, loadSchema('deprecated-identifiers.schema.json')],
  ['fixtures/applicability-fixtures.json', fixtures, loadSchema('applicability-fixtures.schema.json')],
  ['fixtures/situation-fixtures.json', load('fixtures/situation-fixtures.json'), loadSchema('situation-fixtures.schema.json')],
]

test('schema: every data file and the fixtures validate against schema/*.schema.json', () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true })
  for (const [file, data, schema] of schemaTargets) {
    const validate = ajv.compile(schema)
    const ok = validate(data)
    assert.ok(ok, `${file} fails ${schema.$id}:\n${ajv.errorsText(validate.errors, { separator: '\n' })}`)
  }
})

// --- the predicate language (README.md, 'Predicate semantics') -------------
// `not` and `any_of` are the two constructs Q-33 asked for. Their semantics are
// asserted here rather than only exercised through the data, because the
// absent-fact half of `not` is the part a reimplementation gets wrong.

test('predicate language: `not` negates the constraint, never the presence of the fact', () => {
  const has = { 'fact:activity': 'activity:nuc', 'fact:length_m': 15 }
  assert.equal(matches({ 'fact:activity': { not: 'activity:nuc' } }, has), false)
  assert.equal(matches({ 'fact:activity': { not: 'activity:ram' } }, has), true)
  assert.equal(matches({ 'fact:activity': { not: ['activity:nuc', 'activity:ram'] } }, has), false)
  assert.equal(matches({ 'fact:activity': { not: ['activity:fishing'] } }, has), true)
  assert.equal(matches({ 'fact:length_m': { not: { lt: 20 } } }, has), false)
  assert.equal(matches({ 'fact:length_m': { not: { gte: 20 } } }, has), true)

  // The rule this file exists to pin: an absent fact never satisfies a
  // constraint, negated or not. `not` over silence is unsatisfied, so a norm
  // is never attached to a vessel on the strength of a fact nobody supplied.
  // The consequence is deliberate and is the reason it gets its own assertion:
  // `{not: X}` and `X` are BOTH false for an absent fact, so they are not
  // complements over the empty record and the language is not classical there.
  assert.equal(matches({ 'fact:activity': { not: 'activity:nuc' } }, {}), false)
  assert.equal(matches({ 'fact:activity': 'activity:nuc' }, {}), false)
  // Double negation is still absent-conservative, and is otherwise involutive.
  assert.equal(matches({ 'fact:activity': { not: { not: 'activity:nuc' } } }, {}), false)
  assert.equal(matches({ 'fact:activity': { not: { not: 'activity:nuc' } } }, has), true)
  // The ram -> ram_underwater refinement is part of the constraint, so `not`
  // negates the refined reading too rather than sneaking underneath it.
  const dredger = { 'fact:activity': 'activity:ram_underwater' }
  assert.equal(matches({ 'fact:activity': 'activity:ram' }, dredger), true)
  assert.equal(matches({ 'fact:activity': { not: 'activity:ram' } }, dredger), false)
})

test('predicate language: `any_of` is disjunction, at both levels, and stays conservative', () => {
  const small = { 'fact:length_m': 12, 'fact:propulsion': 'propulsion:power' }
  const sail = { 'fact:length_m': 30, 'fact:propulsion': 'propulsion:sail' }
  const big = { 'fact:length_m': 30, 'fact:propulsion': 'propulsion:power' }
  // 9(b)'s subject: a vessel of less than 20 m in length OR a sailing vessel.
  // The two disjuncts read different facts, which is why `any_of` is a key of
  // the `when` and not a constraint on one fact.
  const nineB = { any_of: [{ 'fact:length_m': { lt: 20 } }, { 'fact:propulsion': 'propulsion:sail' }] }
  assert.equal(matches(nineB, small), true)
  assert.equal(matches(nineB, sail), true)
  assert.equal(matches(nineB, big), false)
  assert.equal(matches(nineB, {}), false)
  // A `when` is still a conjunction; `any_of` sits inside it as one conjunct.
  assert.equal(matches({ ...nineB, 'fact:propulsion': 'propulsion:power' }, small), true)
  assert.equal(matches({ ...nineB, 'fact:propulsion': 'propulsion:power' }, sail), false)
  // A sub-predicate is a full predicate: conjunctions and nesting both work.
  assert.equal(matches({ any_of: [{ any_of: [{ 'fact:length_m': { lt: 20 } }] }] }, small), true)
  assert.equal(matches({ any_of: [{ 'fact:length_m': { lt: 20 }, 'fact:propulsion': 'propulsion:sail' }] }, small), false)
  // An empty `any_of` is unsatisfiable, which is what a disjunction of nothing
  // means -- and is why no entry writes one.
  assert.equal(matches({ any_of: [] }, small), false)
  // As a constraint on one fact it is a disjunction of constraints.
  assert.equal(matches({ 'fact:length_m': { any_of: [{ lt: 10 }, { gt: 25 }] } }, sail), true)
  assert.equal(matches({ 'fact:length_m': { any_of: [{ lt: 10 }, { gt: 40 }] } }, sail), false)
  assert.equal(matches({ 'fact:length_m': { any_of: [{ lt: 10 }, { gt: 25 }] } }, {}), false)
})

test('predicate language: the ram refinement applies to equality, membership and `any_of` alike', () => {
  // The latent bug PR #25 recorded: the refinement used to be a special case
  // ahead of the array branch, so `activity:ram` caught a dredger and
  // `["activity:ram", "activity:nuc"]` did not. A reader cannot see that from
  // the data, and the workaround it forced -- an `any_of` in the
  // fact:rule18_class decode table where a list would read better -- was the
  // only sign of it. Fixed by expanding the value once, so every constraint
  // form that compares a value sees the same reading.
  const dredger = { 'fact:activity': 'activity:ram_underwater' }
  const ram = { 'fact:activity': 'activity:ram' }
  const nuc = { 'fact:activity': 'activity:nuc' }
  const k = 'fact:activity'
  // Equality, as before.
  assert.equal(matches({ [k]: 'activity:ram' }, dredger), true)
  // List membership: the case that was wrong.
  assert.equal(matches({ [k]: ['activity:ram', 'activity:nuc'] }, dredger), true)
  assert.equal(matches({ [k]: ['activity:nuc', 'activity:fishing'] }, dredger), false)
  assert.equal(matches({ [k]: ['activity:ram_underwater'] }, dredger), true)
  // `any_of`, over both scalars and lists.
  assert.equal(matches({ [k]: { any_of: ['activity:ram', 'activity:nuc'] } }, dredger), true)
  assert.equal(matches({ [k]: { any_of: [['activity:ram', 'activity:nuc']] } }, dredger), true)
  assert.equal(matches({ [k]: { any_of: [['activity:nuc']] } }, dredger), false)
  // `not` still negates the refined reading rather than sneaking underneath it,
  // in every form.
  assert.equal(matches({ [k]: { not: ['activity:ram'] } }, dredger), false)
  assert.equal(matches({ [k]: { not: { any_of: ['activity:ram'] } } }, dredger), false)
  assert.equal(matches({ [k]: { not: ['activity:nuc'] } }, dredger), true)
  // The refinement is one-way: a predicate for the finer value does not read
  // the coarser one, and no other value gains a reading.
  assert.equal(matches({ [k]: 'activity:ram_underwater' }, ram), false)
  assert.equal(matches({ [k]: ['activity:ram_underwater'] }, ram), false)
  assert.equal(matches({ [k]: ['activity:ram'] }, nuc), false)
  // It is scoped to the fact that declares it: no other key refines.
  assert.equal(matches({ 'fact:propulsion': ['activity:ram'] }, { 'fact:propulsion': 'activity:ram_underwater' }), false)
  // ...and it reaches the two-subject evaluator through the same `local`,
  // whichever subject the key names.
  const s = { own: { fact: dredger }, other: { fact: ram } }
  assert.equal(matchesSituation({ 'own:fact:activity': ['activity:ram'] }, s), true)
  assert.equal(matchesSituation({ 'other:fact:activity': ['activity:ram_underwater'] }, s), false)
})

test('the fact:rule18_class decode reads the ram refinement through a bare list', () => {
  // The workaround removed: the 3(g) row is a list again, and the refinement is
  // what makes it right. If the fix regressed, a dredger would decode to
  // nothing here rather than to `rule18_class:ram`.
  const row = facts.derived['fact:rule18_class'].decode.find((r) => r.cite === '3(g)')
  assert.ok(Array.isArray(row.when['fact:activity']), '3(g) decode row should be a bare list')
  assert.ok(!row.when['fact:activity'].includes('activity:ram_underwater'),
    'the refinement carries it; spelling it out would hide the next one')
  assert.equal(derive({ 'fact:propulsion': 'propulsion:power', 'fact:activity': 'activity:ram_underwater' })['fact:rule18_class'],
    'rule18_class:ram')
})

test('predicate language: both evaluators share it, and `any_of` reads two subjects', () => {
  // The whole point of implementing this in `satisfies`/`holds` rather than in
  // one evaluator: the situation evaluator gets it without a second copy.
  const s = { own: { fact: { 'fact:propulsion': 'propulsion:sail' } }, other: { fact: { 'fact:length_m': 12 } } }
  assert.equal(matchesSituation({ 'own:fact:propulsion': { not: 'propulsion:power' } }, s), true)
  assert.equal(matchesSituation({ 'other:fact:propulsion': { not: 'propulsion:power' } }, s), false,
    "other's propulsion is absent, and `not` over an absent fact is unsatisfied")
  assert.equal(matchesSituation({
    any_of: [{ 'own:fact:length_m': { lt: 20 } }, { 'other:fact:length_m': { lt: 20 } }],
  }, s), true)
  assert.equal(matchesSituation({
    any_of: [{ 'own:fact:length_m': { lt: 20 } }, { 'other:fact:length_m': { lt: 5 } }],
  }, s), false)
})

test('predicate language: `not` and `any_of` are exclusive of the other constraint forms', () => {
  // A constraint object carrying `not` or `any_of` carries nothing else: the
  // two return early, so a `{not: ..., lt: ...}` would silently drop the `lt`.
  // Checked over the data rather than left to review.
  const walk = (where, when) => {
    for (const [k, want] of Object.entries(when)) {
      if (k === 'any_of') { for (const sub of want) walk(where, sub); continue }
      const check = (w) => {
        if (w === null || typeof w !== 'object' || Array.isArray(w)) return
        const keys = Object.keys(w)
        for (const special of ['not', 'any_of']) {
          if (!keys.includes(special)) continue
          assert.deepEqual(keys, [special], `${where}: ${k} mixes ${special} with ${keys.join(', ')}`)
        }
        if (keys.includes('not')) check(w.not)
        if (keys.includes('any_of')) for (const sub of w.any_of) check(sub)
      }
      check(want)
    }
  }
  for (const e of appl.entries) {
    walk(e.id, e.when)
    for (const m of e.modality_by ?? []) walk(e.id, m.when)
    for (const c of e['rel:conditional_includes'] ?? []) walk(e.id, c.when ?? {})
  }
  for (const [key, spec] of derivedFacts) {
    for (const [i, row] of spec.decode.entries()) walk(`${key} decode[${i}]`, row.when)
  }
})

// --- derived facts: fact:rule18_class (Q-32) -------------------------------

test('fact:rule18_class: the decode table is the definition, and it is total where it claims to be', () => {
  const spec = facts.derived['fact:rule18_class']
  assert.equal(spec.derived, true)
  const values = new Set(spec.values)
  // Every declared value is produced by some row, and every row's value and
  // cite are declared -- so a value cannot rot into one nothing decodes to.
  assert.deepEqual([...new Set(spec.decode.map((r) => r.value))].sort(), [...values].sort())
  for (const v of values) assert.ok(spec.cites[v], `${v} has no cite`)
  for (const [v, c] of Object.entries(spec.cites)) {
    assert.ok(values.has(v), `cites names undeclared value ${v}`)
    assert.ok(rules.paragraphs[c], `${v} cites missing paragraph ${c}`)
  }
  for (const r of spec.decode) assert.ok(rules.paragraphs[r.cite], `decode row cites missing ${r.cite}`)

  const cls = (f) => derive(f)['fact:rule18_class']
  const power = { 'fact:propulsion': 'propulsion:power', 'fact:position': 'position:underway' }
  const sail = { 'fact:propulsion': 'propulsion:sail', 'fact:position': 'position:underway' }
  // The rank, not the lights: this is the divergence Q-32 recorded.
  assert.equal(cls({ ...power, 'fact:activity': 'activity:none' }), 'rule18_class:power')
  assert.equal(cls({ ...power, 'fact:activity': 'activity:nuc' }), 'rule18_class:nuc')
  assert.equal(cls({ ...power, 'fact:activity': 'activity:ram' }), 'rule18_class:ram')
  assert.equal(cls({ ...power, 'fact:activity': 'activity:ram_underwater' }), 'rule18_class:ram')
  assert.equal(cls({ ...power, 'fact:activity': 'activity:mine' }), 'rule18_class:ram', '3(g) enumerates mine clearance')
  assert.equal(cls({ ...power, 'fact:activity': 'activity:diving' }), 'rule18_class:ram', '3(g) enumerates diving')
  assert.equal(cls({ ...power, 'fact:activity': 'activity:trawling' }), 'rule18_class:fishing')
  assert.equal(cls({ ...sail, 'fact:activity': 'activity:fishing' }), 'rule18_class:fishing',
    '18(c) does not distinguish propulsion: a fishing vessel under sail is fishing, not sail')
  assert.equal(cls({ ...power, 'fact:activity': 'activity:cbd' }), 'rule18_class:cbd')
  assert.equal(cls({ ...sail, 'fact:activity': 'activity:none' }), 'rule18_class:sail')
  assert.equal(cls({ ...power, 'fact:activity': 'activity:pilot' }), 'rule18_class:power')
  // 27(c): the case Q-32 said the old hand-written lists could not catch.
  assert.equal(cls({ ...power, 'fact:activity': 'activity:towing' }), 'rule18_class:power')
  assert.equal(cls({ ...power, 'fact:activity': 'activity:towing', 'fact:tow_restricts_deviation': false }),
    'rule18_class:power')
  assert.equal(cls({ ...power, 'fact:activity': 'activity:towing', 'fact:tow_restricts_deviation': true }),
    'rule18_class:ram', '27(c): a tow that severely restricts the pair is RAM')
  // 18(f): the phase, not the craft. A WIG on the surface is 18(f)(ii)'s
  // power-driven vessel, which is what known_omissions says this table says.
  const wig = { ...power, 'fact:activity': 'activity:none', 'fact:wig': true }
  assert.equal(cls({ ...wig, 'fact:wig_near_surface': true }), 'rule18_class:wig')
  assert.equal(cls({ ...wig, 'fact:wig_near_surface': false }), 'rule18_class:power')
  // ...but a WIG that cannot manoeuvre is ranked by that, not by her phase.
  assert.equal(cls({ ...wig, 'fact:wig_near_surface': true, 'fact:activity': 'activity:nuc' }), 'rule18_class:nuc')

  // What the table deliberately does not classify, asserted so that it stays a
  // decision rather than becoming an oversight. Every case is in `undecodable`.
  assert.equal(cls({ 'fact:propulsion': 'propulsion:oars', 'fact:activity': 'activity:none' }), undefined,
    'Rule 18 does not rank a vessel under oars; 25(d)(ii) is a lights permission')
  assert.equal(cls({}), undefined)
  assert.equal(cls({ 'fact:activity': 'activity:none' }), undefined)
  assert.ok(!values.has('rule18_class:seaplane'), '18(e) has no fact behind it; known_omissions records it')
  assert.ok(spec.undecodable.length >= 3)
  for (const u of spec.undecodable) assert.ok(u.case && u.why)

  // A derived fact is never asked of a consumer, so it is not actuable and is
  // not in the switching subset.
  assert.equal(spec.actuable, false)
  assert.ok(!facts.actuable_subset.fields.includes('fact:rule18_class'))
})

test('fact:rule18_class: no precedence entry hand-lists an activity value any more (Q-32)', () => {
  // The strain this fact was added to remove: Rule 18's rank was written out as
  // an enumeration of display-axis values in eleven predicates, each of which
  // had to be edited whenever the axis grew, with nothing failing if one was
  // missed. If a precedence entry reads `fact:activity` again, either the class
  // is wrong or the entry is -- and this is where that argument happens.
  for (const e of precedence) {
    for (const k of factKeys(e.when)) {
      assert.ok(!k.endsWith('fact:activity'),
        `${e.id} reads ${k}; Rule 18's rank is fact:rule18_class, and fact:activity is a display axis`)
    }
  }
})

// --- drift (REQ-VERIFY-2) --------------------------------------------------
// Forward direction: fact record -> lights, via `applying`/`matches` above.
// Reverse direction: a set of lights already shown -> which other entries
// *could* have produced them. The two directions must not silently disagree:
// if some other entry's entire light output is already present in what a
// fixture shows, that entry must be absent from the fixture either because
// its own predicate rules out the fixture's facts (the forward direction
// correctly ruled it out) or because the data explicitly declares it related
// to an entry that IS shown (a declared alternative, not a silent gap).
function lightSig(e) {
  return (e.lights ?? []).map((l) => JSON.stringify(l)).sort()
}
const relatedIds = new Map(appl.entries.map((e) => [e.id, new Set()]))
const relate = (a, b) => { relatedIds.get(a)?.add(b); relatedIds.get(b)?.add(a) }
for (const e of appl.entries) {
  for (const r of e['rel:includes'] ?? []) relate(e.id, r)
  for (const r of e['rel:in_lieu_of'] ?? []) relate(e.id, r)
  for (const r of e['rel:excludes'] ?? []) relate(e.id, r)
  for (const r of e['rel:exempts'] ?? []) relate(e.id, r)
  for (const c of e['rel:conditional_includes'] ?? []) {
    for (const r of c['rel:includes'] ?? []) relate(e.id, r)
    for (const r of c.one_of ?? []) relate(e.id, r)
  }
}

test('drift: lights already shown never silently admit an undeclared candidate entry', () => {
  for (const c of fixtures.cases) {
    const shownIds = new Set(c.expect)
    const shown = new Set(appl.entries.filter((e) => shownIds.has(e.id)).flatMap(lightSig))
    for (const e of appl.entries) {
      if (shownIds.has(e.id)) continue
      const sig = lightSig(e)
      if (sig.length === 0 || !sig.every((s) => shown.has(s))) continue
      const excludedByFacts = !matches(e.when, c.facts)
      const declared = [...shownIds].some((id) => relatedIds.get(e.id)?.has(id))
      assert.ok(excludedByFacts || declared,
        `${c.name}: ${e.id}'s lights are already fully shown but it is neither ` +
        `ruled out by facts nor a declared relation of {${[...shownIds].join(',')}}`)
    }
  }
})

// --- integrity -----------------------------------------------------------
test('every entry cites a paragraph that exists in rules.json', () => {
  const check = (where, cite) => {
    const head = cite.split('-')[0].trim()
    assert.ok(rules.paragraphs[head], `${where} cites missing paragraph ${head}`)
  }
  for (const e of appl.entries) {
    check(e.id, e.cite)
    // A conditional_includes branch may carry its own cite (29a's (ii)/(iii),
    // 27f's two branches); it is a citation like any other and must resolve.
    for (const [i, c] of (e['rel:conditional_includes'] ?? []).entries()) {
      if (c.cite !== undefined) check(`${e.id} rel:conditional_includes[${i}]`, c.cite)
    }
  }
})

test('every cross-reference resolves to an entry id', () => {
  const refsOf = (e) => [
    ...(e['rel:includes'] ?? []), ...(e['rel:in_lieu_of'] ?? []),
    ...(e['rel:excludes'] ?? []), ...(e['rel:exempts'] ?? []),
    ...(e['rel:overrides'] ?? []),
    ...(e['rel:conditional_includes'] ?? [])
      .flatMap((c) => [...(c['rel:includes'] ?? []), ...(c.one_of ?? [])]),
  ]
  for (const e of appl.entries) {
    for (const r of refsOf(e)) assert.ok(byId.has(r), `${e.id} references unknown entry ${r}`)
  }
})

test('every light named by an entry is defined in lights.json', () => {
  for (const e of appl.entries) {
    for (const l of e.lights ?? []) {
      assert.ok(lights.lights[l.light], `${e.id} uses undefined light ${l.light}`)
    }
  }
})

// --- represented_paragraphs (REQ-CAT-2): care/meta paragraphs, never entries ---
test('every represented_paragraphs record cites a paragraph that exists in rules.json', () => {
  for (const r of appl.represented_paragraphs ?? []) {
    const head = r.cite.split('-')[0].trim()
    assert.ok(rules.paragraphs[head], `${r.id} cites missing paragraph ${head}`)
  }
})

test('no represented_paragraphs record carries a `when` or `lights`', () => {
  for (const r of appl.represented_paragraphs ?? []) {
    assert.ok(!('when' in r), `${r.id} carries a \`when\`; care/meta paragraphs are never evaluated as predicates`)
    assert.ok(!('lights' in r), `${r.id} carries \`lights\`; care/meta paragraphs never produce a light output`)
  }
})

test('every represented_paragraphs record has category care or meta', () => {
  for (const r of appl.represented_paragraphs ?? []) {
    assert.ok(['care', 'meta'].includes(r.category), `${r.id} has category ${r.category}, expected care or meta`)
  }
})

test('no care or meta paragraph appears as an applicability entry (REQ-CAT-2)', () => {
  const representedCites = new Set((appl.represented_paragraphs ?? []).map((r) => r.cite))
  for (const e of appl.entries) {
    assert.ok(!representedCites.has(e.cite), `${e.id} cites ${e.cite}, a care/meta paragraph; it must be in represented_paragraphs, not entries`)
  }
})

test('categories vocabulary is a closed set of the nine ADR-0005 names', () => {
  const expected = ['definition', 'standard', 'scope', 'display', 'classification', 'precedence', 'conduct', 'care', 'meta']
  assert.deepEqual(Object.keys(appl.categories).sort(), expected.sort())
})

test('images: on disk, catalogued, and unchanged', () => {
  const dir = new URL('../images/', import.meta.url)
  const onDisk = new Set(readdirSync(dir))
  assert.equal(Object.keys(images.images).length, onDisk.size)
  for (const [name, rec] of Object.entries(images.images)) {
    assert.ok(onDisk.has(name), `${name} catalogued but missing from images/`)
    const blob = readFileSync(new URL(name, dir))
    assert.equal(blob.length, rec.bytes, `${name} size`)
    assert.equal(createHash('sha256').update(blob).digest('hex'), rec.sha256, `${name} sha256`)
  }
  const cited = new Set([
    ...Object.values(rules.paragraphs).flatMap((p) => p.images ?? []),
    ...appl.entries.flatMap((e) => e.images ?? []),
  ])
  for (const name of cited) assert.ok(images.images[name], `${name} cited but not catalogued`)
})

test('navigation.state decodes only to values the axes define', () => {
  const axes = facts.axes
  for (const [state, d] of Object.entries(facts.signalk_navigation_state.decode)) {
    for (const axis of ['fact:propulsion', 'fact:activity', 'fact:position']) {
      if (d[axis] === undefined) continue
      assert.ok(axes[axis].values.includes(d[axis]), `${state}: bad ${axis} ${d[axis]}`)
    }
    // `also_activity` is a shape key of the decode table, not a fact key; the
    // value inside it is still an activity identifier.
    if (d.also_activity !== undefined) {
      assert.ok(axes['fact:activity'].values.includes(d.also_activity), `${state}: bad also_activity`)
    }
  }
})

test('every fact a predicate reads is declared in facts.json', () => {
  const declared = new Set([
    ...Object.keys(facts.axes), ...Object.keys(facts.modifiers),
    ...Object.keys(facts.numerics), ...Object.keys(facts.booleans),
    ...Object.keys(facts.enums), ...derivedFacts.map(([k]) => k),
  ])
  // Two-subject entries address a fact through the subject namespace and are
  // checked against the situation's own class declarations further down.
  // `any_of` holds sub-predicates rather than a constraint, so the keys are
  // collected recursively; it is the only key of a `when` that is not a fact.
  const keysOf = (when) => Object.entries(when).flatMap(([k, want]) =>
    k === 'any_of' ? want.flatMap(keysOf) : [k])
  for (const e of appl.entries.filter((x) => (x.subjects ?? 1) === 1)) {
    for (const k of keysOf(e.when)) assert.ok(declared.has(k), `${e.id}: undeclared fact ${k}`)
    for (const m of e.modality_by ?? []) {
      for (const k of keysOf(m.when)) assert.ok(declared.has(k), `${e.id}: undeclared fact ${k}`)
    }
  }
  // A derived fact's decode table reads facts too, and they must be declared.
  for (const [key, spec] of derivedFacts) {
    for (const [i, row] of spec.decode.entries()) {
      for (const k of keysOf(row.when)) assert.ok(declared.has(k), `${key} decode[${i}]: undeclared fact ${k}`)
    }
  }
})

test('every enumerated fact value a predicate names is declared in facts.json', () => {
  // The value namespace of an enumerated fact is the fact's own bare name
  // (`fact:activity` takes `activity:*`), so a missed prefix on either side
  // shows up here rather than as an entry that silently never matches.
  const valuesOf = new Map(
    [...Object.entries(facts.axes), ...Object.entries(facts.enums), ...derivedFacts]
      .map(([k, v]) => [k, new Set(v.values)])
  )
  // `not` and `any_of` nest, so the enumerated values a constraint names are
  // collected recursively; a numeric constraint names none.
  const valuesIn = (want) => {
    if (Array.isArray(want)) return want
    if (want !== null && typeof want === 'object') {
      if ('not' in want) return valuesIn(want.not)
      if ('any_of' in want) return want.any_of.flatMap(valuesIn)
      return []
    }
    return [want]
  }
  const check = (where, w) => {
    for (const [k0, want] of Object.entries(w)) {
      // A `when`-level `any_of` holds sub-predicates, not a constraint.
      if (k0 === 'any_of') { for (const sub of want) check(where, sub); continue }
      // `own:fact:activity` and `fact:activity` name the same value namespace;
      // without the strip a two-subject predicate's values go unchecked.
      const k = k0.replace(/^(own|other|pair):/, '')
      const allowed = valuesOf.get(k)
      if (!allowed) continue
      for (const v of valuesIn(want)) {
        assert.ok(allowed.has(v), `${where}: ${k} names undeclared value ${JSON.stringify(v)}`)
      }
    }
  }
  for (const e of appl.entries) {
    check(e.id, e.when)
    for (const m of e.modality_by ?? []) check(e.id, m.when)
    for (const c of e['rel:conditional_includes'] ?? []) check(e.id, c.when ?? {})
  }
  for (const c of fixtures.cases) check(c.name, c.facts)
  // A derived fact's decode table is a predicate too, and its rows produce
  // values that must be declared on the fact they decode to.
  for (const [key, spec] of derivedFacts) {
    for (const [i, row] of spec.decode.entries()) {
      check(`${key} decode[${i}]`, row.when)
      assert.ok(valuesOf.get(key).has(row.value), `${key} decode[${i}] produces undeclared ${row.value}`)
    }
  }
})

test('every relation an entry uses is declared in applicability.json', () => {
  const declared = new Set(Object.keys(appl.relations))
  // Both levels: a conditional_includes object carries its own `rel:includes`,
  // and refsOf reads that nested key by name — a typo there drops the reference
  // out of cross-reference and drift evaluation without failing anything else.
  const checkKeys = (where, obj) => {
    for (const k of Object.keys(obj)) {
      if (!k.startsWith('rel:')) continue
      assert.ok(declared.has(k), `${where} uses undeclared relation ${k}`)
    }
  }
  for (const e of appl.entries) {
    checkKeys(e.id, e)
    for (const [i, c] of (e['rel:conditional_includes'] ?? []).entries()) {
      checkKeys(`${e.id} rel:conditional_includes[${i}]`, c)
    }
  }
})

test('every entry modality is a value declared in applicability.json (REQ-CAT-3)', () => {
  const declaredModalities = new Set(Object.keys(appl.modalities))
  for (const e of appl.entries) {
    assert.ok(declaredModalities.has(e.modality), `${e.id} uses undeclared modality ${e.modality}`)
  }
})

test('every light id outside applicability.json resolves too', () => {
  // Rule 22 range tables and the Annex I geometry records both key on light
  // ids; nothing else asserted they resolve, so a rename could half-land.
  for (const [id, rec] of Object.entries(lights.lights)) {
    for (const c of rec.components ?? []) {
      assert.ok(lights.lights[c], `${id} has undefined component ${c}`)
    }
    if (rec.same_characteristics_as) {
      assert.ok(lights.lights[rec.same_characteristics_as],
        `${id} refers to undefined light ${rec.same_characteristics_as}`)
    }
  }
  for (const b of lights.visibility.bands) {
    for (const k of [...Object.keys(b.ranges_nm ?? {}), ...Object.keys(b.overrides_nm ?? {})]) {
      assert.ok(lights.lights[k], `Rule ${b.cite} gives a range for undefined light ${k}`)
    }
  }
  const groups = [geometry.vertical_positioning, geometry.horizontal_positioning,
                  geometry.direction_indicating]
  for (const g of groups) {
    for (const c of g) {
      if (!c.light) continue
      assert.ok(lights.lights[c.light], `${c.cite} positions undefined light ${c.light}`)
    }
  }
})

test('geometry entry references resolve', () => {
  const groups = [geometry.vertical_positioning, geometry.horizontal_positioning,
                  geometry.direction_indicating]
  for (const g of groups) {
    for (const c of g) {
      for (const id of c.applies_to_entries ?? []) {
        assert.ok(byId.has(id), `${c.cite} references unknown entry ${id}`)
      }
    }
  }
})

test('light arcs cover the span they claim', () => {
  for (const [id, l] of Object.entries(lights.lights)) {
    if (!l.arc || l.arc_deg == null) continue
    const span = (l.arc.to_deg - l.arc.from_deg + 360) % 360 || 360
    assert.equal(Math.round(span * 10) / 10, l.arc_deg, `${id} arc span`)
  }
})

// --- reversibility gates (REQ-GATE-1..4) -----------------------------------
// docs/gates.json is the machine-readable status of the §10 gates. It is what
// blocks a 1.0 tag; requirements.md prose cannot, and did not.
const gates = load('docs/gates.json')
const pkg = load('package.json')
const requirementsText = readFileSync(new URL('../docs/requirements.md', import.meta.url), 'utf8')
const fileExists = (p) => existsSync(new URL(`../${p}`, import.meta.url))

test('gates: the registry is well-formed and mirrors requirements.md §10', () => {
  const ids = gates.gates.map((g) => g.id)
  assert.equal(new Set(ids).size, ids.length, 'gate ids are unique')

  for (const g of gates.gates) {
    assert.ok(g.closing_event in gates.closing_events, `${g.id}: unknown closing_event ${g.closing_event}`)
    assert.ok(g.status in gates.statuses, `${g.id}: unknown status ${g.status}`)
    assert.ok(fileExists(g.declined_in), `${g.id}: declined_in does not resolve: ${g.declined_in}`)
    if (g.settled_by !== null) {
      assert.ok(fileExists(g.settled_by), `${g.id}: settled_by does not resolve: ${g.settled_by}`)
    }
    if (g.status !== 'open') {
      assert.notEqual(g.settled_by, null, `${g.id}: a non-open gate must cite the ADR that settled it (REQ-GATE-4)`)
    }
    assert.match(requirementsText, new RegExp(`\\*\\*${g.id} —`), `${g.id}: not documented in requirements.md §10`)
  }

  // Both directions: a gate added to the prose but not the registry would be
  // invisible to the 1.0 block below, which is the failure this test exists for.
  for (const [, id] of requirementsText.matchAll(/\*\*(GATE-\d+) —/g)) {
    assert.ok(ids.includes(id), `${id} is in requirements.md §10 but not in docs/gates.json`)
  }
})

test('REQ-GATE-3: tagging 1.0 is blocked until every 1.0-gated gate is re-taken', () => {
  const major = Number(String(pkg.version).split('.')[0])
  assert.ok(Number.isInteger(major), `package.json version is unparseable: ${pkg.version}`)

  const gatedOn10 = gates.gates.filter((g) => g.closing_event === '1.0-tag')
  if (major < 1) {
    // Pre-1.0 the gates may stand open; nothing to assert beyond well-formedness.
    return
  }
  assert.ok(gatedOn10.length > 0, 'no gate is closed by the 1.0 tag — registry looks empty, failing closed')
  for (const g of gatedOn10) {
    assert.notEqual(
      g.status,
      'open',
      `${g.id} (${g.title}) is still open and its closing event is the 1.0 tag. ` +
        'REQ-GATE-3: re-take it in an ADR — confirm or adopt — and update docs/gates.json before releasing 1.0.'
    )
    assert.ok(
      typeof g.settled_by === 'string' && fileExists(g.settled_by),
      `${g.id}: REQ-GATE-3 requires the re-take to cite a resolvable ADR; settled_by is ${JSON.stringify(g.settled_by)}`
    )
  }
})

// --- identifier immutability baseline (REQ-MODEL-10) ------------------------
// The baseline is the one exception to REQ-MODEL-10, and it is settable exactly
// once. A build cannot read git history, so it cannot catch the literal being
// edited in place — but the escape hatch REQ-MODEL-10 names is a *second*
// baseline granted for the next convenient rename, and that this can refuse.
// Editing the pin below is still possible; it is just no longer silent.
const BASELINE_RE = /\*\*Immutability baseline: `([^`]+)`\.\*\*/g

// Scoped to REQ-MODEL-10's own section: a baseline moved out of the requirement
// and re-stated somewhere with no normative force would otherwise still count.
const reqModel10Section = () => {
  const start = requirementsText.indexOf('- **REQ-MODEL-10**')
  assert.notEqual(start, -1, 'REQ-MODEL-10 is missing from docs/requirements.md')
  const end = requirementsText.indexOf('- **REQ-MODEL-11**', start)
  assert.notEqual(end, -1, 'REQ-MODEL-11 is missing; cannot bound REQ-MODEL-10')
  return requirementsText.slice(start, end)
}

test('REQ-MODEL-10: the immutability baseline is stated exactly once, and is 0.1.1', () => {
  const whole = [...requirementsText.matchAll(BASELINE_RE)].map((m) => m[1])
  const found = [...reqModel10Section().matchAll(BASELINE_RE)].map((m) => m[1])
  assert.deepEqual(whole, found,
    'an immutability baseline is stated outside REQ-MODEL-10; the baseline is ' +
    'normative only where the requirement itself states it.')
  assert.equal(found.length, 1,
    `REQ-MODEL-10 declares ${found.length} immutability baselines (${found.join(', ')}); ` +
    'it is settable exactly once. A second baseline is the escape hatch the requirement forbids.')
  assert.equal(found[0], '0.1.1',
    'the immutability baseline has moved. REQ-MODEL-10: it MUST NOT be moved, raised or re-stated.')
})

// --- identifier diff against the last release (ADR 0006, REQ-PKG-4) --------
// Version discipline comes from an identifier diff, not the schema: a schema
// diff would miss nearly every real break (REQ-PKG-4 defines a breaking
// change as removal of an entry id, a fact vocabulary value, or a change in
// relation semantics -- all data changes the schema doesn't see). This test
// extracts every published identifier from the last release tag and compares
// it with HEAD; any removal not accompanied by a deprecation marker in
// data/deprecated-identifiers.json (REQ-MODEL-11) fails.
function extractIdentifiers({ rules, lights, facts, appl }) {
  const ids = new Set()
  // Keys in lights.json already carry their `light:` prefix (docs/identifiers.md).
  for (const id of Object.keys(lights.lights ?? {})) ids.add(id)
  for (const path of Object.keys(rules.paragraphs ?? {})) ids.add(`paragraph:${path}`)
  for (const e of appl.entries ?? []) ids.add(`entry:${e.id}`)
  for (const k of Object.keys(appl.relations ?? {})) ids.add(`rel:${k}`)
  const factGroups = [facts.axes, facts.modifiers, facts.numerics, facts.booleans, facts.enums]
  for (const group of factGroups) {
    for (const [k, v] of Object.entries(group ?? {})) {
      ids.add(`fact-key:${k}`)
      for (const val of v.values ?? []) ids.add(`fact-value:${val}`)
    }
  }
  // facts.situation (kin:/geo:/hist:) is pencil (docs/conventions.md): ADR 0005
  // allows it to break in v0.x, so it is deliberately not diffed until inked.
  return ids
}

function latestReleaseTag() {
  let out
  try {
    out = execFileSync('git', ['tag', '--list', 'v*.*.*'], { encoding: 'utf8' })
  } catch (err) {
    assert.fail(`identifier diff: could not list git tags (${err.message}); a missing baseline must fail loudly, not skip`)
  }
  const tags = out.split('\n').map((s) => s.trim()).filter(Boolean)
  assert.ok(tags.length > 0,
    'identifier diff: no release tag (v*.*.*) found. In CI, fetch tags first (`git fetch --tags`); ' +
    'locally, this needs at least one release tag present. Refusing to skip.')
  const parts = (t) => t.slice(1).split('.').map(Number)
  tags.sort((a, b) => {
    const pa = parts(a), pb = parts(b)
    for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i]
    return 0
  })
  return tags[tags.length - 1]
}

function loadAtTag(tag, path) {
  const text = execFileSync('git', ['show', `${tag}:${path}`], { encoding: 'utf8' })
  return JSON.parse(text)
}

test('identifier diff: no identifier published in the last release is silently removed', () => {
  const tag = latestReleaseTag()
  const before = extractIdentifiers({
    rules: loadAtTag(tag, 'data/rules.json'),
    lights: loadAtTag(tag, 'data/lights.json'),
    facts: loadAtTag(tag, 'data/facts.json'),
    appl: loadAtTag(tag, 'data/applicability.json'),
  })
  const after = extractIdentifiers({ rules, lights, facts, appl })
  const deprecatedIds = new Set(Object.keys(deprecated))
  const removed = [...before].filter((id) => !after.has(id) && !deprecatedIds.has(id))
  assert.deepEqual(removed, [],
    `identifier(s) removed since ${tag} with no deprecation marker (REQ-MODEL-10/REQ-PKG-4): ${removed.join(', ')}. ` +
    'Add the identifier back, or deprecate it in data/deprecated-identifiers.json before removing it.')
})

test('REQ-MODEL-10: every entry id is unique, and none collides with a retired id', () => {
  // `byId` above is a Map built from `appl.entries`, which silently drops a
  // duplicate key rather than asserting on it -- so a colliding id would
  // pass every other test in this file undetected. This is the one place
  // REQ-MODEL-10's "a retired id is never reused" guarantee is actually
  // enforced, rather than left to a reviewer noticing the note by hand.
  const ids = appl.entries.map((e) => e.id)
  const seen = new Set()
  for (const id of ids) {
    assert.ok(!seen.has(id), `entry id ${id} is used by more than one entry`)
    seen.add(id)
  }
  const retired = Object.keys(appl.retired_entry_ids?.ids ?? {})
  for (const id of retired) {
    assert.ok(!seen.has(id),
      `${id} is both an active entry id and a retired_entry_ids key -- ` +
      'REQ-MODEL-10 forbids reusing a retired id for a different entry')
  }
})

test('REQ-MODEL-3 lists exactly the enumerated axis values facts.json declares', () => {
  // Finding-1 recurrence guard: the requirement enumerates the three axes'
  // values, so it drifts silently every time an axis gains or renames one.
  const start = requirementsText.indexOf('- **REQ-MODEL-3**')
  const end = requirementsText.indexOf('- **REQ-MODEL-4**', start)
  assert.ok(start !== -1 && end !== -1, 'REQ-MODEL-3/4 missing from requirements')
  const section = requirementsText.slice(start, end)
  const listed = [...section.matchAll(/`([a-z_]+:[a-z_]+)`/g)].map((m) => m[1])
  for (const [axis, rec] of Object.entries(facts.axes)) {
    for (const v of rec.values) {
      assert.ok(listed.includes(v), `REQ-MODEL-3 omits ${axis} value ${v}`)
    }
  }
  const prefixes = new Set(Object.values(facts.axes).flatMap((r) => r.values).map((v) => v.split(':')[0]))
  const declared = new Set(Object.values(facts.axes).flatMap((r) => r.values))
  for (const m of section.matchAll(/`([a-z_]+:[a-z_]+)`/g)) {
    if (!prefixes.has(m[1].split(':')[0])) continue
    assert.ok(declared.has(m[1]), `REQ-MODEL-3 names undeclared axis value ${m[1]}`)
  }
})

// --- two-subject evaluator (ADR 0005, REQ-CAT-4/5) -------------------------
// A situation predicate addresses a fact as `<subject>:<class>:<key>` --
// `own:fact:activity`, `other:geo:rel_bearing_deg`, `pair:geo:in_sight` --
// and a key with no subject segment means `own:`, which is what keeps every
// one-subject entry and every published fixture valid unedited. The namespace
// is docs/identifiers.md, section 'Two subjects'; the fact classes it names
// are declared in facts.json's `situation` section.
const situationFixtures = load('fixtures/situation-fixtures.json')
const sit = facts.situation
const SUBJECTS = new Set(Object.keys(sit.namespace.subjects))
const CLASSES = new Set(Object.keys(sit.namespace.classes))
// `pair` carries only what is symmetric between the two vessels.
// `pair` carries what is symmetric between the two vessels: their relative
// geometry, and where the encounter is happening.
const PAIR_CLASSES = new Set(['geo', 'env'])

// Memoised: a situation predicate is evaluated once per entry per situation and
// the partition sweep below runs a million of them, so splitting the same dozen
// key strings over and over is the whole cost of the test suite.
const parsedKeys = new Map()
function parseKey(key) {
  let hit = parsedKeys.get(key)
  if (hit === undefined) {
    const seg = key.split(':')
    const subject = SUBJECTS.has(seg[0]) ? seg.shift() : 'own'
    hit = { subject, cls: seg[0], local: seg.join(':') }
    parsedKeys.set(key, hit)
  }
  return hit
}

// Absent is absent: an unresolvable key yields undefined, and `satisfies`
// fails it, exactly as a missing fact does in the one-subject evaluator.
function resolve(key, situation) {
  const { subject, cls, local } = parseKey(key)
  const held = situation?.[subject]?.[cls]
  return held === undefined ? undefined : held[local]
}

const localOf = (k) => parseKey(k).local
function matchesSituation(when, situation) {
  return holds(when, localOf, (k) => resolve(k, situation))
}

// --- geometric consistency (Q-48, REQ-VERIFY-8) -----------------------------
// The relative geometry a situation states is redundant with its kinematic
// state, and a record can state a set no two vessels can occupy. facts.json
// declares the equations under situation.geometry.consistency; this is the
// same check, written once and applied to every fixture and to every
// situation a sweep below constructs. A quantity the record does not state
// constrains nothing: a sparse record is unchecked, never inconsistent.
const CONSISTENCY = sit.geometry.consistency
const TOL = CONSISTENCY.tolerances
const KN_MS = 0.514444
const EARTH_R_M = 6371000
const rad = (d) => d * Math.PI / 180
const deg = (r) => r * 180 / Math.PI
const norm360 = (d) => ((d % 360) + 360) % 360
const angleApart = (a, b) => Math.abs(norm360(a - b + 180) - 180)
const within = (got, want, floor, fraction = 0) =>
  Math.abs(got - want) <= Math.max(floor, Math.abs(want) * fraction)
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

function greatCircle(a, b) {
  const la1 = rad(a.latitude), la2 = rad(b.latitude), dlo = rad(b.longitude - a.longitude)
  const h = Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dlo / 2) ** 2
  const y = Math.sin(dlo) * Math.cos(la2)
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dlo)
  return { range_m: 2 * EARTH_R_M * Math.asin(Math.sqrt(h)), bearing_deg: norm360(deg(Math.atan2(y, x))) }
}
function destination(from, bearing_deg, range_m) {
  const la1 = rad(from.latitude), lo1 = rad(from.longitude), d = range_m / EARTH_R_M, b = rad(bearing_deg)
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(b))
  const lo2 = lo1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2))
  return { latitude: deg(la2), longitude: deg(lo2) }
}

// Relative motion in own's frame -- x to starboard, y ahead -- with each vessel
// moving along her heading at her speed over the ground. The bearing rate is
// positive when the compass bearing of the other from own is increasing.
function relativeMotion({ range_m, ownRel, ownHeading, otherHeading, ownSog, otherSog }) {
  const x = range_m * Math.sin(rad(ownRel)), y = range_m * Math.cos(rad(ownRel))
  const u = ownSog * KN_MS, v = otherSog * KN_MS, rel = rad(otherHeading - ownHeading)
  const vx = v * Math.sin(rel), vy = v * Math.cos(rel) - u
  const vv = vx * vx + vy * vy
  const cross = x * vy - y * vx
  return {
    cpa_m: vv === 0 ? range_m : Math.abs(cross) / Math.sqrt(vv),
    tcpa_s: vv === 0 ? Infinity : -(x * vx + y * vy) / vv,
    bearing_change_deg_min: -deg(cross / (range_m * range_m)) * 60,
  }
}

// Every disagreement between what a situation states and what its other stated
// quantities imply, as strings. Empty means consistent.
function inconsistencies(s) {
  const out = []
  const own = s.own ?? {}, other = s.other ?? {}, pg = s.pair?.geo ?? {}
  const ro = own.geo?.['geo:rel_bearing_deg'], rt = other.geo?.['geo:rel_bearing_deg']
  const ho = own.kin?.['kin:heading_deg'], ht = other.kin?.['kin:heading_deg']
  const po = own.kin?.['kin:position'], pt = other.kin?.['kin:position']
  if (isNum(ro) && isNum(rt) && isNum(ho) && isNum(ht)) {
    const gap = angleApart(ro + ho + 180, rt + ht)
    if (gap > TOL.bearing_deg) out.push(`headings: own ${ro} on ${ho} and other ${rt} on ${ht} are ${gap.toFixed(2)} deg off one line of sight`)
  }
  const fwd = po && pt ? greatCircle(po, pt) : undefined
  if (fwd) {
    const back = greatCircle(pt, po)
    if (isNum(pg['geo:range_m']) && !within(fwd.range_m, pg['geo:range_m'], TOL.range_m, TOL.range_fraction)) {
      out.push(`positions: range ${fwd.range_m.toFixed(0)} m, stated ${pg['geo:range_m']}`)
    }
    if (isNum(ro) && isNum(ho) && angleApart(fwd.bearing_deg - ho, ro) > TOL.bearing_deg) {
      out.push(`positions: own:geo:rel_bearing_deg ${norm360(fwd.bearing_deg - ho).toFixed(2)}, stated ${ro}`)
    }
    if (isNum(rt) && isNum(ht) && angleApart(back.bearing_deg - ht, rt) > TOL.bearing_deg) {
      out.push(`positions: other:geo:rel_bearing_deg ${norm360(back.bearing_deg - ht).toFixed(2)}, stated ${rt}`)
    }
  }
  // The motion tier needs a range and own's relative bearing. Stated values
  // are read first; positions supply either one the record leaves out, so a
  // record that states positions, headings and speeds has its CPA, TCPA and
  // bearing rate checked whether or not it restates the range and bearing
  // the positions already fix.
  const uo = own.kin?.['kin:sog_kn'], ut = other.kin?.['kin:sog_kn']
  const range = isNum(pg['geo:range_m']) ? pg['geo:range_m'] : fwd?.range_m
  const ownRel = isNum(ro) ? ro : fwd && isNum(ho) ? norm360(fwd.bearing_deg - ho) : undefined
  if (isNum(ownRel) && isNum(ho) && isNum(ht) && isNum(uo) && isNum(ut) && isNum(range)) {
    const m = relativeMotion({ range_m: range, ownRel, ownHeading: ho, otherHeading: ht, ownSog: uo, otherSog: ut })
    const check = (key, floor, fraction) => {
      const want = pg[`geo:${key}`]
      if (isNum(want) && !within(m[key], want, floor, fraction)) out.push(`motion: ${key} ${m[key].toFixed(2)}, stated ${want}`)
    }
    check('cpa_m', TOL.cpa_m, TOL.cpa_fraction)
    check('tcpa_s', TOL.tcpa_s, TOL.tcpa_fraction)
    check('bearing_change_deg_min', TOL.bearing_change_deg_min)
  }
  return out
}
const consistent = (s) => inconsistencies(s).length === 0

// The fact classes the situation section declares, per class, as bare keys.
const situationDeclared = {
  fact: new Set([
    ...Object.keys(facts.axes), ...Object.keys(facts.modifiers),
    ...Object.keys(facts.numerics), ...Object.keys(facts.booleans),
    ...Object.keys(facts.enums), ...derivedFacts.map(([k]) => k),
  ]),
  kin: new Set(Object.keys(sit.kinematics).filter((k) => k.startsWith('kin:'))),
  // Directional geometry is stated per vessel subject, symmetric geometry
  // once under `pair`; the two sets are kept apart so a key placed under the
  // wrong subject fails rather than passing on class membership alone.
  geo: {
    own: new Set(Object.keys(sit.geometry.directional)),
    other: new Set(Object.keys(sit.geometry.directional)),
    pair: new Set(Object.keys(sit.geometry.symmetric)),
  },
  hist: new Set(Object.keys(sit.history).filter((k) => k.startsWith('hist:'))),
  env: new Set(Object.keys(sit.environment).filter((k) => k.startsWith('env:'))),
}

test('REQ-CAT-4: the situation section declares the classes the namespace names', () => {
  assert.deepEqual([...SUBJECTS].sort(), ['other', 'own', 'pair'])
  assert.deepEqual([...CLASSES].sort(), ['env', 'fact', 'geo', 'hist', 'kin'])
  // The fact record is reachable unchanged: `own:fact:*` must resolve to the
  // very keys facts.json already declares, not to a renamed copy of them.
  for (const k of situationDeclared.fact) {
    assert.equal(parseKey(`own:${k}`).local, k, `${k} does not survive the subject prefix`)
  }
  // Every new fact carries the numeric-fact shape the rest of the file uses.
  const shaped = [
    ...Object.entries(sit.kinematics).filter(([k]) => k.startsWith('kin:')),
    ...Object.entries(sit.geometry.directional),
    ...Object.entries(sit.geometry.symmetric),
    ...Object.entries(sit.history).filter(([k]) => k.startsWith('hist:')),
    ...Object.entries(sit.environment).filter(([k]) => k.startsWith('env:')),
  ]
  assert.ok(shaped.length > 0)
  for (const [k, rec] of shaped) {
    assert.ok('type' in rec, `${k}: no type`)
    assert.ok('cite' in rec, `${k}: no cite`)
    assert.ok(typeof rec.actuable === 'boolean', `${k}: no actuable`)
    assert.ok('signalk' in rec, `${k}: no signalk`)
    // A null cite is only allowed when `cite_pending` is explicitly null too --
    // meaning no COLREGS paragraph will ever justify it (kin:dynamics is not a
    // COLREGS concept). Now that Rules 1-19 are transcribed there is no more
    // "waiting on transcription": a fact naming a pending paragraph but never
    // resolving to it is a fact nobody finished citing.
    if (rec.cite === null) {
      assert.ok('cite_pending' in rec, `${k}: null cite with no cite_pending`)
      assert.equal(rec.cite_pending, null, `${k}: null cite must have cite_pending explicitly null`)
    } else {
      assert.ok(rules.paragraphs[rec.cite], `${k}: cite ${rec.cite} not in rules.json`)
    }
    if (rec.type === 'enum') {
      const prefix = k.split(':').pop()
      for (const v of rec.values) {
        assert.equal(v.split(':')[0], prefix, `${k}: value ${v} is not in its own fact's namespace`)
      }
    }
  }
})

test('REQ-CAT-4: an existing one-subject predicate is a valid situation predicate unedited', () => {
  // The backward-compatibility claim of docs/identifiers.md, asserted rather
  // than described: a bare key means `own:`, so every published fixture is a
  // one-subject situation and every entry still selects exactly the same ids.
  for (const c of fixtures.cases) {
    const asSituation = { own: { fact: c.facts } }
    const viaSituation = appl.entries.filter((e) => isDisplay(e) && matchesSituation(e.when, asSituation)).map((e) => e.id)
    assert.deepEqual(viaSituation.sort(), applying(c.facts).sort(), c.name)
  }
})

test('REQ-CAT-5: situation fixtures are well-formed and resolve in the namespace', () => {
  assert.equal(situationFixtures.schema, 'situation/1')
  const names = new Set()
  for (const c of situationFixtures.cases) {
    assert.ok(c.name && !names.has(c.name), `duplicate or missing case name: ${c.name}`)
    names.add(c.name)
    assert.ok(situationFixtures.case_status.values.includes(c.status), `${c.name}: bad status`)
    for (const [subject, classes] of Object.entries(c.situation)) {
      assert.ok(SUBJECTS.has(subject), `${c.name}: unknown subject ${subject}`)
      for (const [cls, record] of Object.entries(classes)) {
        assert.ok(CLASSES.has(cls), `${c.name}: unknown class ${cls}`)
        if (subject === 'pair') assert.ok(PAIR_CLASSES.has(cls), `${c.name}: pair:${cls} is not symmetric`)
        for (const k of Object.keys(record)) {
          const declared = cls === 'geo' ? situationDeclared.geo[subject] : situationDeclared[cls]
          assert.ok(declared.has(k), `${c.name}: undeclared ${cls} fact ${k} under ${subject}`)
          // Round-trip: the fully-qualified key must resolve back to the value.
          assert.equal(resolve(`${subject}:${k}`, c.situation), record[k], `${c.name}: ${subject}:${k} does not resolve`)
        }
      }
    }
    // Nothing in Part B is modelled, so an illustrative case asserts no
    // entries. A binding one joins the replay and every id it names must exist.
    if (c.status === 'illustrative') assert.deepEqual(c.expect, [], `${c.name}: illustrative cases assert nothing yet`)
    for (const x of c.expect) {
      const id = typeof x === 'string' ? x : x.entry
      assert.ok(byId.has(id), `${c.name}: unknown entry ${id}`)
      // Q-5: the optional per-entry modality. A bare id asserts nothing.
      if (typeof x !== 'string') assert.ok(x.modality in appl.modalities, `${c.name}: unknown modality ${x.modality}`)
    }
  }
  assert.ok(situationFixtures.cases.length >= 2)
  // Q-5's extension, asserted through the schema's own worked example, since
  // no case uses the object form yet: an `expect` element is a bare entry id
  // or {entry, modality}, and both must resolve.
  const ex = situationFixtures.expect_form
  assert.ok(byId.has(ex.bare))
  assert.ok(byId.has(ex.with_modality.entry))
  assert.ok(ex.with_modality.modality in appl.modalities)
})

test('REQ-CAT-4: subject and class resolution is exact, and aspect is a subject swap', () => {
  const c = situationFixtures.cases.find((x) => x.name.startsWith('crossing:'))
  assert.ok(c, 'the crossing fixture is the one this asserts against')
  // The same key under the two subjects reads two different vessels: relative
  // bearing under `own`, aspect under `other`. That is the whole point of the
  // namespace, so it gets an assertion rather than a paragraph.
  assert.equal(resolve('own:geo:rel_bearing_deg', c.situation), 40)
  assert.equal(resolve('other:geo:rel_bearing_deg', c.situation), 280)
  assert.notEqual(
    resolve('own:geo:rel_bearing_deg', c.situation),
    resolve('other:geo:rel_bearing_deg', c.situation))
  // A bare key is `own:`, and a pair fact is reachable from neither vessel.
  assert.equal(resolve('fact:length_m', c.situation), resolve('own:fact:length_m', c.situation))
  assert.equal(resolve('pair:geo:in_sight', c.situation), true)
  assert.equal(resolve('own:geo:in_sight', c.situation), undefined)
  // Absent is absent, and an absent fact never satisfies a constraint.
  assert.equal(matchesSituation({ 'own:geo:in_sight': true }, c.situation), false)
  assert.equal(matchesSituation({ 'pair:geo:in_sight': true }, c.situation), true)
  // A two-subject predicate reads both vessels at once.
  assert.equal(matchesSituation({
    'own:fact:propulsion': 'propulsion:power',
    'other:fact:propulsion': 'propulsion:power',
    'pair:geo:in_sight': true,
    'own:geo:rel_bearing_deg': { gt: 0, lt: 112.5 },
  }, c.situation), true, 'other on own\'s starboard bow')
  // Rule 13(b)'s overtaking sector, written once in the rule's own units.
  const overtaking = { 'other:geo:rel_bearing_deg': { gt: 112.5, lt: 247.5 } }
  assert.equal(matchesSituation(overtaking, c.situation), false)
  const latched = situationFixtures.cases.find((x) => x.name.startsWith('13(d)'))
  assert.equal(matchesSituation(overtaking, latched.situation), false,
    'the bearing has drawn out past the sector, which is why 13(d) exists')
  assert.equal(matchesSituation({ 'own:hist:was_overtaking': true }, latched.situation), true)
  assert.equal(matchesSituation({ 'other:hist:was_overtaking': true }, latched.situation), false)
})

// --- two-subject entries: scope and precedence (ADR 0005, REQ-CAT-1/3/6) ----
// The first data written against the situation record. Everything below either
// checks the shape of the new entries or replays the situation fixtures through
// `matchesSituation` above -- the same evaluator, not a second one.
const twoSubject = appl.entries.filter((e) => (e.subjects ?? 1) > 1)
const precedence = appl.entries.filter((e) => e.category === 'precedence')

test('REQ-CAT-1: every entry category is one of the nine, and display is the default', () => {
  const names = new Set(Object.keys(appl.categories))
  for (const e of appl.entries) {
    assert.ok(names.has(e.category ?? 'display'), `${e.id}: unknown category ${e.category}`)
  }
  assert.ok(twoSubject.length > 0, 'no two-subject entry exists; this file is meant to be checking some')
  for (const e of twoSubject) {
    assert.ok(['scope', 'precedence', 'classification'].includes(e.category),
      `${e.id}: subjects > 1 with category ${e.category}`)
    assert.equal(e.subjects, 2, `${e.id}: only 1 and 2 subjects are modelled`)
    assert.ok(!('lights' in e), `${e.id}: a two-subject entry produces an effect, never lights`)
  }
})

// Every fact key a predicate reads, at any depth: `any_of` holds sub-predicates
// and is the one key of a `when` that is not a fact.
function factKeys(when) {
  return Object.entries(when).flatMap(([k, want]) =>
    k === 'any_of' ? want.flatMap(factKeys) : [k])
}

test('REQ-CAT-6: every fact a two-subject predicate reads resolves in the situation namespace', () => {
  for (const e of twoSubject) {
    for (const k of factKeys(e.when)) {
      const { subject, cls, local } = parseKey(k)
      assert.ok(SUBJECTS.has(subject), `${e.id}: unknown subject in ${k}`)
      assert.ok(CLASSES.has(cls), `${e.id}: unknown class in ${k}`)
      if (subject === 'pair') assert.ok(PAIR_CLASSES.has(cls), `${e.id}: pair:${cls} is not symmetric`)
      else assert.ok(cls !== 'env', `${e.id}: env is a fact of the pair, never of a vessel`)
      const declared = cls === 'geo' ? situationDeclared.geo[subject] : situationDeclared[cls]
      assert.ok(declared.has(local), `${e.id}: undeclared ${cls} fact ${local} in ${k}`)
    }
  }
})

test('every effect is shaped for its category and names declared roles', () => {
  const roles = new Set(Object.keys(appl.effects.roles))
  for (const e of twoSubject) {
    assert.ok(e.effect, `${e.id}: a two-subject entry must state an effect`)
    if (e.category === 'precedence') {
      assert.deepEqual(Object.keys(e.effect).sort(), ['other', 'own'], `${e.id}: precedence effect shape`)
      for (const [subject, role] of Object.entries(e.effect)) {
        assert.ok(roles.has(role), `${e.id}: ${subject} takes undeclared role ${role}`)
      }
      // `stand-on` is Rule 17, which attaches only where the counterpart is to
      // keep out of the way. A shall-not-impede duty confers nothing (8(f)(iii)).
      if (e.effect.other === 'stand-on') {
        assert.equal(e.effect.own, 'give-way',
          `${e.id}: the counterpart of stand-on is give-way; 8(f)(iii) is why shall-not-impede pairs with none`)
      }
      if (e.effect.own === 'shall-not-impede') {
        assert.equal(e.effect.other, 'none',
          `${e.id}: shall-not-impede confers no role on the other vessel (8(f)(iii))`)
      }
    } else if (e.category === 'classification') {
      // Two shapes under one category, and exactly one key either way: Rule
      // 7(d) answers whether risk exists and Rules 13-15 answer what kind of
      // encounter this is. A merged shape would have made every encounter
      // entry state a risk it does not decide.
      const keys = Object.keys(e.effect)
      assert.equal(keys.length, 1, `${e.id}: a classification effect carries exactly one key`)
      if (keys[0] === 'encounter') {
        assert.ok(e.effect.encounter in appl.effects.encounters,
          `${e.id}: undeclared encounter ${e.effect.encounter}`)
      } else {
        assert.equal(keys[0], 'risk_of_collision', `${e.id}: unknown classification effect key ${keys[0]}`)
        assert.equal(e.effect.risk_of_collision, true,
          `${e.id}: risk_of_collision is asserted or the entry does not exist; there is no false`)
      }
    } else {
      assert.deepEqual(Object.keys(e.effect).sort(), ['applies_rules', 'part', 'section'], `${e.id}: scope effect shape`)
      for (const r of e.effect.applies_rules) {
        assert.ok(Object.values(rules.paragraphs).some((p) => p.rule === r),
          `${e.id}: scope effect names Rule ${r}, which rules.json does not have`)
      }
    }
  }
})

test('REQ-CAT-3: every rel:overrides resolves to an entry id, and the relation is acyclic', () => {
  const over = new Map(appl.entries.map((e) => [e.id, e['rel:overrides'] ?? []]))
  for (const [id, targets] of over) {
    for (const t of targets) {
      assert.ok(byId.has(t), `${id}: rel:overrides references unknown entry ${t}`)
      assert.notEqual(t, id, `${id}: overrides itself`)
      // Superiority between norms is only meaningful between norms.
      assert.equal(byId.get(t).category, byId.get(id).category,
        `${id} overrides ${t}, which is a ${byId.get(t).category} entry`)
    }
  }
  const seen = new Map()
  const walk = (id, stack) => {
    if (stack.includes(id)) assert.fail(`rel:overrides cycle: ${[...stack, id].join(' -> ')}`)
    if (seen.get(id)) return
    seen.set(id, true)
    for (const t of over.get(id) ?? []) walk(t, [...stack, id])
  }
  for (const id of over.keys()) walk(id, [])
})

// --- situation fixture replay (REQ-VERIFY-1 for two-subject data) -----------
// A situation fixture asserts the non-`display` entries the pair selects. It
// asserts applicability, not resolution: an entry a rel:overrides displaces is
// still expected, and the precedence properties below are what resolve it.
const applyingSituation = (s0) => {
  const s = withDerived(s0)
  return appl.entries.filter((e) => !isDisplay(e) && matchesSituation(e.when, s)).map((e) => e.id)
}
const bindingCases = situationFixtures.cases.filter((c) => c.status === 'binding')

test('situation fixtures: every situation selects exactly the expected entries', () => {
  assert.ok(bindingCases.length > 0, 'no binding situation fixture; the replay would assert nothing')
  for (const c of bindingCases) {
    const want = c.expect.map((x) => (typeof x === 'string' ? x : x.entry)).sort()
    assert.deepEqual(applyingSituation(c.situation).sort(), want, c.name)
  }
})

test('situation fixtures: an expected modality is the modality the entry carries', () => {
  for (const c of bindingCases) {
    for (const x of c.expect) {
      if (typeof x === 'string') continue
      assert.equal(byId.get(x.entry).modality, x.modality, `${c.name}: ${x.entry} modality`)
    }
  }
})

test('REQ-VERIFY-3: every two-subject entry is exercised by a fixture and excluded by another', () => {
  const selected = bindingCases.map((c) => new Set(applyingSituation(c.situation)))
  for (const e of twoSubject) {
    assert.ok(selected.some((s) => s.has(e.id)), `${e.id} is never selected by a situation fixture`)
    // Rule 4's predicate is empty on purpose -- Part B Section I is ungated --
    // so there is no fact record that excludes it and no fixture can show one.
    if (Object.keys(e.when).length === 0) continue
    assert.ok(selected.some((s) => !s.has(e.id)), `${e.id} is selected by every situation fixture`)
  }
})

// --- precedence sanity (ADR 0005 sec. 4: "never both stand-on") ------------
// A two-subject entry is evaluated from own's side only, so a conflict between
// the two vessels' roles is invisible in one direction: 13(a) applies to the
// overtaking vessel and 18(a)(iv) applies to the other one, in the *swapped*
// situation. So every property below is checked over the pooled roles of the
// situation and its swap, after rel:overrides has resolved what it can.
const swap = (s) => ({ own: s.other ?? {}, other: s.own ?? {}, pair: s.pair ?? {} })
const FORCEFUL = new Set(['shall', 'shall-if-practicable', 'shall-not-impede', 'shall-not'])

// Roles the applying entries assign, keyed by the subject of the *original*
// situation: 'A' is own as the fixture wrote it, 'B' is the other vessel.
function pooledRoles(situation0) {
  const situation = withDerived(situation0)
  const out = []
  for (const [s, mine, theirs] of [[situation, 'A', 'B'], [swap(situation), 'B', 'A']]) {
    for (const e of precedence) {
      if (!matchesSituation(e.when, s)) continue
      out.push({ entry: e, [mine]: e.effect.own, [theirs]: e.effect.other })
    }
  }
  return out
}

// An entry is resolved away when another entry in the same pool overrides it.
function resolve_(pool) {
  const ids = new Set(pool.map((r) => r.entry.id))
  const beaten = new Set(pool.flatMap((r) => (r.entry['rel:overrides'] ?? []).filter((t) => ids.has(t))))
  return pool.filter((r) => !beaten.has(r.entry.id))
}

// The three roles that say where a vessel puts her helm. `shall-not-impede` is
// deliberately not one of them: 18(d) really does lay it on a vessel that is
// simultaneously stand-on under 18(a), and the test below pins that rather than
// asserting it away.
const HELM_ROLES = new Set(['give-way', 'stand-on', 'keep-clear'])

function rolesFor(c, subject) {
  const pool = resolve_(pooledRoles(c.situation)).filter((r) => FORCEFUL.has(r.entry.modality))
  const roles = new Map()
  for (const r of pool) {
    if (!r[subject] || r[subject] === 'none') continue
    roles.set(r[subject], [...(roles.get(r[subject]) ?? []), r.entry.id])
  }
  return roles
}

test('precedence: no subject is given two conflicting helm roles once rel:overrides has resolved', () => {
  for (const c of bindingCases) {
    for (const subject of ['A', 'B']) {
      const helm = [...rolesFor(c, subject)].filter(([role]) => HELM_ROLES.has(role))
      assert.ok(helm.length <= 1,
        `${c.name}: ${subject} holds ${helm.map(([r]) => r).join(' and ')} at once ` +
        `(${helm.flatMap(([, ids]) => ids).join(', ')}) with no rel:overrides between them`)
    }
  }
})

test('precedence: 18(d) lays shall-not-impede on a vessel Rule 18 also makes stand-on', () => {
  // A finding, pinned rather than hidden. A vessel constrained by her draught
  // is a power-driven vessel, so 18(a)(iv) makes her give way to a sailing
  // vessel while 18(d)(i) makes that same sailing vessel avoid impeding her.
  // Both paragraphs are in force and neither overrides the other; 8(f)(ii) is
  // the Rules' own answer, and it is a `conduct` duty, not a role. The model
  // records the pair honestly and declines to pick.
  const c = bindingCases.find((x) => x.name === '18 matrix: own sailing, other constrained by her draught, in sight')
  assert.ok(c, 'the sail-vs-CBD matrix cell is the one this asserts against')
  assert.deepEqual([...rolesFor(c, 'A')].map(([r]) => r).sort(), ['shall-not-impede', 'stand-on'])
  assert.deepEqual([...rolesFor(c, 'B')].map(([r]) => r).sort(), ['give-way'])
  // ...and the same pair read from the other side is the same finding, not a
  // second one: the entries are symmetric under the swap.
  const d = bindingCases.find((x) => x.name === '18 matrix: own constrained by her draught, other sailing, in sight')
  assert.deepEqual([...rolesFor(d, 'B')].map(([r]) => r).sort(), ['shall-not-impede', 'stand-on'])
})

test('precedence: never both give-way, never both stand-on', () => {
  for (const c of bindingCases) {
    const pool = resolve_(pooledRoles(c.situation)).filter((r) => FORCEFUL.has(r.entry.modality))
    for (const role of ['give-way', 'stand-on']) {
      const a = pool.some((r) => r.A === role)
      const b = pool.some((r) => r.B === role)
      assert.ok(!(a && b), `${c.name}: both vessels are ${role}`)
    }
  }
})

test('precedence: Rule 18 is a partial order — NUC and RAM are unordered', () => {
  // The property the matrix exists to pin down: neither a vessel not under
  // command nor one restricted in her ability to manoeuvre takes an obligation
  // under Rule 18, against each other or against anyone.
  const HIGH = new Set(['activity:nuc', 'activity:ram', 'activity:ram_underwater'])
  for (const c of bindingCases) {
    const own = c.situation.own?.fact ?? {}
    if (!HIGH.has(own['fact:activity'])) continue
    const r18 = applyingSituation(c.situation).filter((id) => byId.get(id).cite.startsWith('18'))
    assert.deepEqual(r18, [], `${c.name}: Rule 18 obliges a ${own['fact:activity']} vessel via ${r18.join(', ')}`)
  }
})

test('scope: a situation selects exactly one Part B section, and it tracks in-sight', () => {
  for (const c of bindingCases) {
    const sections = appl.entries
      .filter((e) => e.category === 'scope' && matchesSituation(e.when, c.situation))
      .map((e) => e.effect.section)
    assert.ok(sections.includes('I'), `${c.name}: Section I is ungated and must always apply`)
    const inSight = c.situation.pair?.geo?.['geo:in_sight']
    assert.deepEqual(sections.sort(), inSight ? ['I', 'II'] : ['I', 'III'], `${c.name}: sections`)
    // And Section II's paragraphs must be absent when Section II is.
    if (!inSight) {
      const s2 = applyingSituation(c.situation).filter((id) => /^(1[1-8])/.test(byId.get(id).cite))
      assert.deepEqual(s2, [], `${c.name}: not in sight, but ${s2.join(', ')} applies`)
    }
  }
})

// --- the encounter partition (epic P2.2, at the data level) ----------------
// Head-on, crossing and overtaking must partition relative bearing: no bearing
// in two sectors, none in neither. The Alloy version of this property lives in
// colregs-engine; this is the same property asserted directly over the data, so
// that an edit to one sector's constraint that forgets the other's fails here
// first. The sweep is two-dimensional because the encounter type is a function
// of both subjects' bearings -- own's, and the aspect -- and reading one alone
// is the mistake 13b-overtaken exists to prevent.
const classification = appl.entries.filter((e) => e.category === 'classification')
const encounterEntries = classification.filter((e) => 'encounter' in e.effect)
const CONSTANTS = facts.situation.constants
const FROM = CONSTANTS.overtaking_sector_from_deg.value
const TO = CONSTANTS.overtaking_sector_to_deg.value
const HALF = CONSTANTS.head_on_half_angle_deg.value

// A pair the three encounter rules all reach: in sight, risk of collision,
// two ordinary power-driven vessels underway, closing, nothing latched. Own
// heads north from a fixed origin; `aim` places the other and points her so
// that the record is geometrically consistent at every point of a sweep (Q-48)
// -- the partition is a property of bearings alone, so no speeds are stated
// here and the motion equations have nothing to check; the steady-bearing
// sweep further down states everything.
const SWEEP_RANGE_M = 2000
const SWEEP_ORIGIN = { latitude: 50.0, longitude: -1.4 }
function sweepTemplate(latchOwn = false, latchOther = false) {
  const v = (latched) => ({
    fact: {
      'fact:propulsion': 'propulsion:power', 'fact:activity': 'activity:none',
      'fact:position': 'position:underway', 'fact:making_way': true, 'fact:length_m': 30,
    },
    kin: { 'kin:position': SWEEP_ORIGIN, 'kin:heading_deg': 0 },
    geo: { 'geo:rel_bearing_deg': 0 },
    hist: { 'hist:was_overtaking': latched, 'hist:latched_at_s': latched ? 300 : null },
  })
  // Derived once: the fact records do not change across a sweep, and deriving
  // them half a million times is the difference between a suite that runs in a
  // second and one nobody waits for.
  return withDerived({
    own: v(latchOwn),
    other: v(latchOther),
    pair: {
      geo: {
        'geo:in_sight': true, 'geo:risk_of_collision': true, 'geo:range_m': SWEEP_RANGE_M,
        'geo:bearing_change_deg_min': 0.2, 'geo:cpa_m': 100, 'geo:tcpa_s': 400,
      },
    },
  })
}
// The sweep mutates one template in place rather than rebuilding the situation
// each step; `geo` and `kin` are carried by reference through `withDerived`,
// so this is the same object the predicates read. With own's heading as the
// datum the other's heading is own's bearing plus 180 less the aspect, and her
// position is that bearing and the range from the origin.
function aim(s, ownRel, aspect, range_m = SWEEP_RANGE_M) {
  s.own.geo['geo:rel_bearing_deg'] = ownRel
  s.other.geo['geo:rel_bearing_deg'] = aspect
  s.other.kin['kin:heading_deg'] = norm360(ownRel + 180 - aspect)
  s.other.kin['kin:position'] = destination(SWEEP_ORIGIN, ownRel, range_m)
  return s
}
const sweepSituation = ({ ownRel, aspect, latchOwn = false, latchOther = false }) =>
  aim(sweepTemplate(latchOwn, latchOther), ownRel, aspect)
const encountersFor = (s) =>
  new Set(encounterEntries.filter((e) => matchesSituation(e.when, s)).map((e) => e.effect.encounter))

test('classification: head-on, crossing and overtaking partition relative bearing', () => {
  // The declared sector edges are 22.5 degrees abaft each beam, which is what
  // 13(b) says and what Rule 21(c)'s sternlight arc is cut to. Asserted against
  // the arithmetic rather than against the literal, so that a typo in either
  // constant is caught before the sweep interprets it.
  assert.equal(FROM, 90 + 22.5)
  assert.equal(TO, 270 - 22.5)
  assert.equal(CONSTANTS.overtaking_sector_from_deg.status, 'ink')
  assert.equal(CONSTANTS.head_on_half_angle_deg.status, 'pencil')
  // 13(b) says the sector in two ways -- an angle abaft the beam, and 'at night
  // she would be able to see only the sternlight of that vessel'. The two must
  // be the same arc, and they are already both in the data.
  const stern = lights.lights['light:sternlight'].arc
  assert.equal(stern.from_deg, FROM)
  assert.equal(stern.to_deg, TO)

  const inSector = (b) => b > FROM && b < TO
  const inCone = (b) => b <= HALF || b >= 360 - HALF
  let checked = 0
  const bad = []
  const s = sweepTemplate()
  for (let ownRel = 0; ownRel < 360; ownRel += 0.5) {
    for (let aspect = 0; aspect < 360; aspect += 0.5) {
      const got = encountersFor(aim(s, ownRel, aspect))
      checked++
      if (got.size !== 1) { bad.push(`${ownRel}/${aspect}: ${[...got].join(',') || 'nothing'}`); continue }
      // ...and it is the right one, computed from the constants rather than
      // read back off the data.
      const want = inSector(ownRel) || inSector(aspect) ? 'overtaking'
        : inCone(ownRel) && inCone(aspect) ? 'head-on' : 'crossing'
      if (!got.has(want)) bad.push(`${ownRel}/${aspect}: ${[...got]} not ${want}`)
    }
  }
  assert.deepEqual(bad.slice(0, 8), [], `${bad.length} of ${checked} bearings are in two sectors or none`)
  assert.equal(checked, 720 * 720)
})

test('classification: the 112.5 and 22.5-abaft edges land exactly where 13(b) puts them', () => {
  // 'More than 22.5 degrees abaft her beam' is strict, so the edge itself is
  // not an overtaking. One tenth of a degree is enough to move it, and the
  // fixtures either side of each edge are the data-level record of the same
  // fact.
  const at = (ownRel, aspect) => [...encountersFor(sweepSituation({ ownRel, aspect }))]
  assert.deepEqual(at(300, FROM), ['crossing'], 'exactly 22.5 abaft the beam is not yet overtaking')
  assert.deepEqual(at(350, FROM + 0.1), ['overtaking'])
  assert.deepEqual(at(10, TO), ['crossing'], 'the mirror edge, and equally exclusive')
  assert.deepEqual(at(10, TO - 0.1), ['overtaking'])
  // The same edge read on own's bearing, which is the overtaken vessel's side.
  assert.deepEqual(at(FROM, 5), ['crossing'])
  assert.deepEqual(at(FROM + 0.1, 5), ['overtaking'])
  // The head-on cone is closed at its edge and one twentieth of a degree wide
  // of it is a crossing -- and it takes both subjects, which is 14(b).
  assert.deepEqual(at(HALF, 360 - HALF), ['head-on'])
  assert.deepEqual(at(HALF + 0.05, 360 - HALF), ['crossing'])
  assert.deepEqual(at(HALF, 360 - HALF - 0.05), ['crossing'])
  assert.deepEqual(at(0, 0), ['head-on'], 'dead ahead of each other')
  assert.deepEqual(at(180, 180), ['overtaking'], 'dead astern is the middle of the sector')
})

test('classification: 13(d) holds the encounter at overtaking however the bearing drifts', () => {
  // The latch, swept: with `hist:was_overtaking` set on either subject, every
  // bearing in the circle classifies as an overtaking and as nothing else.
  // Without it the same bearings would produce a crossing or a head-on, which
  // is the reclassification 13(d) forbids in so many words.
  for (const [latchOwn, latchOther] of [[true, false], [false, true], [true, true]]) {
    const bad = []
    const s = sweepTemplate(latchOwn, latchOther)
    for (let ownRel = 0; ownRel < 360; ownRel += 0.5) {
      for (let aspect = 0; aspect < 360; aspect += 0.5) {
        const got = encountersFor(aim(s, ownRel, aspect))
        if (got.size !== 1 || !got.has('overtaking')) bad.push(`${ownRel}/${aspect}: ${[...got]}`)
      }
    }
    assert.deepEqual(bad.slice(0, 8), [], `${bad.length} bearings escape the 13(d) latch`)
  }
  // The case the latch was written for, and the one the fixture illustrates:
  // a bearing that has drawn out of the sector entirely.
  const drifted = sweepSituation({ ownRel: 90, aspect: 250, latchOwn: true })
  assert.deepEqual([...encountersFor(drifted)], ['overtaking'])
  assert.equal(matchesSituation(byId.get('13b-overtaking').when, drifted), false,
    'the sector test no longer holds, which is exactly when 13(d) is load-bearing')
  assert.equal(matchesSituation(byId.get('13a').when, drifted), true,
    'and the duty stays with the overtaking vessel')
  // Absent history is not false history: a situation that omits the latch is
  // classified as no encounter at all rather than as a crossing. Conservative,
  // and silent, which is Q-43.
  const noHistory = { ...drifted, own: { ...drifted.own, hist: {} }, other: { ...drifted.other, hist: {} } }
  assert.deepEqual([...encountersFor(noHistory)], [])
})

test('classification: 15(a) gives way exactly where the crossing has the other to starboard', () => {
  // 15a-give-way writes own's bearing as the starboard half of the
  // non-overtaking sector, which is a shorthand for two constraints the
  // predicate language cannot put on one key. The sweep is what makes the
  // shorthand checkable: the entry must select exactly the crossings in which
  // the other bears between 0 and 180 relative, and nothing else.
  const crossing = byId.get('15a-crossing')
  const giveWay = byId.get('15a-give-way')
  const bad = []
  const t = sweepTemplate()
  for (let ownRel = 0; ownRel < 360; ownRel += 0.5) {
    for (let aspect = 0; aspect < 360; aspect += 0.5) {
      const s = aim(t, ownRel, aspect)
      const want = matchesSituation(crossing.when, s) && ownRel > 0 && ownRel < 180
      if (matchesSituation(giveWay.when, s) !== want) bad.push(`${ownRel}/${aspect}`)
    }
  }
  assert.deepEqual(bad.slice(0, 8), [], `${bad.length} bearings where give-way and crossing disagree`)
})

test('the declared constants are the numbers the entries actually read', () => {
  // A constant declared in facts.json and a literal written into a predicate
  // are two places for one number, which is one too many. Every entry that
  // thresholds one of the three is reconstructed here from the declaration and
  // compared, so the two cannot drift.
  const sector = { gt: FROM, lt: TO }
  const cone = { any_of: [{ lte: HALF }, { gte: 360 - HALF }] }
  const appreciable = CONSTANTS.appreciable_bearing_change_deg_min.value
  assert.deepEqual(byId.get('7d1').when['pair:geo:bearing_change_deg_min'],
    { gt: -appreciable, lt: appreciable })
  assert.deepEqual(byId.get('13b-overtaking').when['other:geo:rel_bearing_deg'], sector)
  assert.deepEqual(byId.get('13b-overtaken').when['own:geo:rel_bearing_deg'], sector)
  assert.deepEqual(byId.get('14b').when['own:geo:rel_bearing_deg'], cone)
  assert.deepEqual(byId.get('14b').when['other:geo:rel_bearing_deg'], cone)
  // The residual is `not` over the very same objects, which is the whole
  // reason the partition above cannot be broken by editing one side only.
  const c = byId.get('15a-crossing').when
  assert.deepEqual(c['own:geo:rel_bearing_deg'], { not: sector })
  assert.deepEqual(c['other:geo:rel_bearing_deg'], { not: sector })
  assert.deepEqual(c.any_of, [
    { 'own:geo:rel_bearing_deg': { not: cone } },
    { 'other:geo:rel_bearing_deg': { not: cone } },
  ])
  assert.deepEqual(byId.get('15a-give-way').when['own:geo:rel_bearing_deg'], { gt: 0, lte: FROM })
  // Every constant says who may change it and, where it is pencil, what would.
  for (const [k, spec] of Object.entries(CONSTANTS)) {
    if (k === 'note') continue
    assert.ok(['ink', 'pencil'].includes(spec.status), `${k}: bad status`)
    assert.ok(typeof spec.value === 'number', `${k}: no value`)
    assert.ok('cite' in spec, `${k}: no cite`)
    if (spec.cite === null) assert.ok(spec.cite_pending, `${k}: null cite with no cite_pending`)
    else assert.ok(rules.paragraphs[spec.cite], `${k}: cites missing paragraph ${spec.cite}`)
    if (spec.status === 'pencil') assert.ok(spec.settled_by, `${k}: pencil with no settled_by`)
  }
})

// --- geometric consistency, enforced (Q-48, REQ-VERIFY-8) -------------------
test('REQ-VERIFY-8: the consistency check rejects each kind of impossible record, and only those', () => {
  // The first fixture, then one thing wrong at a time. Each equation must be
  // the one that fires, so a future edit cannot quietly disable a tier.
  const base = structuredClone(situationFixtures.cases[0].situation)
  assert.deepEqual(inconsistencies(base), [])
  const edit = (f) => { const s = structuredClone(base); f(s); return inconsistencies(s) }
  const only = (found, tier) => found.length > 0 && found.every((m) => m.startsWith(tier))
  assert.ok(only(edit((s) => { s.other.kin['kin:heading_deg'] += 5 }), 'headings') === false,
    'a heading moved 5 degrees breaks the line-of-sight equation and the position bearing both')
  assert.ok(edit((s) => { s.other.kin['kin:heading_deg'] += 5 }).some((m) => m.startsWith('headings:')))
  assert.ok(edit((s) => { s.other.kin['kin:heading_deg'] += 5 }).some((m) => m.startsWith('positions: other')))
  // A range moved 10% disagrees with the positions -- and with the motion,
  // whose CPA and TCPA scale with it.
  assert.ok(edit((s) => { s.pair.geo['geo:range_m'] *= 1.1 }).some((m) => m.startsWith('positions: range')))
  assert.ok(only(edit((s) => { s.own.kin['kin:sog_kn'] *= 1.5 }), 'motion:'))
  assert.ok(only(edit((s) => { s.pair.geo['geo:tcpa_s'] = -s.pair.geo['geo:tcpa_s'] }), 'motion: tcpa_s'))
  // Positions fix the range and own's bearing, so leaving those two out of
  // the record does not switch the motion tier off: a wrong TCPA still fires.
  assert.deepEqual(edit((s) => { delete s.pair.geo['geo:range_m']; delete s.own.geo['geo:rel_bearing_deg'] }), [])
  assert.ok(only(edit((s) => {
    delete s.pair.geo['geo:range_m']; delete s.own.geo['geo:rel_bearing_deg']
    s.pair.geo['geo:tcpa_s'] = -s.pair.geo['geo:tcpa_s']
  }), 'motion: tcpa_s'), 'motion is checked from positions when range and bearing are not stated')
  // Sparse is unchecked, not wrong: drop the kinematics and nothing can fire.
  assert.deepEqual(edit((s) => { delete s.own.kin; delete s.other.kin }), [])
  assert.deepEqual(edit((s) => { delete s.own.kin['kin:position']; delete s.other.kin['kin:position'] }), [])
  // The tolerances are read from the declaration, not from this file.
  for (const k of ['bearing_deg', 'range_m', 'range_fraction', 'cpa_m', 'cpa_fraction', 'tcpa_s', 'tcpa_fraction', 'bearing_change_deg_min']) {
    assert.ok(isNum(TOL[k]) && TOL[k] > 0, `tolerance ${k} is not declared`)
  }
  assert.equal(CONSISTENCY.status, 'pencil')
  assert.ok(CONSISTENCY.settled_by, 'pencil with no settled_by')
})

test('REQ-VERIFY-8: every situation fixture that states its kinematics is consistent with them', () => {
  // Every fixture goes through the check: a sparse record returns nothing,
  // so skipping is never needed and would hide a case the check should see.
  let checked = 0
  for (const c of situationFixtures.cases) {
    assert.deepEqual(inconsistencies(c.situation), [], c.name)
    if (isNum(c.situation.own?.kin?.['kin:heading_deg'])) checked++
  }
  assert.ok(checked >= 16, `only ${checked} fixtures carry kinematics; the check would be near-vacuous`)
})

test('REQ-VERIFY-8: the partition sweep is geometrically consistent at every point it visits', () => {
  // Coarser than the partition sweep itself -- the great-circle arithmetic is
  // what costs -- but on the same template and through the same `aim`, so a
  // template edit that breaks the construction fails here.
  const s = sweepTemplate()
  const bad = []
  for (let ownRel = 0; ownRel < 360; ownRel += 2.5) {
    for (let aspect = 0; aspect < 360; aspect += 2.5) {
      const found = inconsistencies(aim(s, ownRel, aspect))
      if (found.length) bad.push(`${ownRel}/${aspect}: ${found.join('; ')}`)
    }
  }
  assert.deepEqual(bad.slice(0, 8), [], `${bad.length} sweep points are inconsistent`)
  // ...and the edges the edge test reads, exactly.
  for (const [ownRel, aspect] of [[300, FROM], [350, FROM + 0.1], [10, TO], [HALF, 360 - HALF], [0, 0], [180, 180]]) {
    assert.deepEqual(inconsistencies(aim(s, ownRel, aspect)), [], `${ownRel}/${aspect}`)
  }
})

// --- the steady-bearing sweep (Q-48) ----------------------------------------
// The "never both give-way" property is not true of arbitrary bearings: two
// vessels each with the other on her starboard side satisfy 15(a) from both
// sides. It is true of collision courses, because on a steady bearing the
// components of the two velocities across the line of sight are equal --
// u sin(own bearing) = -v sin(aspect) -- so the two bearings lie on opposite
// sides. This sweep constructs those geometries: for own's bearing of the other
// and a pair of speeds, the other's heading is solved for a relative velocity
// pointing straight down the line of sight, and there are up to two solutions
// -- the intercept from ahead and the one from astern.
function steadyBearingHeadings({ ownRel, ownSog, otherSog }) {
  const u = ownSog, v = otherSog, th = rad(ownRel)
  const disc = v * v - (u * Math.sin(th)) ** 2
  if (disc < 0) return []
  const roots = [u * Math.cos(th) + Math.sqrt(disc), u * Math.cos(th) - Math.sqrt(disc)]
  return roots.filter((k, i) => k > 1e-9 && (i === 0 || Math.abs(k - roots[0]) > 1e-9))
    .map((k) => norm360(deg(Math.atan2(-k * Math.sin(th), u - k * Math.cos(th)))))
}

// A fully stated situation -- positions, headings, speeds, and the pair motion
// the kinematics produce -- so the motion equations have something to check.
// Own heads north at the origin; everything else follows from the arguments.
function statedSituation({ ownRel, otherHeading, ownSog, otherSog, range_m = SWEEP_RANGE_M, risk = true, own = {}, other = {} }) {
  const s = sweepTemplate()
  aim(s, ownRel, norm360(ownRel + 180 - otherHeading), range_m)
  Object.assign(s.own.kin, { 'kin:sog_kn': ownSog, 'kin:rot_deg_min': 0, 'kin:dynamics': 'dynamics:cargo' }, own.kin)
  Object.assign(s.other.kin, { 'kin:sog_kn': otherSog, 'kin:rot_deg_min': 0, 'kin:dynamics': 'dynamics:cargo' }, other.kin)
  // A fleet may change the vessels themselves; the derived facts follow.
  s.own.fact = derive({ ...s.own.fact, ...own.fact }); s.other.fact = derive({ ...s.other.fact, ...other.fact })
  Object.assign(s.own.geo, own.geo ?? {}); Object.assign(s.other.geo, other.geo ?? {})
  const m = relativeMotion({ range_m, ownRel, ownHeading: 0, otherHeading, ownSog, otherSog })
  s.pair.geo = {
    'geo:in_sight': true, 'geo:risk_of_collision': risk, 'geo:range_m': range_m,
    'geo:bearing_change_deg_min': m.bearing_change_deg_min, 'geo:cpa_m': m.cpa_m, 'geo:tcpa_s': m.tcpa_s,
  }
  return s
}

const forcefulPool = (s) => resolve_(pooledRoles(s)).filter((r) => FORCEFUL.has(r.entry.modality))
const bothHold = (pool, role) => pool.some((r) => r.A === role) && pool.some((r) => r.B === role)

// The fleets the steady-bearing sweep is run over. Two ordinary power-driven
// vessels are Rule 15's case and Q-48's. Two sailing vessels are Rule 12's, in
// every combination of tack and windward side, and with one of them ranked by
// Rule 18 as well -- fishing under sail, not under command under sail -- so
// that 12(a), 13(a) and 18(b)/(c) are all in force at once somewhere in the
// sweep and rel:overrides has to earn its keep (Q-40).
const SAIL = { 'fact:propulsion': 'propulsion:sail', 'fact:activity': 'activity:none' }
const WINDS = ['wind_side:port', 'wind_side:starboard', 'wind_side:unknown']
function* fleets() {
  yield { name: 'two power-driven vessels', step: 0.5, speeds: [3, 6, 12, 20], own: {}, other: {} }
  const sail = (fact, wind, windward) => ({
    fact: { ...SAIL, ...fact }, kin: { 'kin:wind_side': wind, 'kin:dynamics': 'dynamics:yacht' }, geo: { 'geo:windward': windward },
  })
  for (const w1 of WINDS) {
    for (const w2 of WINDS) {
      for (const windward of [true, false]) {
        const tag = `${w1.split(':')[1]}/${w2.split(':')[1]}, own ${windward ? 'windward' : 'leeward'}`
        yield { name: `two sailing vessels, ${tag}`, step: 1, speeds: [3, 6], own: sail({}, w1, windward), other: sail({}, w2, !windward) }
        yield { name: `sailing vessel and fishing under sail, ${tag}`, step: 2, speeds: [3, 6], own: sail({}, w1, windward), other: sail({ 'fact:activity': 'activity:fishing' }, w2, !windward) }
        yield { name: `fishing under sail and NUC under sail, ${tag}`, step: 2, speeds: [3, 6], own: sail({ 'fact:activity': 'activity:fishing' }, w1, windward), other: sail({ 'fact:activity': 'activity:nuc' }, w2, !windward) }
      }
    }
  }
}

test('precedence: never both give-way, never both stand-on, no two helm roles, on every steady bearing (Q-48, Q-40)', () => {
  let checked = 0, gaveWayA = 0, gaveWayB = 0
  const bad = []
  for (const fleet of fleets()) {
    for (const ownSog of fleet.speeds) {
      for (const otherSog of fleet.speeds) {
        for (let ownRel = 0; ownRel < 360; ownRel += fleet.step) {
          for (const otherHeading of steadyBearingHeadings({ ownRel, ownSog, otherSog })) {
            const where = `${fleet.name}: ${ownRel} @ ${ownSog}/${otherSog} (other heading ${otherHeading.toFixed(1)})`
            const s = statedSituation({ ownRel, otherHeading, ownSog, otherSog, own: fleet.own, other: fleet.other })
            const found = inconsistencies(s)
            if (found.length) { bad.push(`${where}: ${found.join('; ')}`); continue }
            // The construction really is a collision course, not merely a
            // consistent record of some motion.
            const pg = s.pair.geo
            if (!(pg['geo:cpa_m'] < 1 && pg['geo:tcpa_s'] > 0 && Math.abs(pg['geo:bearing_change_deg_min']) < 1e-6)) {
              bad.push(`${where}: not a steady bearing (cpa ${pg['geo:cpa_m'].toFixed(1)})`); continue
            }
            // The theorem itself, which is why the property below can hold.
            const aspect = s.other.geo['geo:rel_bearing_deg']
            const side = (b) => (b > 0 && b < 180 ? 'starboard' : b > 180 ? 'port' : 'ahead-or-astern')
            if (side(ownRel) !== 'ahead-or-astern' && side(ownRel) === side(aspect)) {
              bad.push(`${where}: both bearings to ${side(ownRel)} on a steady bearing`); continue
            }
            const pool = forcefulPool(s)
            for (const role of ['give-way', 'stand-on']) {
              if (bothHold(pool, role)) bad.push(`${where}: both ${role}`)
            }
            // ...and no vessel is told two things about her helm once
            // rel:overrides has resolved -- the fixture-level check, swept.
            for (const subject of ['A', 'B']) {
              const helm = new Set(pool.map((r) => r[subject]).filter((x) => HELM_ROLES.has(x)))
              if (helm.size > 1) bad.push(`${where}: ${subject} holds ${[...helm].join(' and ')} (${pool.filter((r) => HELM_ROLES.has(r[subject])).map((r) => r.entry.id).join(', ')})`)
            }
            gaveWayA += pool.some((r) => r.A === 'give-way'); gaveWayB += pool.some((r) => r.B === 'give-way')
            checked++
          }
        }
      }
    }
  }
  assert.deepEqual(bad.slice(0, 8), [], `${bad.length} of ${checked} steady bearings break a property`)
  // Sixteen speed pairs by 720 bearings for the power pair, less the bearings
  // a slower vessel cannot intercept from, plus the sailing fleets: tens of
  // thousands, and never fewer than this.
  assert.ok(checked > 20000, `only ${checked} steady bearings swept`)
  // Not vacuous: each vessel is the give-way vessel somewhere in the sweep.
  assert.ok(gaveWayA > 0 && gaveWayB > 0, `give-way fell on A ${gaveWayA} times and on B ${gaveWayB}`)
})

test('Q-48: the both-starboard crossing that breaks the property is a record the check rejects', () => {
  // The failure Q-48 describes, stated as a consumer might state it: each has
  // the other 45 degrees on the starboard bow, a steady bearing is claimed,
  // risk of collision is claimed. 15(a) then names both vessels.
  const s = statedSituation({ ownRel: 45, otherHeading: norm360(45 + 180 - 45), ownSog: 12, otherSog: 10 })
  Object.assign(s.pair.geo, { 'geo:bearing_change_deg_min': 0, 'geo:cpa_m': 0, 'geo:tcpa_s': 400 })
  assert.ok(bothHold(forcefulPool(s), 'give-way'), 'the counterexample no longer reproduces; is 15a-give-way still two-sided?')
  // ...and no positive speeds produce that steady bearing, so the record is
  // one the motion equations refuse, whatever speeds it claims.
  const found = inconsistencies(s)
  assert.ok(found.some((m) => m.startsWith('motion:')), `expected the motion tier to fire, got ${JSON.stringify(found)}`)
  for (const ownSog of [1, 3, 6, 12, 20, 40]) {
    for (const otherSog of [1, 3, 6, 12, 20, 40]) {
      for (const h of steadyBearingHeadings({ ownRel: 45, ownSog, otherSog })) {
        const aspect = norm360(45 + 180 - h)
        assert.ok(aspect > 180, `a steady bearing at ${ownSog}/${otherSog} puts own at ${aspect.toFixed(1)} from the other -- starboard`)
      }
    }
  }
})

test('Q-48 residual: 7(d)(i)\'s tolerance admits a slow starboard-to-starboard passing on which both give way', () => {
  // The theorem is exact at a bearing rate of zero. Rule 7(d)(i)'s pencilled
  // 1 deg/min is not zero, and two slow vessels 2000 m apart, each with the
  // other fine on the starboard bow just outside the head-on cone, pass at
  // several hundred metres with the bearing changing more slowly than that.
  // The record is consistent, 7(d)(i) deems risk, 15(a) names both. That is
  // 14(c)'s doubt case -- "shall assume that it does exist and act
  // accordingly" -- and is Q-41's to settle, not this check's. Pinned so the
  // day it changes is noticed.
  const s = statedSituation({ ownRel: 15, otherHeading: norm360(15 + 180 - 5), ownSog: 3, otherSog: 3 })
  assert.deepEqual(inconsistencies(s), [])
  assert.equal(s.other.geo['geo:rel_bearing_deg'], 5)
  const appreciable = CONSTANTS.appreciable_bearing_change_deg_min.value
  assert.ok(Math.abs(s.pair.geo['geo:bearing_change_deg_min']) < appreciable, 'the bearing rate is inside 7(d)(i)')
  assert.ok(s.pair.geo['geo:cpa_m'] > 100, 'and yet they pass clear')
  assert.ok(matchesSituation(byId.get('7d1').when, s), '7(d)(i) deems risk')
  assert.deepEqual([...encountersFor(s)], ['crossing'])
  assert.ok(bothHold(forcefulPool(s), 'give-way'), 'both vessels are give-way -- the residual this test pins')
})

// --- who governs over Rule 12 (Q-40) ----------------------------------------
test('Q-40: Rule 12 reads 3(c)\'s sailing vessel, and every norm that governs over it says so', () => {
  const rule12 = precedence.filter((e) => e.cite.startsWith('12('))
  assert.deepEqual(rule12.map((e) => e.id).sort(), ['12a1', '12a2', '12a3'])
  for (const e of rule12) {
    // 'Two sailing vessels' is 3(c), which is the propulsion axis -- not the
    // Rule 18 rank, which would drop a fishing vessel under sail out of Rule 12.
    assert.equal(e.when['own:fact:propulsion'], 'propulsion:sail', `${e.id}: own is not gated on 3(c)`)
    assert.equal(e.when['other:fact:propulsion'], 'propulsion:sail', `${e.id}: other is not gated on 3(c)`)
    for (const k of factKeys(e.when)) assert.ok(!k.endsWith('fact:rule18_class'), `${e.id} reads ${k}`)
  }
  // Rule 18's chapeau excepts Rules 9, 10 and 13 and no others, so every Rule
  // 18 norm that can be in force between two sailing vessels displaces Rule
  // 12: 18(b), whose subject is a sailing vessel, and 18(c), which does not
  // distinguish propulsion. 13(a) is 'notwithstanding' the whole of Sections I
  // and II. Both are on file, so the reason is asserted along with the data.
  assert.match(rules.paragraphs['18'].text, /Rules 9, 10,? and 13/)
  assert.match(rules.paragraphs['13(a)'].text, /^Notwithstanding/)
  for (const id of ['18b1', '18b2', '18b3', '18c1', '18c2', '13a']) {
    for (const t of ['12a1', '12a2', '12a3']) {
      assert.ok((byId.get(id)['rel:overrides'] ?? []).includes(t), `${id} does not override ${t}`)
    }
  }
  // The two fixtures written for it resolve the way the overrides say.
  const under18 = bindingCases.find((c) => c.name.startsWith('12 under 18(b)(iii)'))
  assert.ok(under18)
  assert.deepEqual([...rolesFor(under18, 'A')].map(([r]) => r), ['stand-on'], 'fishing under sail: stand-on, 12(a)(i) displaced')
  assert.deepEqual([...rolesFor(under18, 'B')].map(([r]) => r), ['give-way'])
  const over12 = bindingCases.find((c) => c.name.startsWith('13 over 12'))
  assert.ok(over12)
  assert.deepEqual([...rolesFor(over12, 'A')].map(([r]) => r), ['give-way'], 'the overtaking vessel gives way, 12(a)(ii) displaced')
  assert.deepEqual([...rolesFor(over12, 'B')].map(([r]) => r), ['stand-on'])
})
