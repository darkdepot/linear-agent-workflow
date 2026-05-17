---
name: linear-ship
description: Use when shipping a Linear-tracked change so Linear context is checked before and after the configured ship workflow.
---

# Linear Ship

Use this wrapper around the consumer repo's configured ship workflow.

Read first:

1. `AGENTS.md`
2. `skills/linear-check/SKILL.md`
3. `references/artifact-rules.md`
4. `references/install.md`

Workflow:

1. Fetch the Linear Issue, Project, PRD, and Tech Spec.
2. Run or report `linear-check pre-ship`.
3. Gather Project, PRD, Tech Spec, and Issue context for the ship workflow.
4. Delegate actual PR creation to the configured ship workflow.
5. After PR creation, update the Linear Issue to `In Review` and add a PR chip.
6. After merge/user acceptance, update the Linear Issue to `Done`.
7. Run or report `linear-check post-ship`.

Rules:

- Do not create PRs directly.
- Do not fork or reimplement the consumer repo's ship workflow.
- Do not use GitHub Issues as requirements.
- Sync material drift back to Linear before claiming completion.
- Use Linear comments for user review acceptance, not Project Updates.
