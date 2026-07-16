# Plan 002: Harden install-local.mjs failure modes and test its destructive paths

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 889742b..HEAD -- scripts/install-local.mjs scripts/validate-workflow.mjs`
> If either file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (plan 001 is nice-to-have, not required)
- **Category**: bug / tests
- **Planned at**: commit `889742b`, 2026-06-11

## Why this matters

`scripts/install-local.mjs` deletes and rewrites directories under the user's
skill root (`~/.codex/skills` by default). Three failure modes are currently
unguarded: a missing upstream `references/` or `templates/` directory crashes
the install *after* skill directories were already deleted and partially
rewritten; symlinks or other special files in copied directories are silently
dropped; and the lockfile write is not atomic. In addition, the two
genuinely destructive behaviors — stale-skill removal and corrupt-lockfile
handling — have no test fixtures. This plan adds fail-fast guards, an atomic
lockfile write, and fixtures in the existing functional harness.

## Current state

All excerpts are from `scripts/install-local.mjs` at commit `889742b`.

- `listFilesRecursive` (lines 85-100) silently returns `[]` for a missing
  directory:

  ```js
  function listFilesRecursive(rootDir) {
    if (!fs.existsSync(rootDir)) return [];
  ```

  so `plannedInstall` (lines 149-176) succeeds even when `references/` or
  `templates/` is missing — the crash happens later.

- `copyDirectory` (lines 109-121) throws `ENOENT` from `fs.readdirSync(source)`
  if the source is missing, and silently skips entries that are neither file
  nor directory (symlinks, sockets):

  ```js
  function copyDirectory(source, destination) {
    fs.rmSync(destination, { recursive: true, force: true });
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      const sourcePath = path.join(source, entry.name);
      const destinationPath = path.join(destination, entry.name);
      if (entry.isDirectory()) {
        copyDirectory(sourcePath, destinationPath);
      } else if (entry.isFile()) {
        fs.copyFileSync(sourcePath, destinationPath);
      }
    }
  }
  ```

- `sync` (lines 245-283) calls `copyDirectory(path.join(root, "references"), …)`
  and `copyDirectory(path.join(root, "templates"), …)` at lines 260-261 —
  *after* `fs.rmSync(file.dir, …)` and the SKILL.md write (lines 256-258). A
  missing source directory therefore leaves a half-written skill dir. The
  lockfile is written last (line 280) with a plain `fs.writeFileSync`.

- `readLock` (lines 206-214) returns `null` for a corrupt lockfile and pushes
  `Lockfile is corrupted: …` into `failures` when given the array. Note:
  `check()` (line 309) then *also* pushes `Missing lockfile: …` for the same
  null — a cosmetic double report you may fix in passing, but it is not the
  goal.

- Stale removal is correctly guarded by a generated-marker check
  (`isGeneratedLinearSkillDir`, lines 216-220; used by
  `removeStaleFromPreviousLock` lines 222-231 and
  `removeGeneratedStaleLinearDirs` lines 233-243) — directories without the
  `Installed from darkdepot/mono-agent-workflow` marker are never deleted.
  This is the behavior that must gain a test fixture; do not change its logic.

- The existing functional harness to extend is
  `scripts/validate-workflow.mjs`, function `validateLocalInstallBehavior`
  (lines 259-307). It installs into `fs.mkdtempSync(path.join(os.tmpdir(), …))`,
  uses `runNode([...])` to invoke scripts and `expectCommandFailure(label,
  callback, expectedText)` for negative cases, and cleans up in `finally`.
  Match this pattern exactly; do not introduce a test framework.

- **Important environment fact**: do NOT use
  `node scripts/install-local.mjs --check` (no `--skills-root`) as a
  verification gate. It compares against the maintainer's real
  `~/.codex/skills` pack and fails by design in a dirty worktree (the
  generated bodies embed the commit + `dirty` marker). All verification in
  this plan goes through `validate-workflow.mjs`'s temp-dir fixtures.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Syntax check | `node --check scripts/install-local.mjs` | exit 0 |
| Syntax check | `node --check scripts/validate-workflow.mjs` | exit 0 |
| Full validation incl. new fixtures | `node scripts/validate-workflow.mjs` | exit 0, `Mono workflow validation passed (12 skills checked).` |
| Artifact smoke | `node scripts/lint-mono-artifacts.mjs` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `scripts/install-local.mjs`
- `scripts/validate-workflow.mjs` (only `validateLocalInstallBehavior`)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- `scripts/project-config.mjs`, `scripts/lint-mono-artifacts.mjs`
- All markdown under `skills/`, `references/`, `templates/`, `examples/`
- The lockfile schema (`schemaVersion: 2`) and the generated-marker text —
  changing either invalidates every existing install.
- `VERSION`, `CHANGELOG.md`

## Git workflow

- Branch: current worktree branch, or `advisor/002-harden-install-local`.
- Commit style: `fix: harden install-local failure modes` (conventional, per `git log`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Fail fast on a broken upstream layout

In `scripts/install-local.mjs`, add a function `assertUpstreamLayout(root)`
that checks existence of `skills/`, `references/`, `templates/`, `AGENTS.md`
and exits with code 1 and message
`Upstream checkout is missing required path: <path>` (one line per missing
path) **before any filesystem mutation**. Call it at the top of both `sync()`
(before `fs.mkdirSync(skillsRoot, …)`, line 246) and `check()` (before
building the plan, line 287).

**Verify**: `node --check scripts/install-local.mjs` → exit 0.
**Verify**: `node scripts/validate-workflow.mjs` → exit 0 (existing fixtures still pass).

### Step 2: Make `copyDirectory` loud on special files

In the `for` loop of `copyDirectory`, add a final `else` branch:

```js
} else {
  throw new Error(`Unsupported entry type in ${source}: ${entry.name}`);
}
```

**Verify**: `node --check scripts/install-local.mjs` → exit 0.
**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 3: Write the lockfile atomically

In `sync()`, replace the direct write at line 280 with write-to-temp +
rename:

```js
const lockTmp = `${plan.lockPath}.tmp`;
fs.writeFileSync(lockTmp, `${JSON.stringify(manifest, null, 2)}\n`);
fs.renameSync(lockTmp, plan.lockPath);
```

**Verify**: `node scripts/validate-workflow.mjs` → exit 0 (the harness
installs and then `--check`s a temp root; a leftover `.tmp` file would fail
the unexpected-file check only inside skill dirs, but confirm no `.tmp`
remains: the rename removes it).

### Step 4: Add fixtures for corrupt lockfile and stale removal

Extend `validateLocalInstallBehavior` in `scripts/validate-workflow.mjs`,
after the existing edited-reference fixture (line 303), still inside the
`try` block:

a. **Corrupt lockfile**: re-run a clean install
   (`runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot])`),
   then overwrite the lockfile with invalid JSON:
   `fs.writeFileSync(path.join(skillsRoot, ".mono-agent-workflow.lock.json"), "not json\n")`,
   then `expectCommandFailure("install-local --check corrupt lockfile fixture",
   () => runNode([... "--check"]), "Lockfile is corrupted")`.

b. **Stale generated dir removed, user dir preserved**: create
   `mono-oldskill/SKILL.md` inside the temp root containing the line
   `Installed from darkdepot/mono-agent-workflow` (the generated marker),
   and `mono-mine/SKILL.md` containing just `# my own skill`. Run
   `runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot, "--remove-stale"])`.
   Then `fail(...)` unless: `mono-oldskill` no longer exists AND
   `mono-mine/SKILL.md` still exists. Finally remove `mono-mine`
   (`fs.rmSync(..., { recursive: true, force: true })`) and run a plain
   `--check` to confirm the root is clean again — note that `--check` flags
   unexpected `mono-*` dirs only via the lockfile comparison, so the
   explicit cleanup keeps later fixtures deterministic.

**Verify**: `node --check scripts/validate-workflow.mjs` → exit 0.
**Verify**: `node scripts/validate-workflow.mjs` → exit 0, still reports
`12 skills checked`.

### Step 5: Full suite

**Verify**: `node scripts/lint-mono-artifacts.mjs` → exit 0.
**Verify**: `node scripts/validate-workflow.mjs` → exit 0.
**Verify** (only if plan 001 landed): `node scripts/verify.mjs` → exit 0.

## Test plan

The new tests ARE Step 4 (fixtures a and b), written inside the repo's
existing harness, modeled directly on the edited-skill fixture at
`scripts/validate-workflow.mjs:290-295`. Cases covered: corrupt lockfile
detection in `--check`; `--remove-stale` deletes generated stale dirs and
preserves user-owned `mono-*` dirs.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `node scripts/validate-workflow.mjs` exits 0
- [ ] `grep -n "assertUpstreamLayout" scripts/install-local.mjs` shows the definition plus two call sites
- [ ] `grep -n "renameSync" scripts/install-local.mjs` shows the lockfile rename
- [ ] `grep -n "Unsupported entry type" scripts/install-local.mjs` shows the copyDirectory guard
- [ ] `grep -cn "expectCommandFailure" scripts/validate-workflow.mjs` count increased by ≥1 vs baseline (baseline: 5 call sites incl. definition)
- [ ] `git status --porcelain` shows changes only in `scripts/install-local.mjs`, `scripts/validate-workflow.mjs`, `plans/README.md`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts above don't match the live code (file drifted).
- The stale-removal fixture fails because `mono-mine` was deleted — that
  would mean the marker guard (`isGeneratedLinearSkillDir`) does not work as
  described; this is a real bug worth reporting, not patching ad hoc.
- You find yourself wanting to change the lockfile schema or
  `installedSkillBody` to make a fixture pass.
- A fixture needs more than one retry to stabilize (flaky temp-dir behavior).

## Maintenance notes

- If a future change adds new copied asset roots (beyond `references/` and
  `templates/`), `assertUpstreamLayout` must learn about them — keep its list
  next to the `plannedInstall` asset list.
- Reviewer should scrutinize: fixture (b) cleanup, so later fixtures in the
  same temp root are unaffected.
- Deferred deliberately: full transactional install (stage to temp dir, then
  swap). Recovery today is "re-run the installer", which is acceptable for a
  single-user tool; revisit only if the pack gains more consumers.
