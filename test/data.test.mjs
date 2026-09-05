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
const applying = (f) => appl.entries.filter((e) => matches(e.when, f)).map((e) => e.id)

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
const PAIR_CLASSES = new Set(['geo'])

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
}

test('REQ-CAT-4: the situation section declares the classes the namespace names', () => {
  assert.deepEqual([...SUBJECTS].sort(), ['other', 'own', 'pair'])
  assert.deepEqual([...CLASSES].sort(), ['fact', 'geo', 'hist', 'kin'])
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
    const viaSituation = appl.entries.filter((e) => matchesSituation(e.when, asSituation)).map((e) => e.id)
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
