---
name: linear-idea
description: Use when the user brings a raw idea and wants to start a Linear-tracked project.
---

# Linear Idea

Use this skill to turn a raw idea into a strengthened Linear Project in `Idea`.

`linear-idea` is the intake gate. It is not a planning skill and it never starts delivery.

Read first:

1. `AGENTS.md`
2. `skills/linear-project/SKILL.md`
3. `skills/linear-check/SKILL.md`
4. `references/lifecycle.md`

Workflow:

1. Confirm this runtime can create or update a Linear Project.
2. Inspect only the minimal repo and Linear context needed to ask better idea-shaping questions.
3. Ask 2-4 high-leverage AskQuestion-style questions.
4. Each question must include answer options, one recommended option, and a short reason for the recommendation.
5. Accept custom user answers when options do not fit.
6. Build a strengthened brief from the raw idea and answers.
7. Use `linear-project` to create or update a Project in `Idea`.
8. Recommend `/office-hours` or `/brainstorming` and explain why.
9. Run or report `linear-check idea`.
10. Stop immediately.

Hard terminal contract:

- Project creation or update in Linear status `Idea` is mandatory.
- No Linear Project link or id means `linear-idea` is not complete.
- After the Project is created or updated, stop. Do not continue into discovery, planning, or delivery.
- Final response must include:
  - Linear Project link.
  - Strengthened brief summary.
  - Selected next-step recommendation: `/office-hours` or `/brainstorming`.
  - Short reason for that recommendation.
  - Explicit statement that no PRD, Tech Spec, Issue, implementation plan, ExecPlan, or code was created.

Plan Mode and permission boundary:

- `linear-idea` normally runs outside Plan Mode or in a mutation-capable execution mode.
- Do not rely on Plan Mode for required Linear mutations. Host behavior differs across Codex, Claude Code, and other agents.
- If Plan Mode or permissions block Linear mutation, stop early as `BLOCKED / INCOMPLETE`.
- In that blocked case, do not ask the full question set, do not produce an implementation plan, and do not pretend intake completed.
- Use this blocked wording:

```text
BLOCKED / INCOMPLETE - linear-idea cannot complete because creating/updating a Linear Project in Idea is mandatory, and this runtime/mode did not allow the Linear mutation.

Exit Plan Mode or rerun linear-idea in execution/default mode, then create/update the Project in Idea.
No PRD, Tech Spec, Issue, implementation plan, ExecPlan, or code was created.
```

Context inspection guidance:

- Inspect only enough context to identify the product area, avoid duplicate Projects, and ask sharper intake questions.
- Do not perform full implementation discovery.
- Do not map code paths, architecture, tests, or files unless that is the minimum needed to phrase an idea-shaping question.
- If the idea is already implementation-shaped, still create an `Idea` Project first, then recommend the next workflow.

Forbidden during Idea:

- Implementation plan.
- ExecPlan.
- PRD.
- Tech Spec.
- Issue.
- Code changes.
- "Plan implementation".
- Transitioning the Project to Delivery.
- Approving a discovery or implementation plan directly.

Rules:

- Do not create PRD, Tech Spec, or Issue during Idea.
- Do not start implementation.
- Do not treat the raw idea as shaped requirements.
- Do not let local docs, gstack artifacts, or chat plans become durable source of truth during Idea.
- Repo skill instructions and local repo docs remain English unless the consumer config says otherwise.
- Keep Linear-facing output in the consumer config language; use Russian when no consumer config is present.
