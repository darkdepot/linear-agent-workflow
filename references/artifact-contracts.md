# Artifact contracts

This index is the stable entry point for the four bounded Linear artifact
contracts. A contract owns artifact-specific normative behavior; shared policy
continues to live in the linked `references/` documents, and presentation shape
continues to live in `templates/`.

- [project](contracts/project.md)
- [prd](contracts/prd.md)
- [tech-spec](contracts/tech-spec.md)
- [issue](contracts/issue.md)

Rule IDs are permanent addresses. New rules receive new IDs; removed rules stay
reserved rather than being renumbered. The parity ledger maps every normative
purpose, routing, rule, lifecycle/status, and finish-check statement in the four
source skills to exactly one contract rule. `Read first` lists are dependency
metadata, not artifact rules, and are intentionally outside the ledger.

The consumers column names the stage skills and guards that own later adoption.
In A1 these are declared consumers only: no skill is rewired and runtime
behavior remains unchanged.

## Project parity

| Old rule | Rule ID | Named consumers |
| --- | --- | --- |
| `skills/mono-project/SKILL.md:3` | `PC-001` | `mono-idea`, `mono-handoff`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-project/SKILL.md:8` | `PC-002` | `mono-idea`, `mono-handoff`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-project/SKILL.md:20` | `PC-003` | `mono-idea`, `mono-handoff`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-project/SKILL.md:21` | `PC-004` | `mono-idea`, `mono-handoff`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-project/SKILL.md:22` | `PC-005` | `mono-idea`, `mono-handoff`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-project/SKILL.md:23` | `PC-006` | `mono-idea`, `mono-handoff`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-project/SKILL.md:24` | `PC-007` | `mono-idea`, `mono-handoff`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-project/SKILL.md:25` | `PC-008` | `mono-idea`, `mono-handoff`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-project/SKILL.md:26` | `PC-009` | `mono-idea`, `mono-handoff`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-project/SKILL.md:27` | `PC-010` | `mono-idea`, `mono-handoff`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-project/SKILL.md:28` | `PC-011` | `mono-idea`, `mono-handoff`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-project/SKILL.md:29` | `PC-012` | `mono-idea`, `mono-handoff`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-project/SKILL.md:33` | `PC-013` | `mono-idea`, `mono-handoff`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-project/SKILL.md:34` | `PC-014` | `mono-idea`, `mono-handoff`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-project/SKILL.md:35` | `PC-015` | `mono-idea`, `mono-handoff`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-project/SKILL.md:36` | `PC-016` | `mono-idea`, `mono-handoff`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-project/SKILL.md:37` | `PC-017` | `mono-idea`, `mono-handoff`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-project/SKILL.md:41` | `PC-018` | `mono-idea`, `mono-handoff`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |

## PRD parity

| Old rule | Rule ID | Named consumers |
| --- | --- | --- |
| `skills/mono-prd/SKILL.md:3` | `PR-001` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:8` | `PR-002` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:10` | `PR-003` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:12` | `PR-004` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:25` | `PR-005` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:26` | `PR-006` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:27` | `PR-007` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:28` | `PR-008` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:29` | `PR-009` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:30` | `PR-010` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:31` | `PR-011` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:32` | `PR-012` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:33` | `PR-013` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:34` | `PR-014` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:35-37` | `PR-015` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:38` | `PR-016` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:39` | `PR-017` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:40` | `PR-018` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:41` | `PR-019` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:42` | `PR-020` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:43` | `PR-021` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:44` | `PR-022` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:45` | `PR-023` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:46` | `PR-024` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:47` | `PR-025` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:51` | `PR-026` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:52` | `PR-027` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:53` | `PR-028` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:54` | `PR-029` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:55` | `PR-030` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:56` | `PR-031` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-prd/SKILL.md:57` | `PR-032` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |

## Tech Spec parity

| Old rule | Rule ID | Named consumers |
| --- | --- | --- |
| `skills/mono-spec/SKILL.md:3` | `TS-001` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:8` | `TS-002` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:10` | `TS-003` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:12` | `TS-004` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:25` | `TS-005` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:26` | `TS-006` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:27` | `TS-007` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:28` | `TS-008` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:29` | `TS-009` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:30` | `TS-010` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:31` | `TS-011` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:32` | `TS-012` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:33` | `TS-013` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:34` | `TS-014` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:35` | `TS-015` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:36` | `TS-016` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:37` | `TS-017` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:38` | `TS-018` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:39` | `TS-019` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:40` | `TS-020` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:41` | `TS-021` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:42` | `TS-022` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:43` | `TS-023` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:44` | `TS-024` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:45` | `TS-025` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:46` | `TS-026` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:47` | `TS-027` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:48` | `TS-028` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:52` | `TS-029` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:53` | `TS-030` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:54` | `TS-031` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:55` | `TS-032` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:56` | `TS-033` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:57` | `TS-034` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-spec/SKILL.md:58` | `TS-035` | `mono-handoff`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |

## Issue parity

| Old rule | Rule ID | Named consumers |
| --- | --- | --- |
| `skills/mono-issue/SKILL.md:3` | `IS-001` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:8` | `IS-002` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:10` | `IS-003` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:12` | `IS-004` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:14` | `IS-005` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:27` | `IS-006` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:28` | `IS-007` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:29` | `IS-008` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:30` | `IS-009` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:31` | `IS-010` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:32` | `IS-011` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:33` | `IS-012` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:34` | `IS-013` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:35` | `IS-014` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:36` | `IS-015` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:37` | `IS-016` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:38` | `IS-017` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:39` | `IS-018` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:40` | `IS-019` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:41` | `IS-020` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:42` | `IS-021` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:43` | `IS-022` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:44` | `IS-023` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:45` | `IS-024` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:46` | `IS-025` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:47` | `IS-026` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:48` | `IS-027` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:49` | `IS-028` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:53` | `IS-029` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:54` | `IS-030` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:55` | `IS-031` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:56` | `IS-032` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:57` | `IS-033` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
| `skills/mono-issue/SKILL.md:58` | `IS-034` | `mono-handoff`, `mono-issue-intake`, `mono-implement`, `mono-preflight`, `mono-ship`, `mono-check`, `mono-review`, `scripts/lint-mono-artifacts.mjs` |
