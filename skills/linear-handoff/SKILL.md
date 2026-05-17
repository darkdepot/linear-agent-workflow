---
name: linear-handoff
description: Use after discovery or plan reviews to turn shaped work into Linear Project, PRD, Tech Spec, and execution Issue(s).
---

# Linear Handoff

Use this skill after discovery and reviews to turn shaped work into Linear-backed delivery.

`linear-handoff` is the bridge from thinking to execution. It packages discovery output into Linear source-of-truth artifacts, gets user approval, creates Issue contracts, and only then hands off to implementation.

Read first:

1. `AGENTS.md`
2. `skills/linear-project/SKILL.md`
3. `skills/linear-prd/SKILL.md`
4. `skills/linear-spec/SKILL.md`
5. `skills/linear-issue/SKILL.md`
6. `skills/linear-check/SKILL.md`
7. `references/artifact-rules.md`
8. `references/lifecycle.md`

When to use:

- After `/office-hours` or `/brainstorming`.
- After `/plan-design-review` or `/plan-eng-review`.
- When a discovery or review session produced an implementation plan and the user wants to proceed through Linear.
- When shaped context exists but Linear Project, PRD, Tech Spec, and Issues are not yet current.

Inputs to gather:

- Linear Project link or id from `linear-idea`.
- Current conversation discovery decisions.
- Relevant `/office-hours`, `/brainstorming`, `/plan-design-review`, and `/plan-eng-review` outputs.
- Existing Linear Project, PRD, Tech Spec, and Issues.
- Minimal repo context needed to verify scope, interfaces, and validation.

Plan Mode behavior:

- If invoked in Plan Mode, produce a new exit plan for Linear handoff only.
- Treat the current or previous discovery/review plan as input context.
- Do not mutate Linear.
- Do not create PRD, Tech Spec, or Issue yet.
- Do not change code, create branches, create PRs, or start implementation.
- Frame the exit plan positively as the next workflow step: turn discovery into Linear-backed delivery.
- The exit plan must make clear that approval starts Linear handoff, not code implementation.

Plan Mode exit-plan shape:

```text
Plan: turn discovery into Linear-backed delivery

1. Gather discovery and review context from this session and available artifacts.
2. Update the Linear Project with the shaped outcome and lifecycle status.
3. Create or update the PRD from product and workflow decisions.
4. Create or update the Tech Spec from engineering and design review decisions.
5. Present the Linear handoff package for approval.
6. After approval, create Linear Issue(s) as execution contracts.
7. Return the approved Issue link(s) and stop; implementation is a separate next step from those Issues.

No code changes happen during handoff.
```

Execution-mode workflow:

1. Fetch fresh Linear Project, PRD, Tech Spec, and Issue state.
2. Gather discovery and review artifacts.
3. Synthesize the handoff package:
   - Project summary and lifecycle.
   - PRD as product truth.
   - Tech Spec as implementation truth.
   - Proposed Issue slicing.
4. Create or update PRD and Tech Spec in Linear.
5. Update the Project to reflect current status, active docs, and proposed issue plan.
6. Present the package summary to the user for approval.
7. Record user approval as a Linear comment.
8. Create or update Linear Issue(s) from the approved package.
9. Run or report `linear-check delivery` and `linear-check issue`.
10. Hand off to the configured implementation or ship workflow from the approved Issue(s).

Rules:

- Keep durable workflow truth in Linear.
- Treat local and gstack artifacts as discovery inputs, not durable source of truth.
- Do not approve or implement a raw discovery/review plan directly.
- Do not start code implementation until Linear Issue(s) exist and are approved as execution contracts.
- Do not create PRs directly; use the consumer repo's configured ship workflow after Issues are ready.
- Keep Linear-facing Project, PRD, Tech Spec, Issue descriptions, and comments in the consumer config language; use Russian when no consumer config is present.
- Keep repo skill instructions and docs in English.
- Use Linear comments for user review acceptance, not Project Updates.
- Split Issues only when one PR is truly too large; split into vertical slices with explicit dependencies.

Final response must include:

- Linear Project link.
- PRD link.
- Tech Spec link.
- Issue link(s).
- Summary of what was approved.
- Explicit statement that implementation should start from the approved Linear Issue(s).
