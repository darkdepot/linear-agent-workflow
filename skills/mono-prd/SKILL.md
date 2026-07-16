---
name: mono-prd
description: Use when creating or updating a Linear PRD after discovery or an explicit discovery skip.
---

# Mono PRD

Create or update the PRD as product truth: WHAT the workflow should achieve and how the user should experience it.

This is an internal/advanced atomic helper. The normal post-discovery user-facing workflow is `mono-handoff`, which may use this skill as one step.

Use this helper only for explicit targeted PRD repair, reviewer-feedback updates, drift sync, or maintenance of an already-approved package without changing execution scope. If invoked as the normal post-discovery route, stop and route to `mono-handoff`.

Read first:

1. `AGENTS.md`
2. `references/artifact-rules.md`
3. `references/artifact-quality.md`
4. `references/execution-quality.md`
5. `references/questioning.md`
6. `templates/prd.md`

Rules:

- Write Linear PRD content in the project config language; use Russian when no project config is present.
- PRD defines WHAT, not HOW: operator behavior, scope boundaries, requirements, acceptance, and success criteria.
- Treat the PRD as a lightweight requirements document, not a process transcript. Include what planning needs; omit ceremony that does not help `mono-spec` or `mono-issue`.
- Resolve product decisions here. Do not leave `mono-spec` to invent actors, user-visible behavior, MVP boundaries, or acceptance criteria.
- Use Project context and discovery output from `/brainstorming` or `/office-hours`.
- If the user explicitly skips `/brainstorming` and `/office-hours`, create PRD-lite from the strengthened brief and mark lower confidence.
- Capture problem, target operator, workflow, scenarios, requirements, non-goals, and acceptance.
- For Standard or Deep work, assign stable requirement IDs: `R1.`, `R2.`, `R3.`. Use plain bullets only for very small PRD-lite docs.
- Use the `actor -> capability -> benefit` shape from `references/execution-quality.md` as a coverage check for scenarios and requirements. Do not add a long user-story section unless it materially clarifies the product truth.
- Use acceptance examples for stateful or conditional behavior. In default Russian output, use: `AE1 (безопасное сохранение). Покрывает R1 (частичное сохранение), R2. Дано ..., когда ..., тогда ...`. Bare IDs remain the canonical machine key; the Russian slug in parentheses is additive for human readability. Adapt the wording to the project config language.
- Add success criteria for both:
  - the human/operator outcome;
  - handoff quality, so Tech Spec and Issue slicing can proceed without inventing product behavior.
- Add behavior-validation intent: the user-visible behaviors later Tech Spec and Issue validation must prove. Keep this product-facing; do not name test files or implementation commands in the PRD.
- Capture actors, current workflow, target workflow, scenarios, requirements, acceptance examples, success criteria, scope boundaries, assumptions, open questions, non-goals, and links.
- Use stable actor IDs (`A1`, `A2`, ...), flow IDs (`F1`, `F2`, ...), requirement IDs (`R1`, `R2`, ...), and acceptance example IDs (`AE1`, `AE2`, ...).
- Keep requirements observable or structural enough to trace into the Tech Spec.
- Use questions only for product, workflow, scope, or risk choices that cannot be inferred from Project, discovery output, or repo context.
- Record user review acceptance as a Linear comment.
- Do not create Issues.
- Do not include implementation architecture that belongs in Tech Spec.
- Do not move the Project to Delivery; PRD creation belongs to Discovery or Handoff.
- Do not start implementation.

Self-review before finishing:

- What would `mono-spec` still have to invent if this PRD ended here? Fix those gaps.
- Does every important requirement have an actor, capability, and benefit?
- Does the PRD name the behavior-validation target without leaking HOW?
- Does every Standard/Deep requirement have an observable behavior or a stated structural reason?
- Do acceptance examples cover ambiguous conditional behavior?
- Are all implementation details deferred to Tech Spec?
- Run or report `mono-check discovery`.
