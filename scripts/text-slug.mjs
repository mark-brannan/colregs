#!/usr/bin/env node
// Straw man for `text_slug` (ADR 0010, pencil): the key nouns and verbs of a
// paragraph, lemmatised, as a sorted set. Deterministic -- the same text always
// yields the same slug -- with no model in the loop, so it can be a data field.
//
// Nothing here writes to data/. The output is for judging the option, not for
// shipping it: see docs/adr/0010-text-withheld-jurisdictions.md and the
// research issue it names.
//
//   node scripts/text-slug.mjs                # Rules 1-19, one line per paragraph
//   node scripts/text-slug.mjs --rules 20-31  # another range
//   node scripts/text-slug.mjs --json         # {path: [terms]} for machines
//   node scripts/text-slug.mjs --stats        # collisions, near-duplicates, overlap
//   node scripts/text-slug.mjs --blind        # shuffled slugs, no paths (navigation test)
//
// Not a dependency of the package and not shipped: package.json `files` does
// not include scripts/.

import { readFileSync } from 'node:fs'

const load = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)))
const rules = load('data/rules.json')
const appl = load('data/applicability.json')
const facts = load('data/facts.json')

// --- vocabulary ------------------------------------------------------------
// Function words and words that say nothing about *which* paragraph this is.
// `vessel` and `rule` are here because they are in nearly every paragraph;
// `shall` because modality is carried by the applicability entry, not the slug.
const STOP = new Set(`
a an the and or of to in on at by for from with within without as so that this these those
which who whom whose what when whenever where whether while until if but however therefore
thereof therewith than then there here into upon under over out up off through toward along
be is are was were been being has have had having do does done did can cannot could may might
shall should will would must not no nor neither either any anything all every each both some
such other otherwise another one ones own same only also even very more most less least well far
too it its she her herself he him his they them their we our you your i me my
vessel rule means mean term word case circumstance condition provision purpose respect regard
accordance following follows general particular appropriate proper possible practicable necessary
sufficient due special prevailing deemed exist involve take taken taking took make made use used using required require
provided time ample good so-called nature basis extent event finally normally readily nearly
closely fully carefully especially particularly apparently additionally accordingly sometimes
some part description latter ii iii iv v vi nothing notwithstanding among account between able full soon best
enough greatest largest closest different similar exact evident apparent ordinary heavy main possibility presence
reference relation because capable place consist result remain become find cause allow permit admit obtain
include includes including involved meaning
`.trim().split(/\s+/))

// Multi-word terms of art, longest first. Each becomes one hyphenated term so
// the set keeps the concept rather than scattering it into `traffic`,
// `separation`, `scheme`. The target form is the applicability vocabulary's
// where one exists (`narrow-channel`, `risk-of-collision`, `in-sight`).
const PHRASES = [
  ['restricted in (?:her|their) ability to maneuver', 'restricted-ability-maneuver'],
  ['restricted in her ability to deviate from', 'restricted-ability-maneuver'],
  ['constrained by her draft', 'constrained-by-draft'],
  ['in sight of one another', 'in-sight'],
  ['keep out of the way', 'keep-out-of-way'],
  ['keep well clear', 'keep-clear'],
  ['keep clear', 'keep-clear'],
  ['risk of collision', 'risk-of-collision'],
  ['traffic separation schemes?', 'traffic-separation-scheme'],
  ['traffic separating scheme', 'traffic-separation-scheme'],
  ['inshore traffic zones?', 'inshore-traffic-zone'],
  ['traffic lanes?', 'traffic-lane'],
  ['separation zones?', 'separation-zone'],
  ['separation lines?', 'separation-line'],
  ['narrow channels?', 'narrow-channel'],
  ['not under command', 'not-under-command'],
  ['engaged in fishing', 'engaged-in-fishing'],
  ['power-driven vessels?', 'power-driven'],
  ['sailing vessels?', 'sailing-vessel'],
  ['restricted visibility', 'restricted-visibility'],
  ['safe speed', 'safe-speed'],
  ['close-quarters situation', 'close-quarters'],
  ['give-way vessel', 'give-way'],
  ['wig craft', 'wig-craft'],
  ['wing-in-ground \\(wig\\)', 'wig-craft'],
  ['masthead lights?', 'masthead-light'],
  ['fog signal', 'fog-signal'],
  ['compass bearing', 'compass-bearing'],
  ['course and speed', 'course speed'],
  ['on the water', 'water'],
  ['under sail', 'sail'],
  ['en route', 'route'],
  ['high seas', 'high-seas'],
  ['picking up', 'pick-up'],
  ['out of the way', 'keep-out-of-way'],
]

// Lemmas the rules below would get wrong, and the gerunds kept as nouns because
// they name an activity in facts.json (`activity:fishing`, `activity:towing`,
// ...): the slug's target form is the vocabulary's form wherever one exists.
const LEMMA = {
  // gerund nouns kept because they name an activity in facts.json
  fishing: 'fishing', towing: 'towing', trawling: 'trawling', trolling: 'trolling',
  pushing: 'pushing', dredging: 'dredging', surveying: 'surveying', diving: 'diving',
  // gerund nouns that are nouns
  heading: 'heading', bearing: 'bearing', warning: 'warning', hearing: 'hearing', seagoing: 'seagoing',
  // -ing verbs
  anchoring: 'anchor', approaching: 'approach', avoiding: 'avoid', complying: 'comply', construing: 'construe',
  crossing: 'cross', determining: 'determine', developing: 'develop', exhibiting: 'exhibit', falling: 'fall',
  floating: 'float', impeding: 'impede', intending: 'intend', joining: 'join', keeping: 'keep', landing: 'land',
  launching: 'launch', laying: 'lay', leaving: 'leave', meeting: 'meet', navigating: 'navigate', nearing: 'near',
  observing: 'observe', operating: 'operate', overtaking: 'overtake', passing: 'pass', picking: 'pick',
  plotting: 'plot', proceeding: 'proceed', propelling: 'propel', reversing: 'reverse', sailing: 'sail',
  scanning: 'scan', separating: 'separate', servicing: 'service', sounding: 'sound', stopping: 'stop',
  transferring: 'transfer', turning: 'turn', utilizing: 'utilize', corresponding: 'correspond', intervening: 'intervene',
  // -ed verbs and participles
  adapted: 'adapt', adopted: 'adopt', authorized: 'authorize', avoided: 'avoid', carried: 'carry', checked: 'check',
  concerned: 'concern', connected: 'connect', constrained: 'constrain', contained: 'contain', designed: 'design',
  detected: 'detect', determined: 'determine', directed: 'direct', engaged: 'engage', exempted: 'exempt',
  fitted: 'fit', imposed: 'impose', impeded: 'impede', limited: 'limit', mistaken: 'mistake', obliged: 'oblige',
  obscured: 'obscure', observed: 'observe', overtaken: 'overtake', prescribed: 'prescribe', propelled: 'propel',
  relieved: 'relieve', restricted: 'restrict', situated: 'situate', stopped: 'stop', kept: 'keep',
  // third person and irregulars
  seen: 'see', sees: 'see', flies: 'fly', lies: 'lie', hears: 'hear', applies: 'apply', finds: 'find',
  becomes: 'become', detects: 'detect', observes: 'observe', restricts: 'restrict', impedes: 'impede',
  consists: 'consist', remains: 'remain', seamen: 'seaman', coming: 'come',
  // nominalisations folded onto the verb, so `alter` and `alteration` are one term
  alteration: 'alter', alterations: 'alter', assessment: 'assess', assumptions: 'assume', compliance: 'comply',
  detection: 'detect', observance: 'observe', observation: 'observe', maneuverability: 'maneuver',
  replenishment: 'replenish', recovery: 'recover', clearance: 'clear', effectiveness: 'effective',
  // words the plural rule must leave alone
  series: 'series', apparatus: 'apparatus', speed: 'speed', proceed: 'proceed', need: 'need',
}

// Inflection only. Plurals by rule; every -ed and -ing form by table, because a
// suffix rule cannot tell `speed` from `stopped` or `bearing` from `nearing`
// without a lexicon, and a wrong guess is worse than an unlemmatised word. A
// form the table does not know passes through unchanged and is visible as such.
function lemma(w) {
  if (LEMMA[w]) return LEMMA[w]
  if (w.includes('-') || /^\d/.test(w)) return w
  let m
  if ((m = /^(.+?)ies$/.exec(w))) return `${m[1]}y`
  if (/(ss|us|is)$/.test(w)) return w
  if ((m = /^(.+?)(sh|ch|x)es$/.exec(w))) return m[1] + m[2]
  if ((m = /^(.+?)s$/.exec(w))) return m[1]
  return w
}

// Citations are facts about which provision is invoked, not expression:
// `rule-13`, `rules-4-19`. A number and its unit stay together (`20-meter`).
function tokens(text) {
  let t = text.toLowerCase().replace(/[“”]/g, '"').replace(/’/g, "'").replace(/and\/or/g, ' ')
  const out = []
  t = t.replace(/\brules?\s+(\d+)\s*-\s*(\d+)/g, (_, a, b) => { out.push(`rules-${a}-${b}`); return ' ' })
  t = t.replace(/\brules?\s+((?:\d+(?:\([a-z]\))?(?:\([ivx]+\))?(?:\s*,\s*(?:and\s+)?|\s+and\s+)?)+)/g, (_, list) => {
    for (const m of list.matchAll(/(\d+)(?:\(([a-z])\))?(?:\(([ivx]+)\))?/g)) out.push(`rule-${m[1]}${m[2] ?? ''}${m[3] ?? ''}`)
    return ' '
  })
  t = t.replace(/\b(\d+(?:\.\d+)?)\s+(meters?|degrees?)/g, (_, n, u) => { out.push(`${n.replace('.', '-')}-${lemma(u)}`); return ' ' })
  for (const [re, term] of PHRASES) t = t.replace(new RegExp(`\\b${re}\\b`, 'g'), ` ${term} `)
  for (const w of t.match(/[a-z][a-z-]*[a-z]|[a-z]/g) ?? []) {
    if (w.endsWith('ly') && !['early', 'apply', 'comply', 'fly', 'rely'].includes(w)) continue
    if (STOP.has(w)) continue
    const l = lemma(w)
    if (STOP.has(l)) continue
    out.push(l)
  }
  return [...new Set(out)].sort()
}

export const slugOf = (paragraph) => tokens(paragraph.text)

// --- CLI ---------------------------------------------------------------------
const args = process.argv.slice(2)
const range = (args.includes('--rules') ? args[args.indexOf('--rules') + 1] : '1-19').split('-').map(Number)
const inRange = (p) => Number(p.rule) >= range[0] && Number(p.rule) <= (range[1] ?? range[0])
const paragraphs = Object.values(rules.paragraphs).filter((p) => p.text !== undefined && inRange(p))
const slugs = new Map(paragraphs.map((p) => [p.path, slugOf(p)]))

if (args.includes('--json')) {
  console.log(JSON.stringify(Object.fromEntries(slugs), null, 1))
} else if (args.includes('--blind')) {
  // A navigation test needs the slugs without their answers. Shuffled by a
  // fixed hash of the path so the ordering is reproducible but not the file's.
  const h = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 1000003, 7)
  const rows = [...slugs].sort((a, b) => h(a[0]) - h(b[0]))
  rows.forEach(([, s], i) => console.log(`${String(i + 1).padStart(3)}: ${s.join(', ')}`))
  if (args.includes('--key')) console.log('\nKEY: ' + rows.map(([p], i) => `${i + 1}=${p}`).join(' '))
} else if (args.includes('--stats')) {
  const jacc = (a, b) => { const A = new Set(a), B = new Set(b); const i = [...A].filter((x) => B.has(x)).length; return i / (A.size + B.size - i) }
  const paths = [...slugs.keys()]
  const sizes = paths.map((p) => slugs.get(p).length)
  console.log(`paragraphs: ${paths.length}; terms per slug: min ${Math.min(...sizes)}, median ${sizes.sort((a, b) => a - b)[sizes.length >> 1]}, max ${Math.max(...sizes)}`)
  const empty = paths.filter((p) => slugs.get(p).length === 0)
  console.log(`empty slugs: ${empty.length} ${empty.join(' ')}`)
  const byKey = new Map()
  for (const p of paths) { const k = slugs.get(p).join(' '); byKey.set(k, [...(byKey.get(k) ?? []), p]) }
  const dup = [...byKey.values()].filter((v) => v.length > 1)
  console.log(`identical slugs (unnavigable): ${dup.length} groups ${dup.map((g) => g.join('=')).join(' ')}`)
  const near = []
  for (let i = 0; i < paths.length; i++) for (let j = i + 1; j < paths.length; j++) {
    const s = jacc(slugs.get(paths[i]), slugs.get(paths[j]))
    if (s >= 0.6 && s < 1) near.push(`${paths[i]}~${paths[j]}(${s.toFixed(2)})`)
  }
  console.log(`near-duplicates (jaccard >= 0.6): ${near.length} ${near.join(' ')}`)
  // Sibling discrimination: within a rule, does every paragraph differ from
  // every other by at least one term?
  const byRule = new Map()
  for (const p of paths) byRule.set(rules.paragraphs[p].rule, [...(byRule.get(rules.paragraphs[p].rule) ?? []), p])
  const same = []
  for (const ps of byRule.values()) for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    if (slugs.get(ps[i]).join(' ') === slugs.get(ps[j]).join(' ')) same.push(`${ps[i]}=${ps[j]}`)
  }
  console.log(`siblings with identical slugs: ${same.length} ${same.join(' ')}`)

  // Vocabulary overlap. Every enumerated value and every fact key the
  // applicability entries and facts.json use, mapped to the slug's term space
  // by the same table a reader would need (the four abbreviations are the
  // whole of it). Two views: which vocabulary terms any slug carries, and for
  // each entry citing a paragraph in range, whether the cited paragraph's slug
  // carries the terms the entry's predicate reads.
  const ALIAS = {
    nuc: ['not-under-command'], ram: ['restricted-ability-maneuver'], ram_underwater: ['restricted-ability-maneuver', 'underwater'],
    cbd: ['constrained-by-draft'], wig: ['wig-craft'], sail: ['sail', 'sailing-vessel'], power: ['power-driven'],
    oars: ['oar'], fishing: ['fishing', 'engaged-in-fishing'], being_towed: ['tow', 'towing'], anchored: ['anchor'],
    moored: ['moor'], making_way: ['make-way', 'way'], in_sight: ['in-sight'], risk_of_collision: ['risk-of-collision'],
    narrow_channel: ['narrow-channel'], traffic_lane: ['traffic-lane'], following_traffic_lane: ['traffic-lane'],
    confined_to_channel: ['narrow-channel', 'navigate'], was_overtaking: ['overtake'], wind_side: ['wind', 'side'],
    rel_bearing_deg: ['bearing', 'beam', 'ahead', 'abaft', 'abeam'], bearing_change_deg_min: ['bearing', 'change'],
    tcpa_s: ['close-quarters'], windward: ['windward', 'leeward'], length_m: ['length', '20-meter'],
    rule18_class: ['keep-out-of-way'], activity: ['engage'], propulsion: ['propel', 'machinery'], position: ['underway', 'anchor', 'aground'],
    port: ['port'], starboard: ['starboard'], none: [], unknown: [], underway: ['underway'], aground: ['aground'],
    trawling: ['trawling', 'trawl'], towing: ['towing', 'tow'], pushing: ['pushing'], mine: ['mine'], pilot: ['pilot'], diving: ['diving'],
    composite_unit: [], gear_extent_m: ['fishing', 'apparatus'], max_speed_kn: ['speed'], near_channel: ['narrow-channel'],
    non_displacement: ['non-displacement'], obstruction_exists: ['obstruction'], on_mooring_buoy: ['moor'], tow_length_m: ['tow', 'length'],
    wig_near_surface: ['wig-craft', 'surface'], making_way: ['way'],
  }
  const termsOf = (raw) => { const k = raw.replace(/^(own|other|pair):/, '').split(':').pop(); return ALIAS[k] ?? [k] }
  const all = new Set([...slugs.values()].flat())
  const vocab = new Set()
  const walk = (w) => { for (const k in w) { if (k === 'any_of') w[k].forEach(walk); else { vocab.add(k); const v = w[k]; for (const x of Array.isArray(v) ? v : typeof v === 'object' && v !== null ? [].concat(v.not ?? [], v.any_of ?? []) : [v]) if (typeof x === 'string') vocab.add(x) } } }
  appl.entries.forEach((e) => walk(e.when ?? {}))
  for (const a of Object.values(facts.axes)) a.values.forEach((v) => vocab.add(v))
  const hit = [], miss = []
  for (const v of [...vocab].sort()) (termsOf(v).some((t) => all.has(t)) ? hit : miss).push(v)
  console.log(`\nvocabulary terms (${vocab.size}) some slug in range carries: ${hit.length}`)
  console.log(`  missing: ${miss.join(' ')}`)
  console.log('\nper entry, cited paragraph in range: does its slug carry what the predicate reads?')
  const rows = []
  for (const e of appl.entries) {
    const head = e.cite.split(',')[0].trim()
    if (!slugs.has(head)) continue
    const reads = new Set(); const collect = (o) => { for (const k in o) { if (k === 'any_of') o[k].forEach(collect); else { reads.add(k); const v = o[k]; for (const x of Array.isArray(v) ? v : typeof v === 'object' && v !== null ? [].concat(v.not ?? [], v.any_of ?? []) : [v]) if (typeof x === 'string') reads.add(x) } } }
    collect(e.when ?? {})
    const s = new Set(slugs.get(head))
    const got = [], not = []
    for (const r of reads) { const ts = termsOf(r); if (ts.length === 0) continue; (ts.some((t) => s.has(t)) ? got : not).push(r) }
    rows.push(`${e.id.padEnd(16)} ${head.padEnd(10)} carried: ${got.join(' ') || '-'}  | absent: ${not.join(' ') || '-'}`)
  }
  console.log(rows.join('\n'))
} else {
  for (const [p, s] of slugs) console.log(`${p.padEnd(11)} ${s.join(', ')}`)
}
