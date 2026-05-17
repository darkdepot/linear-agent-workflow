---
name: linear-issue
description: Use when creating or updating a one-PR Linear Issue from Project, PRD, and Tech Spec context.
---

# Linear Issue

Create or update the Linear Issue as the one-PR execution contract.

This is an atomic helper. The normal post-discovery user-facing workflow is `linear-handoff`, which may use this skill as one step.

Read first:

1. `AGENTS.md`
2. `references/artifact-rules.md`
3. `templates/issue.md`

Rules:

- Write Linear Issue content in the consumer config language; use Russian when no consumer config is present.
- Create one Issue by default.
- Build the Issue from Project plus PRD plus Tech Spec, or explicit no-spec exception.
- Include implementation-critical context snapshot directly in the Issue.
- Use chips for Project, PRD, and Tech Spec.
- Do not attach PRD or Tech Spec documents to the Issue.
- Split only when one PR is truly too large; split as vertical slices with dependencies.
- Do not start coding until the Issue is sufficient for another agent.
- Do not add PR chips before a real PR exists.
- Do not create Issues from raw discovery plans before Project, PRD, and Tech Spec are current.

Before finishing:

- Run or report `linear-check issue`.
