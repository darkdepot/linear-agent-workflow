---
name: linear-check
description: Use when checking Linear Project, PRD, Tech Spec, Issue, or ship readiness before moving a workflow to the next stage.
---

# Linear Check

Use this skill as a report-only, best-effort transition gate. It inspects Linear context and reports whether the workflow can move forward. It does not provide deterministic proof and must not rewrite artifacts silently.

Read first:

1. `AGENTS.md`
2. `references/artifact-rules.md`
3. `references/lifecycle.md`
4. `templates/check-output.md`

Modes:

- `idea`
- `discovery`
- `delivery`
- `issue`
- `pre-ship`
- `post-ship`
- `adapter`

Rules:

- Fetch fresh Linear Project, PRD, Tech Spec, and Issue state before judging readiness.
- Treat Linear Project, PRD, Tech Spec, and Issue as durable source of truth.
- Treat GitHub as branch, PR, review, CI, and merge history only.
- Return `PASS` only when required state was inspected and no blocking drift was found.
- Return `BLOCKED` when artifacts are missing, stale, contradictory, over-scoped, or use raw URLs/obsolete PR chips where Linear chips should be used.
- Do not edit Project, documents, or Issues unless the user explicitly asked to sync or fix them.
- Do not use Project Updates as a required gate; use Linear comments for user review acceptance.
- When checking adapter status, run or report the dedicated install/check script output. Do not install, update, or rewrite adapters from `linear-check`.

Mode checks:

- `idea`: Project exists in Idea, contains strengthened brief, has no premature PRD/Tech Spec/Issue, and recommends `/brainstorming` or `/office-hours`.
- `discovery`: Project is in Discovery, PRD or PRD-lite exists, user review handoff is clear, and PRD is product truth rather than notes.
- `delivery`: Project is in Delivery, PRD is current, Tech Spec or explicit no-spec exception exists, and active Project documents are only PRD and Tech Spec.
- `issue`: Issue belongs to the Project, is a one-PR contract, has required sections, includes chips plus context snapshot, and has no attached PRD/Tech Spec docs.
- `pre-ship`: branch/diff matches Issue, Linear artifacts are not stale, scope drift is reflected or accepted, and no durable body contains obsolete PR chips or raw PR URLs.
- `post-ship`: Issue has PR chip/status, `In Review` after PR creation, `Done` after merge/user acceptance, and final drift is synced back to Linear.
- `adapter`: generated wrappers are present, mode matches the repo role, consumer lockfile pins an immutable commit when required, and adapter drift is reported from `scripts/check.sh`.

Output:

- Use `templates/check-output.md`.
- Keep output concise.
- Include the exact mode in the status line.
