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
2. `references/contracts/prd.md`
3. `references/artifact-rules.md`
4. `references/artifact-quality.md`
5. `references/execution-quality.md`
6. `references/questioning.md`
7. `templates/prd.md`

Contract application:

- `references/contracts/prd.md` is the normative source for PRD artifact behavior. Apply `PR-001` through `PR-032` in full; do not reinterpret or selectively copy those rules into this adapter.
- `PR-001` through `PR-004` preserve this skill's existing route, internal-helper boundary, and direct-mutation eligibility.
- `PR-005` through `PR-025` govern PRD content, evidence, acceptance recording, and the existing mutation prohibitions.
- `PR-026` through `PR-031` govern the unchanged self-review before finishing.
- `PR-032` governs the unchanged discovery-readiness check.

Workflow:

1. Classify the request with `PR-001` through `PR-004`. Continue directly only for an eligible targeted mutation; otherwise stop and route to `mono-handoff` exactly as before.
2. Read the active project config, current Project and PRD, approved discovery evidence, and any reviewer feedback relevant to the requested mutation.
3. Confirm that the requested repair or maintenance does not change execution scope. If it does, do not use this direct helper path.
4. Render the PRD with `templates/prd.md`, applying `PR-005` through `PR-020` as the content and decision boundary.
5. Preserve the mutation boundaries and acceptance record required by `PR-021` through `PR-025`: this helper mutates only the PRD and records review acceptance through the existing Linear-comment path.
6. Run the self-review in `PR-026` through `PR-031` and repair any gap before finishing.
7. Run or report the discovery check required by `PR-032`.

The contract changes where the rules are read from, not this skill's eligibility, approval/check path, Linear mutation boundary, or output behavior.
