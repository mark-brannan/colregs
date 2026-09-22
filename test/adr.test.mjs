import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ROOT,
  INDEX,
  adrFiles,
  claimOf,
  pad,
  parseIndex,
  promote,
  readIndex,
  slugOf,
} from "../scripts/adr.mjs";

// docs/adr/INDEX.md is the register of allocated ADR numbers and this is what
// makes it one. docs/proposals/README.md states the mechanism it guards.

const git = (...args) =>
  spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
const entries = readIndex();

// The comparison base for "not already allocated". CI checks out full history,
// so origin/main resolves there; a clone that has never fetched it skips that
// one check locally and never in CI. No entry on main yet is not the same as
// no main: the first returns [], the second null.
function baseEntries() {
  const resolve = () =>
    ["origin/main", "refs/remotes/origin/main", "main"].find(
      (r) => git("rev-parse", "--verify", "--quiet", r).status === 0,
    );
  let ref = resolve();
  if (!ref && process.env.CI) {
    git(
      "fetch",
      "--no-tags",
      "--depth=1",
      "origin",
      "main:refs/remotes/origin/main",
    );
    ref = resolve();
  }
  if (!ref) return null;
  const r = git("show", `${ref}:${INDEX}`);
  return r.status === 0 ? parseIndex(r.stdout) : [];
}
const base = baseEntries();

test("ADR index: numbers are unique, ordered, and have no gaps", () => {
  assert.ok(entries.length > 0, `${INDEX} has no entries`);
  entries.forEach((e, i) => {
    assert.equal(
      e.n,
      i + 1,
      `${INDEX}:${e.lineno}: expected ADR ${pad(i + 1)}, got ${pad(e.n)} — the register runs 0001 upward with no gap and no repeat`,
    );
  });
});

test("ADR index: INDEX.md and docs/adr/*.md are in bijection", () => {
  const landed = entries.filter((e) => e.file);
  assert.deepEqual(
    landed.map((e) => e.file),
    adrFiles().map((f) => f.file),
    `every docs/adr/NNNN-*.md needs an ${INDEX} entry and vice versa; a number whose text is elsewhere gets a "reserved" line`,
  );
  for (const e of landed) {
    const h1 = readFileSync(join(ROOT, e.file), "utf8").split("\n", 1)[0];
    assert.equal(
      h1,
      `# ADR ${pad(e.n)} — ${e.title}`,
      `${e.file}: H1 disagrees with ${INDEX}:${e.lineno}`,
    );
  }
});

test(
  "ADR index: no number already allocated on origin/main",
  {
    skip:
      base === null &&
      !process.env.CI &&
      "origin/main not fetched; run `git fetch origin main`",
  },
  () => {
    assert.ok(
      base,
      "could not resolve origin/main, so the allocation check cannot run",
    );
    const here = new Map(entries.map((e) => [e.n, e]));
    const high = Math.max(0, ...base.map((e) => e.n));
    for (const was of base) {
      const now = here.get(was.n);
      assert.ok(
        now,
        `ADR ${pad(was.n)} is on origin/main but missing here; ${INDEX} is append-only`,
      );
      // A landed number is spent. A reserved one may still be landed by the
      // document it was held for -- that is what reserving it was for.
      if (was.file) {
        assert.equal(
          now.file,
          was.file,
          `ADR ${pad(was.n)} is already allocated to ${was.file} on origin/main; take the next free number (${pad(high + 1)})`,
        );
      }
    }
    for (const e of entries) {
      if (base.some((b) => b.n === e.n)) continue;
      assert.ok(
        e.n > high,
        `ADR ${pad(e.n)} is already allocated on origin/main; rebase and take the next free number (${pad(high + 1)})`,
      );
    }
  },
);

test("ADR proposals: a number prefix is a claim, a date prefix is not", () => {
  assert.equal(claimOf("docs/proposals/0022-part-d-signals.md"), 22);
  assert.equal(claimOf("docs/proposals/2026-01-15-some-idea.md"), null);
  assert.equal(claimOf("docs/proposals/some-idea.md"), null);
  for (const p of [
    "docs/proposals/0022-part-d-signals.md",
    "docs/proposals/2026-01-15-part-d-signals.md",
    "docs/proposals/part-d-signals.md",
  ]) {
    assert.equal(
      slugOf(p),
      "part-d-signals",
      `${p}: the slug is the same whatever the prefix`,
    );
  }
});

// --- promote() -------------------------------------------------------------
//
// promote() is the only part of the mechanism that writes: it git-mv's the
// file, rewrites the H1, moves the budget key and appends to the register.
// Each case below builds a throwaway repo and asserts on all four, because
// a promotion that does three of them leaves the tree failing prose-budget
// or the bijection test above, on main, after the merge that triggered it.

const fixture = (index, proposals, budgets = {}) => {
  const root = mkdtempSync(join(tmpdir(), "adr-promote-"));
  mkdirSync(join(root, "docs/adr"), { recursive: true });
  mkdirSync(join(root, "docs/proposals"), { recursive: true });
  writeFileSync(join(root, INDEX), index);
  writeFileSync(
    join(root, "docs/budgets.json"),
    JSON.stringify({ lines: budgets }, null, 2),
  );
  for (const [name, text] of Object.entries(proposals))
    writeFileSync(join(root, "docs/proposals", name), text);
  for (const args of [
    ["init", "-q"],
    ["add", "-A"],
    ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "fixture"],
  ]) {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
  }
  return root;
};
const readAt = (root, path) => readFileSync(join(root, path), "utf8");

test("promote: an unnumbered proposal takes the next free number", () => {
  const root = fixture(
    "- 0001 [First](0001-first.md)\n",
    { "some-idea.md": "# Some idea\n\nBody.\n" },
    { "docs/proposals/some-idea.md": 60 },
  );
  const [p] = promote(["docs/proposals/some-idea.md"], root);

  assert.equal(p.n, 2);
  assert.equal(p.dest, "docs/adr/0002-some-idea.md");
  assert.equal(
    existsSync(join(root, "docs/proposals/some-idea.md")),
    false,
    "the proposal is moved, not copied",
  );
  assert.equal(
    readAt(root, p.dest),
    "# ADR 0002 — Some idea\n\nBody.\n",
    "the H1 gains the number and the body is untouched",
  );
  assert.equal(
    readAt(root, INDEX),
    "- 0001 [First](0001-first.md)\n- 0002 [Some idea](0002-some-idea.md)\n",
  );
  assert.deepEqual(
    JSON.parse(readAt(root, "docs/budgets.json")).lines,
    { "docs/adr/0002-some-idea.md": 60 },
    "the budget key follows the file",
  );
  assert.equal(
    spawnSync("git", ["status", "--porcelain"], {
      cwd: root,
      encoding: "utf8",
    }).stdout.includes("??"),
    false,
    "the move is staged, so the follow-up commit sees a rename",
  );
});

test("promote: a claimed number fills its reserved line in place", () => {
  const root = fixture(
    "- 0001 [First](0001-first.md)\n- 0002 reserved — held for the Part D write-up\n- 0003 [Third](0003-third.md)\n",
    {
      "0002-part-d-signals.md": "# Part D signals\n\nBody.\n",
    },
  );
  const [p] = promote(["docs/proposals/0002-part-d-signals.md"], root);

  assert.equal(
    p.n,
    2,
    "the claim is honoured rather than the next free number, 4",
  );
  assert.equal(
    readAt(root, INDEX),
    "- 0001 [First](0001-first.md)\n- 0002 [Part D signals](0002-part-d-signals.md)\n- 0003 [Third](0003-third.md)\n",
    "the reserved line is replaced where it sits, not appended below 0003",
  );
  assert.equal(
    readAt(root, "docs/adr/0002-part-d-signals.md").split("\n", 1)[0],
    "# ADR 0002 — Part D signals",
  );
});

test("promote: a number that is not reserved is refused", () => {
  const root = fixture("- 0001 [First](0001-first.md)\n", {
    "0009-jumped-the-queue.md": "# Jumped the queue\n",
  });
  assert.throws(
    () => promote(["docs/proposals/0009-jumped-the-queue.md"], root),
    /ADR 0009 is not reserved/,
  );
  assert.equal(
    existsSync(join(root, "docs/proposals/0009-jumped-the-queue.md")),
    true,
    "the refusal leaves the tree alone",
  );
});

test("promote: a proposal with no H1 is refused", () => {
  const root = fixture("- 0001 [First](0001-first.md)\n", {
    "no-title.md": "Body with no heading.\n",
  });
  assert.throws(
    () => promote(["docs/proposals/no-title.md"], root),
    /no H1 on the first line/,
  );
});

test("promote: promoting an already-moved proposal is a no-op", () => {
  const root = fixture("- 0001 [First](0001-first.md)\n", {
    "some-idea.md": "# Some idea\n",
  });
  promote(["docs/proposals/some-idea.md"], root);
  const before = readAt(root, INDEX);

  assert.deepEqual(
    promote(["docs/proposals/some-idea.md"], root),
    [],
    "a second label event promotes nothing",
  );
  assert.equal(
    readAt(root, INDEX),
    before,
    "and appends no second line for it",
  );
});

test("promote: several proposals in one merge take consecutive numbers", () => {
  // The next free number runs past the highest allocated, reserved included,
  // because the register is a gapless run -- so a claim on 0002 and two new
  // proposals come out 0003 and 0004, not 0002's neighbours.
  const root = fixture(
    "- 0001 [First](0001-first.md)\n- 0002 reserved — held\n",
    {
      "a.md": "# A\n",
      "0002-b.md": "# B\n",
      "c.md": "# C\n",
    },
  );
  const promoted = promote(
    ["docs/proposals/a.md", "docs/proposals/0002-b.md", "docs/proposals/c.md"],
    root,
  );

  assert.deepEqual(
    promoted.map((p) => p.n),
    [3, 2, 4],
    "the claim takes 0002 and the unnumbered ones take 0003 and 0004",
  );
  assert.equal(
    readAt(root, INDEX),
    "- 0001 [First](0001-first.md)\n- 0002 [B](0002-b.md)\n- 0003 [A](0003-a.md)\n- 0004 [C](0004-c.md)\n",
  );
});

test("promote: an H1 that already carries its number is not doubled", () => {
  const root = fixture(
    "- 0001 [First](0001-first.md)\n- 0002 reserved — held\n",
    { "0002-part-d.md": "# ADR 0002 — Part D\n\nBody.\n" },
  );
  const [p] = promote(["docs/proposals/0002-part-d.md"], root);
  assert.equal(readAt(root, p.dest).split("\n", 1)[0], "# ADR 0002 — Part D");
});

test("promote: a bad claim mid-batch moves nothing at all", () => {
  // The batch is one merge's worth of proposals. Validation runs over all of
  // them before the first git mv, so a refusal leaves a tree that still
  // passes the bijection guard above and a retry that still has work to do.
  const root = fixture("- 0001 [First](0001-first.md)\n", {
    "a.md": "# A\n",
    "0009-jumped.md": "# Jumped\n",
  });
  assert.throws(
    () =>
      promote(["docs/proposals/a.md", "docs/proposals/0009-jumped.md"], root),
    /ADR 0009 is not reserved/,
  );

  assert.equal(
    existsSync(join(root, "docs/proposals/a.md")),
    true,
    "the earlier proposal is not moved out from under the refusal",
  );
  assert.equal(
    existsSync(join(root, "docs/adr/0002-a.md")),
    false,
    "and nothing lands in docs/adr without a register line",
  );
  assert.equal(readAt(root, INDEX), "- 0001 [First](0001-first.md)\n");
  assert.deepEqual(
    promote(["docs/proposals/a.md"], root).map((p) => p.n),
    [2],
    "so the retry can still promote it",
  );
});
