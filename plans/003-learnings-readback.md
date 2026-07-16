# Plan 003: Close the learnings loop — workflow skills consult recorded learnings

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 889742b..HEAD -- skills/mono-implement/SKILL.md skills/mono-deploy/SKILL.md references/lifecycle.md templates/deploy-output.md scripts/validate-workflow.mjs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S-M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `889742b`, 2026-06-11

## Why this matters

The workflow records durable operational learnings at deploy time but never
reads them back. `mono-deploy` step 10 writes discoveries (deploy config
quirks, merge queue behavior, repo-specific verification commands) via
`gstack-learnings-log`, yet when the *next* Issue starts, `mono-implement`
re-discovers the same facts from scratch. The retrieval tool already exists
in the same toolkit (`gstack-learnings-search` — it reads
`~/.gstack/projects/<slug>/learnings.jsonl`, applies confidence decay, and
exits 0 silently when no learnings file exists), so closing the loop is a
markdown-only change to two skills plus their validator pins. The result:
every implementation and deploy run starts with the accumulated operational
knowledge of previous runs, advisory-only, with graceful degradation when the
helper is absent.

## Current state

- `skills/mono-deploy/SKILL.md:37` — the write side:

  ```
  10. `learn`: record durable operational discoveries with `gstack-learnings-log` when they would save future time.
  ```

  and lines 46-51 ("Learning capture:") constrain it: use the gstack
  operational learning pattern, not interactive `/learn`; record only durable
  discoveries; include `Learnings recorded: <none|keys>` in the deploy report.

- `references/lifecycle.md:186` repeats the write-side requirement for the
  Deploy stage. Nothing anywhere in `skills/` or `references/` mentions
  reading learnings back (verified by grep at the planned-at commit: the only
  hits for "learnings" are the write side above and the output templates).

- `skills/mono-implement/SKILL.md:48-67` — the `start-checkpoint` /
  `execute` / `exit` workflow states. `start-checkpoint` currently ends with:

  ```
     - Inspect git state and create or switch to a safe implementation branch when needed.
     - Record a human Linear comment that implementation started.
  ```

  `Inputs to gather:` (lines 39-46) lists Linear context, project config, repo
  context, git state — no learnings.

- `skills/mono-implement/SKILL.md:100-111` — the Russian
  implementation-start comment shape (` ```text ... ``` ` block) ends with:

  ```
  План проверки: <targeted tests/checks/manual surfaces expected later>.
  Пока не проверено: <browser/manual/PR review/deploy/etc.>.
  ```

- `skills/mono-deploy/SKILL.md:28-31` — the `prepare` steps fetch Linear
  context and the ship certificate; they do not consult prior operational
  learnings before delegating the deploy.

- `templates/deploy-output.md` contains the pinned line
  `Learnings recorded:` (validator: `scripts/validate-workflow.mjs:220`).

- The helper toolkit (environment fact, verified on the maintainer's machine):
  `gstack-learnings-search` lives beside `gstack-learnings-log` in the gstack
  skill bin (`~/.claude/skills/gstack/bin/`). Usage:
  `gstack-learnings-search [--type TYPE] [--query KEYWORD] [--limit N] [--cross-project]`.
  It exits 0 silently when no learnings file exists. The skills must reference
  it by name the same way they reference `gstack-learnings-log` (by helper
  name, not absolute path — the runtime resolves it).

- Validator interplay: `scripts/validate-workflow.mjs` pins required
  substrings per skill in `validateAntiPatterns` — implement at lines 489-501,
  deploy at lines 526-537. Additive skill edits cannot break inclusion checks;
  this plan also *adds* pins so the new contract is guarded like the old ones.
  `scripts/lint-mono-artifacts.mjs` pins nothing about these files except
  `mustExclude("skills/mono-spec/SKILL.md", "mono-check delivery")` —
  irrelevant here.

- Repo conventions that apply: skill instructions in English; Linear-facing
  comment templates in Russian (`AGENTS.md:9-12`); every new behavioral
  contract gets a validator pin (observed pattern throughout
  `validateAntiPatterns`).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Full validation | `node scripts/validate-workflow.mjs` | exit 0, `Mono workflow validation passed (12 skills checked).` |
| Artifact smoke | `node scripts/lint-mono-artifacts.mjs` | exit 0 |
| Syntax | `node --check scripts/validate-workflow.mjs` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `skills/mono-implement/SKILL.md`
- `skills/mono-deploy/SKILL.md`
- `references/lifecycle.md`
- `templates/deploy-output.md`
- `scripts/validate-workflow.mjs` (only adding pins in `validateAntiPatterns`)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- `skills/mono-preflight/SKILL.md`, `skills/mono-ship/SKILL.md` — they
  could also consult learnings, but that's deferred (see Maintenance notes);
  keeping the first iteration to two consumption points limits prompt bloat.
- The write side: do not change how `mono-deploy` records learnings.
- `references/execution-quality.md`, all other skills, `VERSION`, `CHANGELOG.md`.

## Git workflow

- Branch: current worktree branch, or `advisor/003-learnings-readback`.
- Commit style: `feat: consult recorded learnings in implement and deploy`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the consultation step to `mono-implement`

Three edits to `skills/mono-implement/SKILL.md`:

a. In `Inputs to gather:` add a bullet after the project-config line:

   ```
   - Prior operational learnings for this repo through `gstack-learnings-search` when the helper is available.
   ```

b. In `start-checkpoint` (workflow state 1), insert a new bullet directly
   before `- Record a human Linear comment that implementation started.`:

   ```
   - Consult prior learnings with `gstack-learnings-search --limit 10` (optionally `--query`/`--type` scoped to the Issue topic) when the helper is available. Treat results as advisory context only, never as a gate; when the helper is unavailable or returns nothing, proceed and report that.
   ```

c. In the Russian implementation-start comment shape (the ` ```text ` block,
   lines 100-111), add one line before `Пока не проверено:`:

   ```
   Учтённые learnings: <none|ключи|helper unavailable>.
   ```

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 2: Add the consultation step to `mono-deploy`

Three edits to `skills/mono-deploy/SKILL.md`:

a. In the `Workflow:` numbered list, insert a new `prepare` step after step 4
   (the certificate-compatibility check) and renumber the remaining steps:

   ```
   5. `prepare`: consult prior operational learnings with `gstack-learnings-search --type operational --limit 10` when the helper is available; surface anything relevant to merge/deploy (deploy config quirks, merge queue behavior) before delegating. Advisory only.
   ```

b. In `Learning capture:` add a closing bullet:

   ```
   - Consult before writing: prior learnings are read in `prepare`; record only discoveries that are new relative to what was consulted.
   ```

c. In the `Deploy closeout shape` text block, add one line after
   `Learnings recorded: <none/list>`:

   ```
   Learnings consulted: <none/keys/helper unavailable>
   ```

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 3: Mirror the contract in `references/lifecycle.md` and the deploy template

a. `references/lifecycle.md` — in the Delivery-stage section that governs
   implementation (the section whose Required list covers implementation
   start; locate it by searching for the Delivery heading), add a Required
   bullet: prior learnings consulted through `gstack-learnings-search` when
   the helper is available, advisory only. In the Deploy section (near line
   186, which has the write-side bullet), add the matching read-side bullet.
   Match the existing terse bullet style of the file.

b. `templates/deploy-output.md` — add the line
   `Learnings consulted: <none/keys/helper unavailable>` adjacent to the
   existing `Learnings recorded:` line, matching the template's format.

**Verify**: `node scripts/validate-workflow.mjs` → exit 0 (the template pin
at `scripts/validate-workflow.mjs:216-221` checks `Learnings recorded:` is
present — your edit is additive).

### Step 4: Pin the new contract in the validator

In `scripts/validate-workflow.mjs`, `validateAntiPatterns`:

a. Add to the `implement` required-strings array (lines 490-499):
   `"gstack-learnings-search"` and `"Учтённые learnings:"`.

b. Add to the `deploy` required-strings array (lines 527-535):
   `"gstack-learnings-search"` and `"Learnings consulted:"`.

**Verify**: `node --check scripts/validate-workflow.mjs` → exit 0.
**Verify**: `node scripts/validate-workflow.mjs` → exit 0 (pins satisfied by
Steps 1-2).

### Step 5: Full suite

**Verify**: `node scripts/lint-mono-artifacts.mjs` → exit 0.
**Verify**: `node scripts/validate-workflow.mjs` → exit 0.
**Verify** (only if plan 001 landed): `node scripts/verify.mjs` → exit 0.

## Test plan

The validator pins added in Step 4 are the regression tests, following the
repo's established pattern (every behavioral contract is a pinned substring
in `validateAntiPatterns`). Negative check: temporarily revert one skill edit
locally (e.g. remove the `Учтённые learnings:` line), confirm
`node scripts/validate-workflow.mjs` now fails naming that pin, then restore
it and confirm it passes.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -c "gstack-learnings-search" skills/mono-implement/SKILL.md` ≥ 2
- [ ] `grep -c "gstack-learnings-search" skills/mono-deploy/SKILL.md` ≥ 1
- [ ] `grep -n "Учтённые learnings:" skills/mono-implement/SKILL.md` → 1 hit inside the comment shape block
- [ ] `grep -n "Learnings consulted:" skills/mono-deploy/SKILL.md templates/deploy-output.md` → 1 hit in each
- [ ] `grep -c "gstack-learnings-search" references/lifecycle.md` ≥ 2 (Delivery + Deploy sections)
- [ ] `node scripts/validate-workflow.mjs` exits 0
- [ ] `node scripts/lint-mono-artifacts.mjs` exits 0
- [ ] `git status --porcelain` shows changes only in the six in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live files (drift).
- `references/lifecycle.md` has no recognizable Delivery/Deploy sections
  matching the description in Step 3a.
- You are tempted to make the learnings consultation a *gate* (blocking
  status, required approval) — the design decision is advisory-only; a
  blocking design needs the maintainer.
- Renumbering the deploy workflow steps breaks any pinned validator string
  (check `scripts/validate-workflow.mjs:526-537` before and after — the
  pins are substrings like `"mono-check post-ship"` and do not include
  step numbers, so this should not happen; if it does, stop).

## Maintenance notes

- Deferred consciously: consultation points in `mono-preflight` (repo
  verification-command learnings) and `mono-ship` (review-loop learnings).
  Add them once the implement/deploy loop proves useful — same pattern, same
  advisory-only rule.
- The helper names (`gstack-learnings-log`, `gstack-learnings-search`) are
  runtime-environment dependencies, like `autoreview` in preflight. If the
  workflow ever targets runtimes without gstack, both the write and read side
  need a config-level abstraction in `.agents/mono-workflow.config.json` —
  that is a separate design decision.
- Reviewer should scrutinize: the advisory wording — nothing in the new text
  may imply the skill blocks or fails when learnings are missing.
