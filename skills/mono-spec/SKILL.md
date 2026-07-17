---
name: mono-spec
description: Use when creating or updating a Linear Tech Spec before delivery or issue creation.
---

# Mono Spec

Create or update the Tech Spec as implementation truth: HOW the approved PRD will be built.

This is an internal/advanced atomic helper. The normal post-discovery user-facing workflow is `mono-handoff`, which may use this skill as one step.

Use this helper only for explicit targeted Tech Spec repair, reviewer-feedback updates, drift sync, or maintenance of an already-approved package without changing execution scope. If invoked as the normal post-discovery route, stop and route to `mono-handoff`.

Read first:

1. `AGENTS.md`
2. `references/contracts/tech-spec.md`
3. `references/artifact-rules.md`
4. `references/artifact-quality.md`
5. `references/readiness-gates.md`
6. `references/execution-quality.md`
7. `templates/tech-spec.md`

Contract application:

- `references/contracts/tech-spec.md` is the normative source for Tech Spec artifact behavior. Apply `TS-001` through `TS-035` in full; do not reinterpret or selectively copy those rules into this adapter.
- `TS-001` through `TS-004` preserve this skill's existing route, internal-helper boundary, and direct-mutation eligibility.
- `TS-005` through `TS-025` govern Tech Spec content, evidence, traceability, architecture quality, and body purity.
- `TS-026` through `TS-028` preserve the existing Delivery, PR-creation, and implementation-start prohibitions.
- `TS-029` through `TS-034` govern the unchanged self-review before finishing.
- `TS-035` governs the unchanged discovery or handoff transition check.

Workflow:

1. Classify the request with `TS-001` through `TS-004`. Continue directly only for an eligible targeted mutation; otherwise stop and route to `mono-handoff` exactly as before.
2. Read the active project config, current Project and approved PRD, relevant engineering-review evidence, and any reviewer feedback for the requested mutation.
3. Confirm that the requested repair or maintenance does not change execution scope or invent product behavior. If it does, do not use this direct helper path.
4. Render the Tech Spec with `templates/tech-spec.md`, applying `TS-005` through `TS-025` as the content, evidence, traceability, and architecture boundary.
5. Preserve the mutation boundaries in `TS-026` through `TS-028`: this helper mutates only the Tech Spec and does not start Delivery, create a PR, or start implementation.
6. Run the self-review in `TS-029` through `TS-034` and repair any gap before finishing.
7. Run or report the transition check required by `TS-035`.

The contract changes where the rules are read from, not this skill's eligibility, approval/check path, Linear mutation boundary, or output behavior.
