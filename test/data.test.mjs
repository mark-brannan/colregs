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
}
function matches(when, f) {
  return Object.entries(when).every(([k, want]) => satisfies(k, want, f[k]))
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
    ...Object.keys(facts.enums),
  ])
  // Two-subject entries address a fact through the subject namespace and are
  // checked against the situation's own class declarations further down.
  for (const e of appl.entries.filter((x) => (x.subjects ?? 1) === 1)) {
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
    for (const [k0, want] of Object.entries(w)) {
      // `own:fact:activity` and `fact:activity` name the same value namespace;
      // without the strip a two-subject predicate's values go unchecked.
      const k = k0.replace(/^(own|other|pair):/, '')
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

function parseKey(key) {
  const seg = key.split(':')
  const subject = SUBJECTS.has(seg[0]) ? seg.shift() : 'own'
  return { subject, cls: seg[0], local: seg.join(':') }
}

// Absent is absent: an unresolvable key yields undefined, and `satisfies`
// fails it, exactly as a missing fact does in the one-subject evaluator.
function resolve(key, situation) {
  const { subject, cls, local } = parseKey(key)
  return situation?.[subject]?.[cls]?.[local]
}

function matchesSituation(when, situation) {
  return Object.entries(when).every(([k, want]) =>
    satisfies(parseKey(k).local, want, resolve(k, situation)))
}

// The fact classes the situation section declares, per class, as bare keys.
const situationDeclared = {
  fact: new Set([
    ...Object.keys(facts.axes), ...Object.keys(facts.modifiers),
    ...Object.keys(facts.numerics), ...Object.keys(facts.booleans),
    ...Object.keys(facts.enums),
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
    // Rules 1-19 are not transcribed, so `cite_pending` names the paragraph a
    // null cite is waiting on -- or is explicitly null where no paragraph will
    // ever justify it (kin:dynamics is not a COLREGS concept). Silence is the
    // one thing it may not be: an absent key is an unanswered question.
    if (rec.cite === null) assert.ok('cite_pending' in rec, `${k}: null cite with no cite_pending`)
    else assert.ok(rules.paragraphs[rec.cite], `${k}: cite ${rec.cite} not in rules.json`)
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

test('REQ-CAT-6: every fact a two-subject predicate reads resolves in the situation namespace', () => {
  for (const e of twoSubject) {
    for (const k of Object.keys(e.when)) {
      const { subject, cls, local } = parseKey(k)
      assert.ok(SUBJECTS.has(subject), `${e.id}: unknown subject in ${k}`)
      assert.ok(CLASSES.has(cls), `${e.id}: unknown class in ${k}`)
      if (subject === 'pair') assert.ok(PAIR_CLASSES.has(cls), `${e.id}: pair:${cls} is not symmetric`)
      else assert.ok(cls !== 'env', `${e.id}: env is a fact of the pair, never of a vessel`)
      assert.ok(situationDeclared[cls].has(local), `${e.id}: undeclared ${cls} fact ${local} in ${k}`)
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
const applyingSituation = (s) =>
  appl.entries.filter((e) => !isDisplay(e) && matchesSituation(e.when, s)).map((e) => e.id)
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
function pooledRoles(situation) {
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
