---
name: linear-prd
description: Use when creating or updating a Linear PRD after discovery or an explicit discovery skip.
---

# Linear PRD

Create or update the PRD as product truth: WHAT the workflow should achieve and how the user should experience it.

Read first:

1. `AGENTS.md`
2. `references/artifact-rules.md`
3. `templates/prd.md`

Rules:

- Write Linear PRD content in Russian.
- PRD defines WHAT, not HOW.
- Use Project context and discovery output from `/brainstorming` or `/office-hours`.
- If the user explicitly skips `/brainstorming` and `/office-hours`, create PRD-lite from the strengthened brief and mark lower confidence.
- Capture problem, target operator, workflow, scenarios, requirements, non-goals, and acceptance.
- Record user review acceptance as a Linear comment.
- Do not create Issues.
- Do not include implementation architecture that belongs in Tech Spec.

Before finishing:

- Run or report `linear-check discovery`.
