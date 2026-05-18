---
name: linear-review
description: Use when reviewing Linear Project, PRD, Tech Spec, Issue, or pre-ship readiness quality without mutating Linear artifacts.
---

# Linear Review

Use this skill to review the quality of Linear workflow artifacts before handoff, delivery, issue creation, or ship.

`linear-review` is report-only. It finds drift, gaps, and decisions. It must not create, update, delete, or silently repair Project, PRD, Tech Spec, Issue, or PR state.

Read first:

1. `AGENTS.md`
2. `references/artifact-rules.md`
3. `references/artifact-quality.md`
4. `references/readiness-gates.md`
5. `references/review-rubric.md`
6. `references/human-friendly-output.md`
7. `templates/review-output.md`

Modes:

- `handoff`
- `delivery`
- `issue`
- `pre-ship`
- `artifact`

Workflow:

1. Fetch fresh Linear Project, PRD, Tech Spec, and Issue state relevant to the mode.
2. Fetch PR, branch, review, and merge state only when running `pre-ship`.
3. Read consumer config for Linear-facing language and configured ship/review/land workflows.
4. Classify risk using `references/readiness-gates.md`.
5. Decide whether the review gate is `required` or `advisory`.
6. Apply the rubric in `references/review-rubric.md`.
7. Return the report in `templates/review-output.md`.
8. Recommend the next owner workflow.

Rules:

- Do not use `PASS`, `FAIL`, or `BLOCKED` as the main review status. Those belong to `linear-check`.
- Translate the review verdict into a short human meaning before recommending the next workflow.
- Do not mutate Linear artifacts.
- Do not record Linear comments.
- Do not create Issues or PRs.
- Do not replace `linear-check`; run or recommend `linear-check` for readiness status after accepted fixes land.
- Keep Linear-facing report content in the consumer config language; use Russian when no consumer config is present.
- Keep repo skill instructions and docs in English.
- Treat Project, PRD, Tech Spec, and Issue as source of truth.
- Treat GitHub as PR, review, CI, deploy, and merge history only.
- Include a compact "checked / not checked" boundary. For `pre-ship`, distinguish inspected PR/review/CI state from manual QA, browser QA, deployment verification, or production smoke that did not run.

Verdicts:

- `ready`: required review ran and no blocking findings remain.
- `advisory-ready`: review was advisory or tiny scope, and no blocking risk was found.
- `needs-fixes`: blocking findings, proposed fixes, or decisions should be handled before moving forward.
- `blocked`: required artifacts, permissions, or context are unavailable.

Owner workflows:

- `linear-handoff`: applies accepted Project, PRD, Tech Spec, and Issue-plan fixes before creating execution Issues.
- `linear-prd`: applies accepted PRD-only fixes when explicitly invoked.
- `linear-spec`: applies accepted Tech Spec-only fixes when explicitly invoked.
- `linear-issue`: applies accepted Issue-only fixes when explicitly invoked.
- `linear-ship`: handles pre-ship drift, PR/review state, and Linear closeout sync.
- Human decision: handles product, UX, business, or scope questions.

Hard boundaries:

- If the only issue is install or generated-skill drift, recommend `linear-check adapter`; use `scripts/sync-consumer.mjs --repo <consumer> --check` from upstream or `node .agents/linear-workflow-check.mjs` inside a generated consumer install.
- If the package is missing a required artifact, report `blocked` or `needs-fixes`; do not create it.
- If a review is advisory because the work is tiny, say why it is advisory and what would make it required.
- If scope is standard, deep, or risky, missing `linear-review` should be treated by `linear-check` as a readiness problem until review runs or an explicit exception is recorded.

Final response must include:

- Review verdict.
- Human meaning of the verdict.
- Mode.
- Risk classification.
- Whether the gate is required or advisory.
- Inspected artifacts.
- What was checked and what was not checked.
- Findings grouped as blocking findings, proposed fixes, decisions, and FYI.
- Recommended next workflow.
