---
name: mono-issue
description: Use when creating or updating a one-PR Linear Issue from Project, PRD, and Tech Spec context.
---

# Mono Issue

Create or update the Linear Issue as the one-PR execution contract.

This is an internal/advanced atomic helper. The normal post-discovery user-facing workflow is `mono-handoff`, which may use this skill as one step.

Use this helper only for explicit targeted Issue repair, reviewer-feedback updates, drift sync, or maintenance of an already-approved package without changing execution scope. If invoked as the normal post-discovery route, stop and route to `mono-handoff`.

Read first:

1. `AGENTS.md`
2. `references/contracts/issue.md`
3. `references/artifact-rules.md`
4. `references/artifact-quality.md`
5. `references/readiness-gates.md`
6. `references/execution-quality.md`
7. `templates/issue.md`

Contract application:

- `references/contracts/issue.md` is the normative source for Issue artifact behavior. Apply `IS-001` through `IS-034` in full; do not reinterpret or selectively copy those rules into this adapter.
- `IS-001` through `IS-004` preserve this skill's existing route, internal-helper boundary, and direct-mutation eligibility.
- `IS-005` preserves the existing issue-only draft and resolved-update branches by applying `references/issue-only-lane.md` in full, including their authorization, renewal, no-redirect, no-Project-artifact, and project-first fallback boundaries.
- `IS-006` through `IS-028` govern Issue content, project-first context, readiness, dependencies, slicing, mutation prohibitions, and durable instructions.
- `IS-029` through `IS-033` govern the unchanged self-review before finishing.
- `IS-034` governs the unchanged Issue readiness check.

Workflow:

1. Determine whether the operation is intake-authorized issue-only draft authoring, a resolved issue-only update, or the default project-first branch under `IS-005`.
2. For either issue-only mode, apply `IS-005` and `references/issue-only-lane.md` in full. Preserve the existing intake authorization, non-body update limit, create-then-approve renewal, no-`mono-handoff` redirect, absent Project/PRD/Tech Spec artifacts, and fail-closed fallback behavior.
3. For the default project-first branch, classify the request with `IS-001` through `IS-004` and require current Project, PRD, and Tech Spec context or the explicit no-spec exception in `IS-008`. Continue directly only for an eligible targeted mutation; otherwise stop and route to `mono-handoff` exactly as before.
4. Render the Issue with `templates/issue.md`, applying `IS-006` through `IS-028` for the active branch. Create or update only the one-PR Issue and preserve every branch-specific chip, resource, lifecycle, and mutation boundary.
5. Run the self-review in `IS-029` through `IS-033` and repair any gap before finishing.
6. Run or report the Issue check required by `IS-034`.

The contract changes where the rules are read from, not this skill's eligibility, approval/check path, Linear mutation boundary, branch behavior, or output behavior.
