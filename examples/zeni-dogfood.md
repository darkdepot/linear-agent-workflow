# Zeni Dogfood Example

Zeni is the first consumer repo for this workflow.

Consumer policy:

- Zeni keeps its existing project-specific skills.
- Zeni `.agents/skills/linear-*` contains generated full copies from upstream.
- Zeni `.claude/skills/linear-*` contains tiny discovery wrappers to `.agents`.
- Zeni stores consumer policy in `.agents/linear-workflow.config.md` and repo docs.
- Zeni's configured ship workflow is gstack `ship`.

Dogfood order:

1. Ship the reusable workflow MVP.
2. Install generated full skills into Zeni.
3. Use `linear-idea` for raw idea intake.
4. Use discovery/review skills in Plan Mode when helpful.
5. Use `linear-handoff` before implementation.
6. Keep Project, PRD, Tech Spec, and Issue current in Linear.

## Correct Raw Idea Intake

Input:

```text
Improve Settings > Agent by splitting Identity & phase, Voice & guardrails, and Context into separate saveable blocks. Improve Goals design and think through Yield target binding.
```

Expected behavior:

1. `linear-idea` inspects only minimal context.
2. It asks 2-4 idea-shaping questions with recommended options.
3. It creates or updates a Linear Project in `Idea`.
4. Final output includes:
   - Project link.
   - Strengthened brief.
   - Next step: `/office-hours` or `/brainstorming`.
   - Reason for the recommendation.
   - Statement that no PRD, Tech Spec, Issue, plan, ExecPlan, or code was created.

No implementation plan is produced.

## Correct Discovery To Handoff

Expected behavior:

1. User runs `/office-hours` or `/brainstorming` in Plan Mode.
2. User optionally runs `/plan-design-review` and `/plan-eng-review`.
3. When a discovery/review implementation plan appears, user runs `/linear-handoff` instead of approving direct implementation.
4. `linear-handoff` produces a handoff exit-plan if still in Plan Mode.
5. After approval, `linear-handoff` updates Project, PRD, and Tech Spec in Linear, asks package approval, creates Issue(s), and hands off to implementation from those Issues.

## Anti-Example: Thin Adapter Install

FAIL:

```markdown
This Zeni project skill is a thin adapter for the reusable Linear Agent Workflow.

Resolve and follow the reusable workflow source in this order:

1. `$LINEAR_AGENT_WORKFLOW_HOME/skills/linear-idea/SKILL.md`
2. `../linear-agent-workflow/skills/linear-idea/SKILL.md`
3. `https://github.com/darkdepot/linear-agent-workflow/blob/main/skills/linear-idea/SKILL.md`
```

Why this fails:

- The repo-scoped skill is not directly executable after opening `SKILL.md`.
- The operational contract can be skipped or weakened by host/runtime behavior.
- `linear-check` should report this install as FAIL.

## Anti-Example: Direct Discovery Plan Approval

FAIL:

1. `/office-hours`, `/brainstorming`, or `/plan-eng-review` produces an implementation plan.
2. User approves the plan directly.
3. Agent starts code implementation without `linear-handoff`.

Why this fails:

- Discovery artifacts are inputs, not Linear source of truth.
- Project, PRD, Tech Spec, and Issue(s) were not updated before implementation.
- Implementation did not start from approved Linear Issue(s).

## Anti-Example: Dogfood Failure

FAIL:

1. User invokes `linear-idea` with a raw product improvement idea.
2. Agent performs deep code discovery.
3. Agent asks reasonable questions.
4. Agent writes an implementation plan.
5. Agent starts "Plan implementation".
6. No Linear Project is created.
7. No `/office-hours` or `/brainstorming` recommendation is made.

Why this fails:

- `linear-idea` did not complete its mandatory Project creation/update.
- Idea intake crossed into planning and delivery.
- `linear-check idea` must report FAIL.
