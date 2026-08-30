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
    // 'activity:ram_underwater' is a refinement of 'activity:ram': predicates
    // written for ram read it too.
    if (k === 'fact:activity' && want === 'activity:ram' && have === 'activity:ram_underwater') return true
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
  for (const e of appl.entries) {
    const head = e.cite.split('-')[0].trim()
    assert.ok(rules.paragraphs[head], `${e.id} cites missing paragraph ${head}`)
  }
})

test('every cross-reference resolves to an entry id', () => {
  const refsOf = (e) => [
    ...(e['rel:includes'] ?? []), ...(e['rel:in_lieu_of'] ?? []),
    ...(e['rel:excludes'] ?? []), ...(e['rel:exempts'] ?? []),
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
    ...Object.keys(facts.enums),
  ])
  for (const e of appl.entries) {
    for (const k of Object.keys(e.when)) assert.ok(declared.has(k), `${e.id}: undeclared fact ${k}`)
    for (const m of e.modality_by ?? []) {
      for (const k of Object.keys(m.when)) assert.ok(declared.has(k), `${e.id}: undeclared fact ${k}`)
    }
  }
})

test('every enumerated fact value a predicate names is declared in facts.json', () => {
  // The value namespace of an enumerated fact is the fact's own bare name
  // (`fact:activity` takes `activity:*`), so a missed prefix on either side
  // shows up here rather than as an entry that silently never matches.
  const valuesOf = new Map(
    [...Object.entries(facts.axes), ...Object.entries(facts.enums)]
      .map(([k, v]) => [k, new Set(v.values)])
  )
  const check = (where, w) => {
    for (const [k, want] of Object.entries(w)) {
      const allowed = valuesOf.get(k)
      if (!allowed) continue
      for (const v of Array.isArray(want) ? want : [want]) {
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
