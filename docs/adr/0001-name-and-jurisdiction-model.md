# ADR 0001 — Package name, and jurisdiction as a dimension

Date: 2026-08-29
Status: accepted; amended 2026-09-05 (licence terms verified, see Amendments)

## Context

The data package needed a name, and the naming had to fit an existing family:
`ampacity` and `coastlines` (plain or term-of-art nouns for ready-made data),
`portolani` (an archaic term of art naming a format), `wire-wright` and
`coast-wright` (code that derives or draws).

Three candidates were considered.

**`fanali`** — Italian for ships' lanterns. Matched the `portolani` register
exactly. Rejected: a *fanale* is a lantern, and day shapes are black balls,
cones and diamonds. Part C's own title is "Lights and Shapes" precisely because
no single word covers the pair, so the name would have been wrong as soon as
day shapes landed.

**`navrules`** — the USCG's term. Rejected on reflection: "Navigation Rules" is
the name of *one country's amalgamation*. It denotes COLREGS plus the US Inland
Navigational Rules plus 33 CFR 26 and the VTS regs. Naming a multi-jurisdiction
package after one jurisdiction's compilation is backwards.

**`colregs`** — accepted. It was unclaimed on npm, which for a canonical domain
term is unusual enough to be worth taking on sight.

## Decision

The package is **`colregs`**, and jurisdiction is a first-class dimension
(REQ-SCOPE-2) rather than a fork or a later bolt-on.

The name and the data model agree, which is the actual argument:

The national amalgamations are *deltas on COLREGS*, not peer bodies of rules.
The US Inland Navigational Rules were harmonised with COLREGS in 1980 and share
its rule numbering — Rule 25 is Rule 25 in both. That is why keying on paragraph
paths works across jurisdictions at all. COLREGS is the stem every national
version grows from, so it is the correct name for the trunk, and each
jurisdiction is a set of overrides hanging off it.

`navrules` would have been actively wrong under this model. `fanali` would have
been too narrow. Neither failure was about taste.

## Consequences

- The README must state covered jurisdictions explicitly (REQ-SCOPE-6). A name
  this broad promises more than v1 ships, and the honest fix is disclosure, not
  a narrower name that would have to change later.
- `navrules`, `inland-rules`, `33-cfr-83` and `cevni` go in package keywords
  (REQ-PKG-5) so jurisdiction-specific searches land.
- Jurisdictions become a work queue rather than a scope question. Ranked by
  delta-worth-modelling against licence cleanliness, and all licence terms
  below are **unverified** (Q-3):

  | Jurisdiction | Instrument | Delta | Licence, unverified |
  |---|---|---|---|
  | `us/inland` | 33 CFR 83–90 | large | public domain |
  | `eu/cevni` | CEVNI (UNECE) / RPNR | largest of any | UN copyright — the risk |
  | `ca/inland` | Collision Regs, C.R.C. c.1416 | moderate | Reproduction of Federal Law Order |
  | `de/binnen` | SeeSchStrO / BinSchStrO | large | §5 UrhG, *amtliche Werke* |
  | `uk` | SI 1996/75 | near-zero | OGL v3.0 |
  | `au` | Marine Order 30 | near-zero | CC BY 4.0 |

  UK and Australia are worth taking *because* their delta is near-zero: they
  cost almost nothing and let the README name six jurisdictions honestly.
  CEVNI is the interesting one — genuinely different inland light
  configurations, no prior art as structured data, and the only licence on the
  list that might block outright.

  *Superseded 2026-09-05: the table above is the recalled state and is kept
  as the record of what was assumed. The verified terms are in Amendments
  below.*

## Not decided here

The switching plugin's name and the renderer's name. The plugin needs a
`signalk-` prefix for app-store discovery regardless; `lamp-wright` and
`fanali` are both available and both fit the family for the renderer.

## Amendments

### 2026-09-05 — Licence terms verified against the primary sources (Q-3, REQ-PROV-2)

The table in Consequences was recalled, not checked, and said so. Every
term below was read from the live primary source on 2026-09-05; the
fetch-by-fetch evidence is in the private state log of that date
(`state/global/log/2026-09-05-colregs-jurisdiction-licences.md`). This
amendment supersedes that table. It does not change the decision — name,
jurisdiction-as-dimension, the work queue — only the licence column and
what it implies for which instrument supplies the Rules *text*.

| Jurisdiction | Instrument (text source) | Delta | Licence, verified | Attribution to ship (REQ-PROV-3) |
|---|---|---|---|---|
| `us/inland` | 33 CFR 83, eCFR | large | 17 U.S.C. §105, public domain | none; credit USCG by custom |
| `eu/cevni` | CEVNI Rev.6 (UNECE) | largest | **unverified** — unece.org unreachable from the checking host; the UN default terms are personal, non-commercial only. Blocked until written permission is obtained or a national transposition is chosen instead | — |
| `ca/inland` | Collision Regulations, C.R.C. c.1416, Schedule 1 | moderate | Reproduction of Federal Law Order SI/97-5 | none; accuracy diligence required, and must not be represented as an official version |
| `de/binnen` | SeeSchStrO (delta) + KVR, Anlage to SeeStrOV (text) | large | §5(1) UrhG, no copyright | none |
| `uk` | SI 1996/75 (delta) + MSN 1781 (text) | near-zero | OGL v3.0, Crown copyright | "Contains public sector information licensed under the Open Government Licence v3.0." |
| `au` | Marine Order 30 (Prevention of collisions) 2016, F2016L01187 (delta only; text inherited from `intl`) | near-zero | CC BY 4.0 | "Based on content from the Federal Register of Legislation at [full date of download]. For the latest information on Australian Government legislation please go to https://www.legislation.gov.au." |

**What the recall got wrong.** Recorded so the errors are not re-recalled:

1. **AU instrument id.** Marine Order 30 (Prevention of collisions) 2016 is
   F2016L01187. C2016L01175, the id carried on the board, is a different
   instrument (a VET provider revocation).
2. **AU reproduces no Rules text.** The Order "gives effect to" the
   Convention and defines the International Regulations as the Rules and
   Annexes "as in force from time to time". CC BY 4.0 clears the Australian
   delta only; there is no Australian government publication of the Rules
   to lean on, so `au` inherits its text from `intl` — which the
   jurisdiction-as-delta model already assumes.
3. **UK: the SI carries no Rules text either.** Regulation 4(1) of SI
   1996/75 incorporates Rules 1–36 and Annexes I–III by reference. The text
   is MSN 1781 (M+F), Crown copyright 2004, published on gov.uk under OGL
   v3.0. OGL is the right licence; MSN 1781 is the source to cite.
4. **DE: §5(1) UrhG, not the §5(2) *amtliche Werke* limb.** Both SeeSchStrO
   and the KVR Anlage are Verordnungen, which §5(1) excludes from copyright
   outright. The Quellenangabe and Änderungsverbot conditions attach only to
   §5(2) works and so do not apply. The German Rules text also lives in a
   separate instrument from SeeSchStrO: the Anlage to §1 SeeStrOV.
5. **CA carries two conditions** the recall did not: due diligence as to
   accuracy, and the reproduction "not represented as an official version".
   The README's not-the-law disclaimer should say so explicitly for `ca`.
   The canada.ca general terms (non-commercial only) govern non-enactment
   Crown material and do not displace SI/97-5 for Schedule 1 — but they do
   mean Transport Canada explanatory prose cannot be lifted on the same
   footing.
6. **US: no page states "public domain".** Neither eCFR nor the USCG
   amalgamated page carries a licence statement, and the Navigation Rules
   Handbook PDF does not say it despite web summaries claiming so. The basis
   is 17 U.S.C. §105(a): "Copyright protection under this title is not
   available for any work of the United States Government".
7. **CEVNI is unverified, not "unclear".** unece.org, the UN Digital
   Library and UN iLibrary all refused the checking host, so nothing
   UNECE-specific was read. What was read is the UN's default position:
   "All rights reserved", with web-site use limited to "personal,
   non-commercial use, without any right to resell or redistribute". Ways
   through: a written permission from UN Publications Rights & Permissions,
   or a national transposition under an open licence (Germany's BinSchStrO
   under §5(1) UrhG, or the Netherlands' BPR) — the same corpus by a lawful
   route, at the cost of being a national delta rather than "CEVNI".
8. **IMO's own text is closed to this package.** The IMO website terms
   permit copying and adaptation "for the User's personal, non-commercial
   purposes" and state that "Reuse of the Materials for commercial purposes
   is expressly prohibited", with derivatives bound to the same terms. That
   is incompatible with Apache-2.0 (ADR 0004). The package does not rely on
   IMO's text and must not; the US route it already takes, and the UK, CA
   and DE routes above, all reach the same Rules text lawfully.

**Accepted risk: IMO copyright in the enacted treaty text.** The `intl`
text is taken from a US Government publication, and §105 covers that
publication. It does not, by itself, answer whether IMO holds a copyright
in the underlying 1972 Convention text that survives national enactment.
The GPO's own caveat — "Government publications may contain copyrighted
material which was used with permission of the copyright owner" — and
OGL's exclusion of "third party rights the Information Provider is not
authorised to license" are exactly that question. No source checked
answers it; there is no IMO statement either way. The evidence in
mitigation is practice: four governments publish the full Rules under
their own terms — the US as a §105 work, the UK as Crown copyright (MSN
1781, 2004) under OGL, Canada as an enactment under SI/97-5, and Germany
as an official translation that §5(1) UrhG makes copyright-free. Each of
those is a state treating the enacted text as its own official work. This
is recorded as an **accepted risk**, not as settled. Whether to carry it,
seek an IMO statement, or narrow the package is the maintainer's call and
is not made here.

**Sources read, 2026-09-05.**

- US: <https://www.ecfr.gov/current/title-33/chapter-I/subchapter-E/part-83>;
  <https://www.navcen.uscg.gov/navigation-rules-amalgamated>;
  <https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title17-section105&num=0&edition=prelim>;
  <https://www.govinfo.gov/about/policies>.
- UK: <https://www.legislation.gov.uk/uksi/1996/75/contents/made>;
  <https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/281965/msn1781.pdf>;
  <https://www.gov.uk/government/publications/msn-1781-mf-amendment-3-the-merchant-shipping-regulations-1996-colreg>;
  <https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/>.
- AU: <https://www.legislation.gov.au/F2016L01187/latest/text>;
  <https://www.legislation.gov.au/terms-of-use>.
- DE: <https://www.gesetze-im-internet.de/seeschstro_1971/BJNR006410971.html>;
  <https://www.gesetze-im-internet.de/seestro_1972/BJNR008160977.html>;
  <https://www.gesetze-im-internet.de/urhg/__5.html>.
- CA: <https://laws-lois.justice.gc.ca/eng/regulations/C.R.C.,_c._1416/FullText.html>;
  <https://laws-lois.justice.gc.ca/eng/regulations/SI-97-5/page-1.html>;
  <https://www.canada.ca/en/transparency/terms.html>.
- UN (CEVNI parent terms; UNECE itself unreachable):
  <https://www.un.org/en/about-us/copyright>;
  <https://www.un.org/en/about-us/terms-of-use>.
- IMO: <https://www.imo.org/en/About/Conventions/Pages/COLREG.aspx>;
  <https://www.imo.org/en/About/Pages/IMO-Website-Terms-and-conditions-of-use.aspx>.
