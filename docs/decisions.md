# Decisions

Rulings from `/sequence` sessions and other closed judgment calls. One line
each: date, short name, the answer, a link to the argument.

- 2026-09-16 — docs ownership: colregs-engine's docs are sited wrong; colregs owns docs going forward, no new doc lands in colregs-engine. `normative-language.md` was already migrated the same day (commit fe0f8c2, #125); migration of the remaining three (`formal-methods-glossary.md`, `formal-methods-reading-list.md`, `engine-notes.md`) is not yet scheduled. Argued on kanban; no public writeup to link.
- 2026-09-16 — own vs self: rename the subject segment `own` to `self` across the situation record (fact keys, precedence effect keys, facts.json, fixtures, docs/identifiers.md). Work spawned as [colregs#138](https://github.com/mark-brannan/colregs/issues/138).
- 2026-09-16 — Q-54, Rule 17's phases are monotone: once 17(a)(ii) permission or the 17(b) duty has arisen for the stand-on vessel, it does not fall back on belated give-way compliance. Argued in [colregs#72](https://github.com/mark-brannan/colregs/issues/72); recorded in `docs/requirements.md`.
- 2026-09-16 — Q-53, 17(a)(ii) is an exception, not a suspension: the stand-on vessel's duty stands and a departure is lawful only as action to avoid collision; a monitor flags any other alteration. Argued in [colregs#72](https://github.com/mark-brannan/colregs/issues/72); recorded in `docs/requirements.md`.
- 2026-09-17 — second jurisdiction: `us/inland`, Part C, before v1. Ruled on [colregs#137](https://github.com/mark-brannan/colregs/issues/137); skeleton delta lands under ADR 0020, text and entries follow.
- 2026-09-17 — #74, situation keys in the identifier diff: closed as obsolete. ADR 0015 §11 removed the identifier diff pre-1.0, so there is nothing to extend; the situation vocabulary is also still pencil under ADR 0005. Ruled on [colregs#74](https://github.com/mark-brannan/colregs/issues/74).
