---
name: linear-ship
description: Use when shipping a Linear-tracked change through the configured PR creation, review feedback, land/deploy, and Linear closeout workflow.
---

# Linear Ship

Use this wrapper around the consumer repo's configured ship, review feedback, and land/deploy workflows.

Read first:

1. `AGENTS.md`
2. `skills/linear-check/SKILL.md`
3. `references/artifact-rules.md`
4. `references/install.md`
5. `references/ship-feedback-loop.md`
6. `templates/ship-output.md`

Workflow:

1. `prepare`: fetch the Linear Issue, Project, PRD, and Tech Spec.
2. `prepare`: run or report `linear-check pre-ship`.
3. `create-pr`: gather Project, PRD, Tech Spec, and Issue context for the configured ship workflow.
4. `create-pr`: delegate actual PR creation to the configured Ship workflow.
5. `create-pr`: after PR creation, record PR number, PR URL, and latest head SHA; update the Linear Issue to `In Review` and add a PR chip.
6. `stabilize-review`: when a Review feedback workflow is configured, run the feedback loop in `references/ship-feedback-loop.md`.
7. `land-deploy`: when the review loop is green and a Land workflow is configured, delegate merge/deploy to that workflow.
8. `linear-closeout`: after merge/user acceptance, update the Linear Issue to `Done`.
9. `linear-closeout`: run or report `linear-check post-ship`.
10. Return the concise report in `templates/ship-output.md`.

Rules:

- Do not create PRs directly.
- Do not fork or reimplement the consumer repo's ship workflow.
- Do not resolve review feedback directly when a configured resolver exists; delegate to it.
- Do not merge or deploy directly; delegate to the configured land workflow.
- Do not use GitHub Issues as requirements.
- Sync material drift back to Linear before claiming completion.
- Use Linear comments for user review acceptance, not Project Updates.
- If the Review feedback workflow is absent, stop after PR creation/status sync with final verdict `pr-created`.
- If the Land workflow is absent, stop after review stabilization with final verdict `green`.
- Stop with `needs-human` when feedback asks for product, UX, business, or scope decisions.
