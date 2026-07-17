---
name: mono-project
description: Use when creating or updating a Linear Project as the source of truth for a coding-agent workflow.
---

# Mono Project

Create or update the Linear Project overview as a concise product brief.

Read first:

1. `AGENTS.md`
2. `references/contracts/project.md`
3. `references/artifact-rules.md`
4. `references/readiness-gates.md`
5. `references/lifecycle.md`
6. `templates/project.md`

Contract application:

- `references/contracts/project.md` is the normative source for Project artifact behavior. Apply `PC-001` through `PC-018` in full; do not reinterpret or selectively copy those rules into this adapter.
- `PC-001` and `PC-002` preserve this skill's existing routing and concise-brief purpose.
- `PC-003` through `PC-012` govern Project body content, relationship storage, review-gate evidence, and PR-reference hygiene.
- `PC-013` through `PC-017` govern the existing Idea, Discovery, handoff-readiness, Delivery, and Ship boundaries.
- `PC-018` governs the unchanged transition check before finishing.

Workflow:

1. Confirm the request is a Project create or update operation covered by `PC-001`.
2. Read the active project config, the required readiness and lifecycle policies listed above, and the current Linear Project state relevant to the requested mutation.
3. Gather only the product-brief inputs and relationship evidence allowed by `PC-003` through `PC-012`.
4. Render the Project body with `templates/project.md`, applying `PC-002` through `PC-012` as the acceptance boundary for the mutation.
5. Apply the lifecycle constraint for the current state from `PC-013` through `PC-017`; keep lifecycle and relationship evidence outside the Project body where the contract requires it.
6. Create or update the Linear Project without creating any additional artifact or changing another lifecycle entity on this skill's behalf.
7. Run or report the transition check required by `PC-018`.

The contract changes where the rules are read from, not this skill's eligibility, Linear mutation boundary, or output behavior.
