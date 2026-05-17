# Linear Agent Workflow

Reusable Linear workflow skills for AI coding agents.

The workflow keeps Linear as the source of truth from raw idea to shipped PR:

```text
Idea -> Discovery -> Delivery -> Issue -> Ship
```

GitHub remains the branch, PR, review, CI, and merge-history surface. Linear owns the Project, PRD, Tech Spec, Issue contract, review acceptance, and drift notes.

## Skills

- `linear-idea`: raw idea intake, AskQuestion mini-grill, Project in Idea.
- `linear-project`: Project body, status, lifecycle, and chips.
- `linear-prd`: PRD after discovery, or PRD-lite after explicit skip.
- `linear-spec`: Tech Spec after engineering review or lightweight engineering pass.
- `linear-issue`: one-PR Issue from Project + PRD + Tech Spec/exception.
- `linear-check`: report-only transition readiness checks.
- `linear-ship`: wrapper around a configured project ship workflow.

## Install In A Consumer Repo

1. Copy or symlink `skills/linear-*` into the consumer repo's agent skill directory.
2. Keep `references/` and `templates/` available next to the installed skills.
3. Add a short consumer-repo instruction that Linear Project, PRD, Tech Spec, and Issue are the source of truth.
4. Configure the ship workflow used by `linear-ship`.

For Zeni, the configured ship workflow is gstack `ship`.

## Principles

- Reusable first: consumer repos should not fork the workflow logic.
- Linear first: durable requirements live in Linear.
- One issue by default: split only into vertical slices with dependencies.
- No silent sync: report drift before moving stages.
- Report-only checks: `PASS` means inspected and no blocking drift found, not deterministic proof.

## Validation

```bash
git diff --check
```
