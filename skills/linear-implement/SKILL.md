---
name: linear-implement
description: Use when starting or running implementation from approved Linear Issue(s) after handoff.
---

# Linear Implement

Use this skill to own Delivery Start and implementation execution from approved Linear Issue(s).

`linear-implement` starts only after `linear-handoff` produced current Project, PRD, Tech Spec, and approved execution Issue(s). It verifies implementation-start approval, moves the Project to Delivery when ready, selects the implementation engine, runs implementation from the approved Issue(s), and exits into `linear-preflight`.

Read first:

1. `AGENTS.md`
2. `skills/linear-check/SKILL.md`
3. `skills/linear-review/SKILL.md`
4. `skills/linear-preflight/SKILL.md`
5. `references/artifact-rules.md`
6. `references/artifact-quality.md`
7. `references/artifact-intake.md`
8. `references/readiness-gates.md`
9. `references/execution-quality.md`
10. `references/lifecycle.md`
11. `references/questioning.md`
12. `references/human-friendly-output.md`

When to use:

- The user says "implement", "start implementation", "build this", or equivalent after approved Linear Issue(s) exist.
- `linear-handoff` completed Issue creation and the user explicitly approved starting now.
- A fresh implementation agent receives approved Linear Issue(s) and needs a bounded start workflow.

Do not use:

- Before Project, PRD, Tech Spec or explicit no-spec exception, and approved Issue(s) are current.
- From raw `/office-hours`, `/brainstorming`, review plans, local markdown plans, or chat history alone.
- For PR creation, review-loop stabilization, deploy, or closeout. PR creation/review belongs to `linear-ship`; deploy and closeout belong to `linear-deploy`.

Inputs to gather:

- Fresh Linear Project, PRD, Tech Spec, approved Issue(s), resources, comments, and review/check state.
- Handoff artifact intake summary when recorded in Linear comments, resources, or package notes.
- Package approval comment and implementation-start approval, if already recorded.
- Project config, including optional `Implementation workflow`.
- Minimal repo context needed to understand commands, conventions, and validation.
- Current git branch, worktree state, and remote/base branch status.

Workflow states:

1. `start-checkpoint`
   - Fetch fresh Linear context.
   - Verify approved execution Issue(s) exist.
   - Verify or obtain explicit implementation-start approval.
   - Confirm required `linear-review handoff` findings are resolved, accepted, or explicitly deferred.
   - Confirm delivery prerequisites are present before changing lifecycle state.
   - Move the Project to Delivery only after approval and prerequisites are explicit.
   - Run or report `linear-check delivery` after the Project is in Delivery.
   - Inspect git state and create or switch to a safe implementation branch when needed.
   - Record a human Linear comment that implementation started.
2. `execute`
   - Select the implementation engine.
   - Implement only the approved one-PR Issue slice unless the Issue plan explicitly supports parallel slices.
   - Keep product discovery closed. Ask only for product, UX, business, external access, dirty-worktree, or risk decisions that block safe execution.
   - Run targeted validation as the implementation progresses.
3. `exit`
   - Return exactly one terminal status.
   - Record changed files, tests/checks run, tests/checks not run, branch/dirty state, drift summary, Linear comment outcome, and next workflow.

Implementation engine selection:

- Use the configured `Implementation workflow` when present and not `None`.
- If the field is missing or `None`, stay backward-compatible and default to this selection table:
  - Compound `ce-work` for general implementation from an approved Issue or plan.
  - Superpowers `executing-plans` when a concrete written plan should be executed without rediscovery.
  - Superpowers `test-driven-development` when acceptance can be encoded as tests or a bug reproduction first.
  - Superpowers `systematic-debugging` when the Issue is a bug or performance symptom with a repro loop.
  - Superpowers `subagent-driven-development` only when slices are independent and file/surface boundaries are explicit.
  - gstack `qa` after implementation when browser, product, or manual-surface verification is the main risk.

Exit statuses:

- `implemented-needs-preflight`: code changes exist and the next workflow is `linear-preflight`.
- `blocked`: required Linear context, repo state, tooling, permissions, or validation are unavailable.
- `scope-drift-needs-handoff`: implementation discovered material scope drift that must be reflected in Linear before continuing.
- `needs-human`: a product, UX, business, external access, dirty-worktree, or risk decision is required.

Rules:

- Keep Linear as durable truth. Local discovery artifacts are evidence only after `linear-handoff` translated them into Linear.
- Do not re-run product discovery unless Linear artifacts are missing or contradictory.
- Do not start from local discovery artifacts alone.
- Do not treat package approval as implementation-start approval unless that approval is explicit.
- Do not move the Project to Delivery before approved Issue(s) exist.
- Do not pass delivery readiness with only PRD and Tech Spec.
- Do not create PRs directly from `linear-implement`.
- Do not run or claim `linear-review pre-ship` or `linear-check pre-ship`; those belong to `linear-ship`.
- If material drift appears, stop as `scope-drift-needs-handoff`.
- Keep Linear-facing comments in the project config language; use Russian when no project config is present.

Implementation-start comment shape:

```text
Начал реализацию по <Issue keys>.

Проверил: <Project, PRD, Tech Spec, Issue, approval/review/check state>.
Источник правды: Linear package, не raw discovery chat и не local scratch docs.
Объем: <approved one-PR slice>.
Workflow реализации: <configured workflow or default selection and why>.
План проверки: <targeted tests/checks/manual surfaces expected later>.
Пока не проверено: <browser/manual/PR review/deploy/etc.>.
```

Final response must include:

- Status: one of `implemented-needs-preflight`, `blocked`, `scope-drift-needs-handoff`, or `needs-human`.
- Issue IDs implemented.
- Sources read.
- Branch and dirty/committed state.
- Changed files.
- Tests/checks run and not run.
- Drift summary against Project, PRD, Tech Spec, and Issue.
- Linear comment outcome.
- Next workflow recommendation, usually `linear-preflight` when implementation completed.
