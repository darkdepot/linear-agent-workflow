# Worker Dispatch Prompt

Template for spawning one worker session per Issue from `linear-orchestrate`.
Fill every placeholder. The worker must be able to start immediately with no
Linear access: the snapshot below is its whole world until Linear MCP is up.

## Assignment

- Issue: <ISSUE-KEY> — <title>
- Stage skill: <linear-implement | linear-preflight | linear-ship>
- Worktree/branch: <path / branch>
- Worker session name: `<ISSUE-KEY>: <stage>`
- Chip title (user-visible, Russian): `<ISSUE-KEY>: <стадия по-русски>`

## Context Snapshot

- Project brief: <full text>
- PRD: <full text, or the sections relevant to this Issue>
- Tech Spec: <full text, or the contracts relevant to this Issue>
- Issue: <full Issue body, verbatim>
- Decisions so far: <user decisions and «Решил сам:» entries relevant to this
  Issue, one line each>

## AFK Contract

- Do not ask the user. For a mid-stage question that blocks progress: write a
  mailbox report with status `needs-decision`, include your own
  recommendation, and stop. Report stage-terminal exits (including
  `needs-human` and `drift-candidate`) with the stage's own status verbatim.
- One Issue only; no sub-workers; do not manage other sessions; do not touch
  files owned by other Issues.
- Never write to Linear yourself, even when Linear is available. Produce
  every stage-required Linear mutation (comments, status moves, certificates)
  in its required shape, but deliver it through `linear_mutations_pending` in
  your report; the orchestrator applies it.
- Follow the stage skill exactly, including its exit statuses and gates.

## Mailbox

- Write the exit report to
  `~/.linear-agent-workflow/orchestrator/<product>/reports/<ISSUE-KEY>-<stage>.json`
  following `templates/orchestrator-report.md`.
- Write the report on stage completion, on any blocker, and before stopping
  for any other reason.

## Authorization

- Allowed: <stage-appropriate scope, e.g. local code changes and verification;
  push and PR creation only for the ship stage>
- Not allowed: any direct Linear writes, merge, deploy, Issue closeout — the
  orchestrator owns those.
