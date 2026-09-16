# Maritime sources — case law and incident analysis

Decisions and commentary on how the Rules are conventionally read, and
collision forensics showing how they fail in the water.

A case is evidence that a reading is or is not conventional. It never becomes
a proposition in `docs/part-b-invariants.md`, which holds no maritime doctrine
by design. Consult these where a `Q-` in `docs/requirements.md` §11 turns on a
question the rule text leaves open.

## Case law

- **Monford Management Ltd v Afina Navigation Ltd ("KIVELI" c/w "AFINA I") [2025] EWHC 1185 (Admlty)**. Bryan J, Admiralty Court; permission to appeal refused, [2025] EWHC 1210. When a Section II classification arms and how long it persists — `Q-51` and `Q-52`. Held: Rule 14 applies once risk of collision arises, not on geometry alone, and risk of collision was found on Rule 7(d)(i) steady bearing plus an unsafe CPA; once armed, the classification persists until the risk has passed, unaffected by later course changes. The court rejected the submission that a head-on at C-22 had become a crossing by C-6 as the bearing opened. Reaches Rule 13 by analogy only; silent on overtaking.
  <https://caselaw.nationalarchives.gov.uk/ewhc/admlty/2025/1185> · case note by Nigel Cooper KC, counsel for AFINA I: <https://www.quadrantchambers.com/sites/default/files/2025-05/avoiding_a_head-on_collision_-_it_is_not_just_about_the_side_lights.pdf>
- **Evergreen Marine (UK) Ltd v Nautical Challenge Ltd ("Ever Smart" / "Alexandra 1") [2021] UKSC 6**. Frames Section II as a scheme about steady-bearing *collision* situations, with Rule 13 inside that taxonomy ([56]–[57]); leans against treating an engaged rule as inapplicable ([68]); describes Rule 17's obligations as qualified stages, predicates on the current state, with keep-course-and-speed accommodating manoeuvres such as slowing to pick up a pilot ([61]–[62]). Not asked when Rule 13 arms, and did not decide it. Separately, at [60] and [66]–[67], settles `Q-23`'s asymmetry: Rule 2(a) is a standing responsibility clause that authorises nothing, while Rule 2(b) is a conjunctive test — special circumstance *and* immediate danger — and rejects Rule 2 as a gap-filler for the steering rules.
  <https://caselaw.nationalarchives.gov.uk/uksc/2021/6>
- **Crowley Marine Services Inc. v. Maritrans Inc., 447 F.3d 719 (9th Cir. 2006)**. `Q-23`: the burden of justifying a Rule 2(b) departure falls on the departing vessel, and the departure must respond to an immediate danger already created — a pre-emptive departure does not qualify (n.6).
  <http://cdn.ca9.uscourts.gov/datastore/opinions/2006/05/08/0435724.pdf>

## Commentary and guidance

- **Kemp — *When Do Collision Regulations Begin to Apply?* (Journal of Navigation)**. A judicial split on the antecedent question: some decisions hold the steering and sailing rules begin at risk of collision, others that they apply just before it, risk of collision being the thing to be avoided.
  <https://www.cambridge.org/core/journals/journal-of-navigation/article/abs/when-do-collision-regulations-begin-to-apply/E6DBCD8A6ABC43FA88B5E6CB3ABF807C>
- **eCOLREGs — overtaking and crossing on the high seas**. States the broad reading of Rule 13(d) as conventional: an overtaking vessel "maintains overtaking status and cannot transition into a crossing or head-on situation until completely past and clear".
  <https://advanced.ecolregs.com/index.php?option=com_k2&view=item&id=172>
- **Nautical Institute — *Action by the Stand-On Vessel*** (Seaways case study). The stand-on vessel's stages as taught; does not reach whether they are reversible.
  <https://www.nautinst.org/resources-page/200115-action-by-the-stand-on-vessel.html>
- **USCG Navigation Rules (Amalgamated)**. <https://www.navcen.uscg.gov/navigation-rules-amalgamated>

## Marine incident analysis

Collision forensics. Radar misinterpretation, mismatched turn decisions and
ambiguous give-way/stand-on roles are what the Rules are written against.

- Garzke, Simpson — *The Loss of Andrea Doria: A Marine Forensic Analysis* (Marine Technology Society Journal 46(6), 2012). Reconstructs the 1956 Andrea Doria–Stockholm collision from radar, navigation and rules-of-the-road evidence.
  <https://www.ingentaconnect.com/content/mts/mtsj/2012/00000046/00000006/art00008> · <https://onepetro.org/JSPD/article/26/02/98/172277/The-Loss-of-Andrea-Doria-A-Marine-Forensic>
- British Wreck Commissioner (Lord Mersey) — *Report on the Loss of the Titanic* (1912). Excessive speed through a known ice field despite wireless ice warnings — a Rule 6 case, not give-way/stand-on.
  <https://www.titanicinquiry.org/BOTInq/BOTReport/botRep01.php>
- Halpern — *Strangers on the Horizon: Titanic and Californian – A Forensic Approach* (2019). Reconstruction of the Titanic–Californian near-encounter: lookout, distress-signal and stand-on/give-way failures. Book only.
  <https://www.amazon.com/STRANGERS-HORIZON-Californian-Forensic-Approach/dp/1702121984>
- IMO GISIS Marine Casualties and Incidents module. Not a paper but a source class: the mandatory-reporting database of marine safety investigation reports. Ground truth for real COLREGS-relevant incidents.
  <https://www.imo.org/en/OurWork/IIIS/Pages/Marine-Safety-Investigation-reports.aspx>

## Known gaps

- `Q-23`: *The Bywell Castle* and *Boy Andrew v St Rognvald* are unread, and no
  case was found holding a Rule 2(b) departure justified on draught,
  manoeuvrability, shoal water, a lee shore, set, visibility or sea state.
- Two standard texts — Cockcroft & Lameijer, *A Guide to the Collision Avoidance Rules*, and Farwell's *Rules of the Nautical Road* — are not online. Either may settle how the stages of a close-quarters encounter are divided, and whether they are treated as irreversible.
- Several of the questions in `docs/requirements.md` §11 appear unlitigated: overtaking geometry with no risk of collision, an overtaking situation becoming a head-on, resumption of course by a stand-on vessel that has acted, and the fate of accumulated Section II state across a visibility transition.
- BAILII refuses automated access. Use the National Archives Find Case Law service: <https://caselaw.nationalarchives.gov.uk/>
