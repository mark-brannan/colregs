import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'

const load = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)))
const rules = load('data/rules.json')
const lights = load('data/lights.json')
const facts = load('data/facts.json')
const appl = load('data/applicability.json')
const images = load('data/images.json')
const geometry = load('data/geometry.json')
const fixtures = load('fixtures/applicability-fixtures.json')

const byId = new Map(appl.entries.map((e) => [e.id, e]))

// --- reference evaluator -------------------------------------------------
// An entry applies when every constraint in its `when` is satisfied by the
// fact record. A fact that is absent never satisfies a constraint.
function matches(when, f) {
  return Object.entries(when).every(([k, want]) => {
    let have = f[k]
    if (have === undefined) return false
    // 'ram_underwater' is a refinement of 'ram': predicates for ram read it too.
    if (k === 'activity' && want === 'ram' && have === 'ram_underwater') return true
    if (Array.isArray(want)) return want.includes(have)
    if (want !== null && typeof want === 'object') {
      if ('gte' in want && !(have >= want.gte)) return false
      if ('gt' in want && !(have > want.gt)) return false
      if ('lte' in want && !(have <= want.lte)) return false
      if ('lt' in want && !(have < want.lt)) return false
      return true
    }
    return have === want
  })
}
const applying = (f) => appl.entries.filter((e) => matches(e.when, f)).map((e) => e.id)

test('fixtures: every fact record selects exactly the expected entries', () => {
  for (const c of fixtures.cases) {
    assert.deepEqual(applying(c.facts).sort(), [...c.expect].sort(), c.name)
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
  for (const r of e.includes ?? []) relate(e.id, r)
  for (const r of e.in_lieu_of ?? []) relate(e.id, r)
  for (const r of e.excludes ?? []) relate(e.id, r)
  for (const r of e.exempts ?? []) relate(e.id, r)
  for (const c of e.conditional_includes ?? []) {
    for (const r of c.includes ?? []) relate(e.id, r)
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
  for (const e of appl.entries) {
    const head = e.cite.split('-')[0].trim()
    assert.ok(rules.paragraphs[head], `${e.id} cites missing paragraph ${head}`)
  }
})

test('every cross-reference resolves to an entry id', () => {
  const refsOf = (e) => [
    ...(e.includes ?? []), ...(e.in_lieu_of ?? []),
    ...(e.excludes ?? []), ...(e.exempts ?? []),
    ...(e.conditional_includes ?? []).flatMap((c) => [...(c.includes ?? []), ...(c.one_of ?? [])]),
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
    for (const axis of ['propulsion', 'activity', 'position']) {
      if (d[axis] === undefined) continue
      assert.ok(axes[axis].values.includes(d[axis]), `${state}: bad ${axis} ${d[axis]}`)
    }
    if (d.also_activity !== undefined) {
      assert.ok(axes.activity.values.includes(d.also_activity), `${state}: bad also_activity`)
    }
  }
})

test('every fact a predicate reads is declared in facts.json', () => {
  const declared = new Set([
    ...Object.keys(facts.axes), ...Object.keys(facts.modifiers),
    ...Object.keys(facts.numerics), ...Object.keys(facts.booleans),
    ...Object.keys(facts.enums),
  ])
  for (const e of appl.entries) {
    for (const k of Object.keys(e.when)) assert.ok(declared.has(k), `${e.id}: undeclared fact ${k}`)
    for (const m of e.modality_by ?? []) {
      for (const k of Object.keys(m.when)) assert.ok(declared.has(k), `${e.id}: undeclared fact ${k}`)
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

test('REQ-MODEL-10: the immutability baseline is stated exactly once, and is 0.1.1', () => {
  const found = [...requirementsText.matchAll(BASELINE_RE)].map((m) => m[1])
  assert.equal(found.length, 1,
    `REQ-MODEL-10 declares ${found.length} immutability baselines (${found.join(', ')}); ` +
    'it is settable exactly once. A second baseline is the escape hatch the requirement forbids.')
  assert.equal(found[0], '0.1.1',
    'the immutability baseline has moved. REQ-MODEL-10: it MUST NOT be moved, raised or re-stated.')
})
