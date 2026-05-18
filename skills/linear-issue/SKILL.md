---
name: linear-issue
description: Use when creating or updating a one-PR Linear Issue from Project, PRD, and Tech Spec context.
---

# Linear Issue

Create or update the Linear Issue as the one-PR execution contract.

This is an internal/advanced atomic helper. The normal post-discovery user-facing workflow is `linear-handoff`, which may use this skill as one step.

Use this helper only for explicit targeted Issue repair, reviewer-feedback updates, drift sync, or maintenance of an already-approved package without changing execution scope. If invoked as the normal post-discovery route, stop and route to `linear-handoff`.

Read first:

1. `AGENTS.md`
2. `references/artifact-rules.md`
3. `templates/issue.md`

Rules:

- Write Linear Issue content in the consumer config language; use Russian when no consumer config is present.
- Create one Issue by default.
- Build the Issue from Project plus PRD plus Tech Spec, or explicit no-spec exception.
- Include implementation-critical context snapshot directly in the Issue.
- Do not copy PRD or Tech Spec wholesale into the Issue. Extract the one-PR contract: goal, scope, surfaces, validation, acceptance, and non-goals.
- Map Issue scope to PRD requirement IDs and Tech Spec surfaces when available.
- Use chips for Project, PRD, and Tech Spec.
- Add PRD and Tech Spec as Linear resources/links when the connector supports it.
- Do not use raw PRD or Tech Spec URLs in the body when chips can represent those documents.
- Do not attach PRD or Tech Spec documents to the Issue.
- Split only when one PR is truly too large; split as vertical slices with dependencies.
- Do not start coding until the Issue is sufficient for another agent.
- Do not add PR chips before a real PR exists.
- Do not create Issues from raw discovery plans before Project, PRD, and Tech Spec are current.
- Do not move the Project to Delivery unless the user has approved execution from this Issue and implementation is ready to begin.

Before finishing:

- Check whether another zero-context implementation agent could start from the Issue without reading the discovery transcript.
- Check whether acceptance criteria are concrete enough to verify after the PR.
- Check whether the Issue introduces scope that is not in PRD or Tech Spec; if yes, return to handoff approval.
- Run or report `linear-check issue`.
