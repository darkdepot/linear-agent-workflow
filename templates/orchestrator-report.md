# Worker Report And Ledger Shapes

Machine-facing shapes for the `linear-orchestrate` mailbox. The worker report
JSON is English only. Ledger entries are English except the fixed domain term
«Решил сам:» / `решил сам` from `references/orchestration.md`. No secrets in
either shape.

## Worker Report

Path: `~/.linear-agent-workflow/orchestrator/<product>/reports/<ISSUE-KEY>-<stage>.json`

```json
{
  "issue": "<ISSUE-KEY>",
  "stage": "<linear-implement | linear-preflight | linear-ship>",
  "status": "<implemented-needs-preflight | ready | green | blocked | needs-decision | needs-human | drift-candidate | timed-out | scope-drift-needs-handoff>",
  "branch": "<branch>",
  "changed_files": ["<path>"],
  "tests": { "run": "<commands>", "result": "<outcome>" },
  "question": "<question text, or null>",
  "recommendation": "<the worker's own recommended answer, or null>",
  "linear_mutations_pending": ["<comment/status text the worker could not apply>"],
  "certificate": "<preflight certificate or linear-ship green certificate text, or null>",
  "notes": "<runtime substitutions or constraints the orchestrator must know, or null>",
  "next": "<linear-preflight | linear-ship | linear-deploy | null>"
}
```

`notes` is optional free text for runtime facts the fixed fields cannot
carry — e.g. an engine or workflow substitution because the configured skill
was not available in the worker runtime. It never replaces a status.

Status semantics:

- Stage-terminal statuses reuse the stage skill's exit statuses verbatim:
  `implemented-needs-preflight` (implement), `ready` (preflight), `green`
  (ship green certificate), `blocked`, `needs-human`, `drift-candidate`
  (preflight), `timed-out` (ship), `scope-drift-needs-handoff`. Report the
  stage's own status — the orchestrator decides whether to answer, escalate
  to the user, or respawn.
- `needs-decision` is mailbox-only: the worker is paused mid-stage on a
  question and has included its own recommendation. The orchestrator answers
  (technical) or escalates (Always-ask) and then continues the same worker.

## Worker Registry

Path: `~/.linear-agent-workflow/orchestrator/<product>/workers.json`

Orchestrator-owned runtime metadata; workers never read or write it. One
entry per Issue, updated on spawn, stage advance, and respawn. The registry
is what lets a fresh orchestrator session rebind to surviving `codex-cli`
threads (`codex exec resume <thread_id>`) instead of respawning them.

```json
{
  "<ISSUE-KEY>": {
    "transport": "<codex-cli | claude-code-desktop | fallback>",
    "thread_id": "<codex thread id, or null>",
    "worktree": "<absolute path>",
    "branch": "<branch>",
    "stage": "<linear-implement | linear-preflight | linear-ship>",
    "spawned_at": "<ISO 8601>",
    "last_activity_at": "<ISO 8601>",
    "log": "<absolute path to the worker's JSONL log, or null>"
  }
}
```

## Ledger Entry

Path: `~/.linear-agent-workflow/orchestrator/<product>/ledger.md`

```text
## <YYYY-MM-DD>
- <HH:MM> <ISSUE-KEY> dispatched: <stage>, worker `<ISSUE-KEY>: <stage>`
- <HH:MM> <ISSUE-KEY> решил сам: <decision> (<one-line reason>)
- <HH:MM> <ISSUE-KEY> user decision: <decision>
- <HH:MM> <ISSUE-KEY> landed/deployed: <PR/SHA + evidence>
- <HH:MM> blocker: <exact blocker and what is needed>
```

Only the orchestrator writes the ledger. Routine polling is never recorded.
