# Changelog

## [0.2.0](https://github.com/mark-brannan/colregs/compare/v0.1.3...v0.2.0) (2026-09-06)


### ⚠ BREAKING CHANGES

* every vocabulary identifier is renamed with a type prefix (light:masthead, fact:activity, activity:nuc, rel:includes) in lights.json, facts.json, applicability.json, geometry.json and the fixtures; bare 0.1.1 names no longer resolve. Renaming an identifier is a major version under REQ-PKG-4 (a minor while pre-1.0 per release-please-config.json), and this is the single rename REQ-MODEL-10's immutability baseline (0.1.1) authorises. Citation-derived identifiers -- paragraph paths and entry ids -- are not affected. Migration table in README.md, "Migrating from 0.1.x".

### Added

* geometric consistency check for situation records (Q-48) ([#34](https://github.com/mark-brannan/colregs/issues/34)) ([24a745d](https://github.com/mark-brannan/colregs/commit/24a745d12f3f97ccc8157afd20041554e6b7bfdb))
* Rule 12 reads 3(c), and Rules 13 and 18 override it (Q-40) ([#35](https://github.com/mark-brannan/colregs/issues/35)) ([0ce976f](https://github.com/mark-brannan/colregs/commit/0ce976f1c12ae239c10f09fe8287492c113424e4))
* Rule 15 reads 3(b), and Rule 18 overrides it (Q-40) ([#46](https://github.com/mark-brannan/colregs/issues/46)) ([d5e4bc5](https://github.com/mark-brannan/colregs/commit/d5e4bc57045f78f7d9c7e24fc3001e954d0efdb4))
* the protected-vessel fact for 9(b)/9(d) and 10(i)/10(j) (Q-34) ([#42](https://github.com/mark-brannan/colregs/issues/42)) ([2489e0a](https://github.com/mark-brannan/colregs/commit/2489e0aa25f8d4b9ed07e10f1368f98dc07132b7))
* type-prefixed identifier vocabulary (0.2.0) ([#38](https://github.com/mark-brannan/colregs/issues/38)) ([de09519](https://github.com/mark-brannan/colregs/commit/de095192354bd85d055a92e564bfb44e125c532f)), closes [#13](https://github.com/mark-brannan/colregs/issues/13)


### Fixed

* gate 27(f)'s Rule 23 import on underway and pin Rule 28 to underway ([#39](https://github.com/mark-brannan/colregs/issues/39)) ([b522ea5](https://github.com/mark-brannan/colregs/commit/b522ea511d4d6485f0ab0f00bdf526cb747c53ae))
* the head-on classification cites 14(b), the deeming paragraph (Q-45) ([#36](https://github.com/mark-brannan/colregs/issues/36)) ([1ade0ac](https://github.com/mark-brannan/colregs/commit/1ade0acf41c81fabf96cb5c176298271361bde56))

## [0.1.3](https://github.com/mark-brannan/colregs/compare/v0.1.2...v0.1.3) (2026-09-05)


### Added

* care/meta registry, Rule 2 records, and ADR-0005 vocabulary additions ([#23](https://github.com/mark-brannan/colregs/issues/23)) ([a043773](https://github.com/mark-brannan/colregs/commit/a04377336da92043e34e986741f78dc9307dab9c))
* implement REQ-MODEL-11 deprecation registry under data/ ([#31](https://github.com/mark-brannan/colregs/issues/31)) ([a4fd324](https://github.com/mark-brannan/colregs/commit/a4fd324500965cdf29b905ee895abd47f0188f61))
* JSON Schema 2020-12 validation for data/*.json and fixtures ([#28](https://github.com/mark-brannan/colregs/issues/28)) ([fddda52](https://github.com/mark-brannan/colregs/commit/fddda52517e2fab8571ee9298a540f1125c30949))
* the classification norms — risk of collision and the encounter partition ([#26](https://github.com/mark-brannan/colregs/issues/26)) ([382f224](https://github.com/mark-brannan/colregs/commit/382f2242f948400f5264e02682bc918c3463babd))
* the first two-subject norms — Part B scope and Rule 18 precedence ([#24](https://github.com/mark-brannan/colregs/issues/24)) ([aec8809](https://github.com/mark-brannan/colregs/commit/aec880989debe90d24584a46f530c1b69fca37fb))
* two-subject predicate namespace and the situation fixture schema ([#22](https://github.com/mark-brannan/colregs/issues/22)) ([9ebe7d4](https://github.com/mark-brannan/colregs/commit/9ebe7d4bec9ab36a6b1b497a8114dd80e8b012d2))


### Fixed

* correct Rule 3(m) quote style and scope to match USCG source ([#30](https://github.com/mark-brannan/colregs/issues/30)) ([d6eb9ba](https://github.com/mark-brannan/colregs/commit/d6eb9bab73e8f161d4a9fcb9a559cdad88f5862c))
* restore PR [#25](https://github.com/mark-brannan/colregs/issues/25)'s content, dropped by a rebase before [#24](https://github.com/mark-brannan/colregs/issues/24) merged ([#33](https://github.com/mark-brannan/colregs/issues/33)) ([48486ff](https://github.com/mark-brannan/colregs/commit/48486ff6a4f4433ea9d0215d4da3bd6ed2760717))

## [0.1.2](https://github.com/mark-brannan/colregs/compare/v0.1.1...v0.1.2) (2026-09-03)


### Added

* i18n design — language as a dimension, reversibility gates, gate registry ([#4](https://github.com/mark-brannan/colregs/issues/4)) ([e3e1153](https://github.com/mark-brannan/colregs/commit/e3e1153510531403d402e422c4b5d52188020396))


### Fixed

* **ci:** bump create-github-app-token to v3 for client-id support ([#9](https://github.com/mark-brannan/colregs/issues/9)) ([24861dd](https://github.com/mark-brannan/colregs/commit/24861dd46dd602c7f29a3ad0621ce8ed4b933104))
* **ci:** refuse publish.yml runs off a branch, not a tag ([#7](https://github.com/mark-brannan/colregs/issues/7)) ([82eb42f](https://github.com/mark-brannan/colregs/commit/82eb42fce9918151d41bd99fa91a5dd8ae079990))
* **ci:** use client-id, not the deprecated app-id, for the App token ([#8](https://github.com/mark-brannan/colregs/issues/8)) ([fc0719a](https://github.com/mark-brannan/colregs/commit/fc0719af06f14289f944403773d602bc089e5858))
