---
name: linear-prd
description: Use when creating or updating a Linear PRD after discovery or an explicit discovery skip.
---

# Linear PRD

Create or update the PRD as product truth: WHAT the workflow should achieve and how the user should experience it.

This is an atomic helper. The normal post-discovery user-facing workflow is `linear-handoff`, which may use this skill as one step.

Read first:

1. `AGENTS.md`
2. `references/artifact-rules.md`
3. `templates/prd.md`

Rules:

- Write Linear PRD content in the consumer config language; use Russian when no consumer config is present.
- PRD defines WHAT, not HOW.
- Use Project context and discovery output from `/brainstorming` or `/office-hours`.
- If the user explicitly skips `/brainstorming` and `/office-hours`, create PRD-lite from the strengthened brief and mark lower confidence.
- Capture problem, target operator, workflow, scenarios, requirements, non-goals, and acceptance.
- Record user review acceptance as a Linear comment.
- Do not create Issues.
- Do not include implementation architecture that belongs in Tech Spec.
- Do not start implementation.

Before finishing:

- Run or report `linear-check discovery`.
