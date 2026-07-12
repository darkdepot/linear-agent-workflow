---
name: linear-issue
description: Use when creating or updating a one-PR Linear Issue from Project, PRD, and Tech Spec context.
---

# Linear Issue

Create or update the Linear Issue as the one-PR execution contract.

This is an internal/advanced atomic helper. The normal post-discovery user-facing workflow is `linear-handoff`, which may use this skill as one step.

Use this helper only for explicit targeted Issue repair, reviewer-feedback updates, drift sync, or maintenance of an already-approved package without changing execution scope. If invoked as the normal post-discovery route, stop and route to `linear-handoff`.

Issue-only mode: this skill runs as a self-contained one-PR issue-only create mode in two situations. (a) Intake-authorized draft: `linear-issue-intake` invokes it to author the pre-approval Issue *before* the marker, `issue-only` label, and approval exist — the package is not yet resolvable as issue-only, so authorization comes from intake, not from the resolver. (b) Resolved update: the resolver already returns `package_kind=issue-only` for an activated package (via `scripts/resolve-issue-context.mjs`) and the Issue needs a targeted update. Because the approval binds to the whole-body fingerprint, any change to the Issue body — even one that does not change execution scope — makes the marker and owner approval stale and resolver-blocks the package; so in this mode make only non-body updates (state, labels, links, relations) freely, and route every Issue-body change back through `linear-issue-intake`'s create-then-approve renewal (re-review for standard, re-fingerprint, re-approval) before finishing, never leaving the package resolver-blocked. In either situation it must not redirect into `linear-handoff`, and it must not emit or attach Project, PRD, or Tech Spec chips or resources — there is no Project, PRD, or Tech Spec in the issue-only lane. Everything below is the default project-first behavior and is unchanged; it applies whenever the package is project-first.

Read first:

1. `AGENTS.md`
2. `references/artifact-rules.md`
3. `references/artifact-quality.md`
4. `references/readiness-gates.md`
5. `references/execution-quality.md`
6. `templates/issue.md`

Rules:

- Write Linear Issue content in the project config language; use Russian when no project config is present.
- Create one Issue by default.
- Build the Issue from Project plus PRD plus Tech Spec, or explicit no-spec exception.
- Include a `Прочитать сначала` / Read first section with Project, PRD, Tech Spec, and supporting docs or code paths.
- Include the risk classification and review-gate record from `linear-review` or the advisory tiny-scope exception, including verdict, evidence or comment link, finding disposition, owner workflow, and next step.
- Include implementation-critical context snapshot directly in the Issue.
- Do not copy PRD or Tech Spec wholesale into the Issue. Extract the one-PR contract: goal, scope, surfaces, validation, acceptance, and non-goals.
- Map Issue scope to PRD requirement IDs and Tech Spec surfaces when available.
- Include agent readiness: `AFK` when another agent can execute from the artifact set without new human judgment, or `HITL` when product, design, external access, manual QA, or risk acceptance is still needed.
- Include dependencies: parent/source package, `Blocked by`, and whether the Issue can start immediately.
- For bug or performance Issues, include current behavior, desired behavior, reproduction steps or benchmark loop, and the fix-proof expectation. If the original symptom cannot be reproduced yet, say so explicitly.
- Include key contracts when they matter: stable types, config shapes, endpoints, domain contracts, invariants, or external behavior. Do not turn this into a file-by-file edit script.
- Include concrete validation, acceptance criteria, and non-goals.
- Use chips for Project, PRD, and Tech Spec (project-first only; the issue-only create mode under `linear-issue-intake` emits no chips).
- Add PRD and Tech Spec as Linear resources/links when the connector supports it.
- Do not use raw PRD or Tech Spec URLs in the body when chips can represent those documents.
- Do not attach PRD or Tech Spec documents to the Issue.
- Split only when one PR is truly too large; split as vertical slices with dependencies.
- Do not start coding until the Issue is sufficient for another agent.
- Do not add PR chips before a real PR exists.
- Do not create Issues from raw discovery plans before Project, PRD, and Tech Spec are current.
- Do not move the Project to Delivery from `linear-issue`; Delivery Start belongs to `linear-implement` after the user approves execution from this Issue.
- Write durable Issues: no line numbers, no brittle implementation choreography, and no "open file X line Y" instructions. File paths are allowed only as stable read-first surfaces.

Before finishing:

- Check whether another zero-context implementation agent could start from the Issue without reading the discovery transcript.
- Check whether the readiness classification is honest: `AFK` has no unresolved human judgment; `HITL` names the exact human dependency.
- Check whether bug/performance work has a feedback-loop contract.
- Check whether acceptance criteria are concrete enough to verify after the PR.
- Check whether the Issue introduces scope that is not in PRD or Tech Spec; if yes, return to handoff approval.
- Run or report `linear-check issue`.
