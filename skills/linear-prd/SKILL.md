---
name: linear-prd
description: Use when creating or updating a Linear PRD after discovery or an explicit discovery skip.
---

# Linear PRD

Create or update the PRD as product truth: WHAT the workflow should achieve and how the user should experience it.

This is an internal/advanced atomic helper. The normal post-discovery user-facing workflow is `linear-handoff`, which may use this skill as one step.

Use this helper only for explicit targeted PRD repair, reviewer-feedback updates, drift sync, or maintenance of an already-approved package without changing execution scope. If invoked as the normal post-discovery route, stop and route to `linear-handoff`.

Read first:

1. `AGENTS.md`
2. `references/artifact-rules.md`
3. `templates/prd.md`

Rules:

- Write Linear PRD content in the consumer config language; use Russian when no consumer config is present.
- PRD defines WHAT, not HOW: operator behavior, scope boundaries, requirements, acceptance, and success criteria.
- Treat the PRD as a lightweight requirements document, not a process transcript. Include what planning needs; omit ceremony that does not help `linear-spec` or `linear-issue`.
- Resolve product decisions here. Do not leave `linear-spec` to invent actors, user-visible behavior, MVP boundaries, or acceptance criteria.
- Use Project context and discovery output from `/brainstorming` or `/office-hours`.
- If the user explicitly skips `/brainstorming` and `/office-hours`, create PRD-lite from the strengthened brief and mark lower confidence.
- Capture problem, target operator, workflow, scenarios, requirements, non-goals, and acceptance.
- For Standard or Deep work, assign stable requirement IDs: `R1.`, `R2.`, `R3.`. Use plain bullets only for very small PRD-lite docs.
- Use acceptance examples for stateful or conditional behavior. In default Russian output, use: `AE1. Покрывает R1, R2. Дано ..., когда ..., тогда ...`. Adapt the wording to the consumer config language.
- Add success criteria for both:
  - the human/operator outcome;
  - handoff quality, so Tech Spec and Issue slicing can proceed without inventing product behavior.
- Record user review acceptance as a Linear comment.
- Do not create Issues.
- Do not include implementation architecture that belongs in Tech Spec.
- Do not move the Project to Delivery; PRD creation belongs to Discovery or Handoff.
- Do not start implementation.

Self-review before finishing:

- What would `linear-spec` still have to invent if this PRD ended here? Fix those gaps.
- Does every Standard/Deep requirement have an observable behavior or a stated structural reason?
- Do acceptance examples cover ambiguous conditional behavior?
- Are all implementation details deferred to Tech Spec?
- Run or report `linear-check discovery`.
