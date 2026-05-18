---
name: linear-handoff
description: Use after discovery or plan reviews to turn shaped work into Linear Project, PRD, Tech Spec, and execution Issue(s). This is the primary post-discovery route.
---

# Linear Handoff

Use this skill after discovery and reviews to turn shaped work into a Linear-backed execution package.

`linear-handoff` is the primary bridge from thinking to execution. It packages discovery output into Linear source-of-truth artifacts, gets user approval, creates Issue contracts, and only then hands off to implementation.

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

Quality bar:

- Use the strongest upstream artifact shape available:
  - Superpowers-style route discipline: shaping must produce an approved spec before implementation planning.
  - gstack-style premise and alternatives discipline: important choices are surfaced to the user before they land in durable artifacts.
  - Compound-style WHAT/HOW split: PRD answers WHAT, Tech Spec answers HOW, Issue answers one-PR execution.
- Handoff should make the next agent invent less, not more.
- Prefer fewer, stronger artifacts over verbose workflow transcripts.
- Do not rely on lint scripts to make artifacts good. The skill must produce clean artifacts by construction.

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
Plan: turn discovery into a Linear-backed execution package

1. Gather discovery and review context from this session and available artifacts.
2. Prepare the Linear Project update as a concise product brief.
3. Prepare the PRD from product and workflow decisions.
4. Prepare the Tech Spec from engineering and design review decisions.
5. Present the Linear handoff package for approval before durable writes.
6. After approval, update Linear artifacts and create Linear Issue(s) as execution contracts.
7. Run the delivery gate before implementation starts from those Issues.
8. Return the approved Issue link(s) and stop unless the user explicitly approved starting implementation.

No code changes happen during handoff.
```

Execution-mode workflow:

1. Fetch fresh Linear Project, PRD, Tech Spec, and Issue state.
2. Gather discovery and review artifacts.
3. Synthesize a draft handoff package before mutating durable Linear artifacts:
   - Project summary as a concise product brief.
   - PRD as product truth with requirement IDs and acceptance examples when useful.
   - Tech Spec as implementation truth that traces HOW decisions back to PRD requirements.
   - Proposed Issue slicing with one-PR default and explicit dependencies if split.
   - Remaining assumptions, if any, that the user should see before Issue creation.
4. Run a content-shape review on the package:
   - Project reads like a product brief, not a dashboard.
   - PRD contains WHAT and acceptance, not implementation architecture.
   - Tech Spec contains HOW and validation, not product rediscovery.
   - Issue slices are execution contracts, not copied PRD/Spec documents.
   - Operational status, lifecycle gates, and workflow mechanics are absent from Linear-facing bodies.
5. Present the draft package summary to the user for package approval before durable writes.
6. If approval is missing, rejected, or changes are requested, do not create Issue(s), do not move the Project to Delivery, revise and re-present or stop as `BLOCKED / INCOMPLETE` with current links.
7. After package approval, create or update PRD and Tech Spec in Linear.
8. Update the Project body with only the product brief concerns: what, why, target outcome, in scope, and out of scope. Render headings in the consumer config language; default Russian headings are `Что`, `Зачем`, `Образ результата`, `Что входит`, and `Что не входит`.
9. Record approval as a Linear comment. The comment should identify the approved package, PRD/Tech Spec links or intended titles, approved Issue slice titles or ids, and whether implementation may start.
10. Create or update Linear Issue(s) from the approved package.
11. Run or report `linear-check handoff` and `linear-check issue`.
12. If the user explicitly approved implementation start, move the Project to Delivery and run or report `linear-check delivery`. If delivery check fails or is blocked, stop and report the current Linear artifact links.
13. Hand off to the configured implementation or ship workflow from the approved Issue(s) only after delivery readiness passes.

Rules:

- Keep durable workflow truth in Linear.
- Treat local and gstack artifacts as discovery inputs, not durable source of truth.
- Do not approve or implement a raw discovery/review plan directly.
- Do not start code implementation until Linear Issue(s) exist and are approved as execution contracts.
- Do not treat package approval as implementation-start approval unless the user explicitly approved starting implementation from the created Issue(s).
- Do not treat PRD or Tech Spec creation as Delivery.
- Keep Project descriptions free of active-doc lists, active-issue lists, lifecycle bookkeeping, and workflow mechanics.
- Keep PRD/Spec bodies free of review-readiness dashboards, next-skill instructions, lint/check instructions, and lifecycle bookkeeping.
- Do not create PRs directly; use the consumer repo's configured ship workflow after Issues are ready.
- Keep Linear-facing Project, PRD, Tech Spec, Issue descriptions, and comments in the consumer config language; use Russian when no consumer config is present.
- Keep repo skill instructions and docs in English.
- Use Linear comments for user review acceptance, not Project Updates.
- Split Issues only when one PR is truly too large; split into vertical slices with explicit dependencies.
- If a source artifact is a local plan or review report, translate it into PRD/Spec/Issue shape. Do not paste the local artifact body into Linear unchanged.

Final response after an approved package must include:

- Linear Project link.
- PRD link.
- Tech Spec link.
- Issue link(s).
- Summary of what was approved.
- Explicit statement that implementation should start from the approved Linear Issue(s).

If handoff is `BLOCKED / INCOMPLETE`, include the current Project/PRD/Tech Spec links that exist, the missing approval or inspection step, and a clear statement that no Issue creation or implementation handoff happened.
