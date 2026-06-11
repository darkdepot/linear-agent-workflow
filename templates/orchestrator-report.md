# Worker Report And Ledger Shapes

Machine-facing shapes for the `linear-orchestrate` mailbox. English only; no
secrets in either shape.

## Worker Report

Path: `~/.linear-agent-workflow/orchestrator/<product>/reports/<ISSUE-KEY>-<stage>.json`

```json
{
  "issue": "<ISSUE-KEY>",
  "stage": "<linear-implement | linear-preflight | linear-ship>",
  "status": "<implemented-needs-preflight | ready | green | blocked | needs-decision | scope-drift-needs-handoff>",
  "branch": "<branch>",
  "changed_files": ["<path>"],
  "tests": { "run": "<commands>", "result": "<outcome>" },
  "question": "<question text, or null>",
  "recommendation": "<the worker's own recommended answer, or null>",
  "linear_mutations_pending": ["<comment/status text the worker could not apply>"],
  "certificate": "<preflight certificate or linear-ship green certificate text, or null>",
  "next": "<linear-preflight | linear-ship | linear-deploy | null>"
}
```

Status semantics:

- Stage-terminal statuses reuse the stage skill's exit statuses:
  `implemented-needs-preflight` (implement), `ready` (preflight), `green`
  (ship green certificate), `blocked`, `scope-drift-needs-handoff`.
- `needs-decision` is mailbox-only: the worker is paused on a question and has
  included its own recommendation. The orchestrator answers (technical) or
  escalates (Always-ask) and then continues the same worker.

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
