# Agent decisions

Append-only. Each entry is a call an agent made in pencil: a default it took
under the one-way-door test, with its undo. Written by `agent-decision`; the
heading is the UTC stamp, so `agent_decisions.md#<stamp>` links one entry.

### 20261028t081223z
- 25d_ii gated on activity:none #223 documented as lawful, not changed (no PR, branch main)

### 20261028t081650z
- geometry.json: Inland AnxI.3(a) as a per-record jurisdiction us/inland entry beside the intl row (ADR 0002 mixed-jurisdiction shape) (no PR, branch claude/w10-geometry-annex-i)

### 20261028t081653z
- geometry.json sectors: horizontal object becomes an array and a vertical array is added, entries typed by a new sectorEntry schema (no PR, branch claude/w10-geometry-annex-i)

### 20261028t081656z
- Annex I text for 3(a), 9, 10 taken from IMO consolidated 2018 PDF because the repo corpus holds no Annex I and navcen returns 403; Annex I section 5 left out (no PR, branch claude/w10-geometry-annex-i)

### 20261028t082142z
- CEVNI skeleton read from Rev.4 (only reachable edition), edition eu/cevni@rev4 Undo: re-key from Rev.6 when reachable ([#240](https://github.com/mark-brannan/colregs/pull/240))

### 20261028t082152z
- CEVNI skeleton in a new rules.json standalone section, not an ADR 0020 delta Undo: move rows into deltas with full suppressions and tombstones ([#240](https://github.com/mark-brannan/colregs/pull/240))

### 20261028t082202z
- CEVNI keys <article>[bis](<n>); 1.01 by lettered groups; bare article when unnumbered; numbered-paragraph depth; annexes not keyed Undo: rename keys ([#240](https://github.com/mark-brannan/colregs/pull/240))

### 20261028t082213z
- temporary ids marked by path_status: temporary on the standalone section Undo: drop the field ([#240](https://github.com/mark-brannan/colregs/pull/240))

### 20261028t082224z
- editions schema: in_force optional, CEVNI is a recommendation with no entry into force Undo: restore in_force to required ([#240](https://github.com/mark-brannan/colregs/pull/240))
