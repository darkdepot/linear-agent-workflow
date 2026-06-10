---
name: linear-spec
description: Use when creating or updating a Linear Tech Spec before delivery or issue creation.
---

# Linear Spec

Create or update the Tech Spec as implementation truth: HOW the approved PRD will be built.

This is an internal/advanced atomic helper. The normal post-discovery user-facing workflow is `linear-handoff`, which may use this skill as one step.

Use this helper only for explicit targeted Tech Spec repair, reviewer-feedback updates, drift sync, or maintenance of an already-approved package without changing execution scope. If invoked as the normal post-discovery route, stop and route to `linear-handoff`.

Read first:

1. `AGENTS.md`
2. `references/artifact-rules.md`
3. `references/artifact-quality.md`
4. `references/readiness-gates.md`
5. `references/execution-quality.md`
6. `templates/tech-spec.md`

Rules:

- Write Linear Tech Spec content and section headings in the project config language; use Russian when no project config is present. Keep code identifiers, file paths, commands, product labels, and UI copy in their native language.
- Tech Spec defines HOW, not product discovery.
- Use Project and PRD as the source documents.
- When PRD requirement IDs exist, trace important HOW decisions back to `R` or `AE` IDs. If a decision is cross-cutting technical support, say so explicitly.
- Do not rewrite PRD behavior in different words. Link HOW back to WHAT; if WHAT is missing, return to PRD or mark the gap before continuing.
- If engineering review exists, convert it into a durable Tech Spec.
- If engineering review does not exist, run a lightweight engineering pass and create a lightweight spec.
- Trace implementation decisions back to PRD requirement IDs.
- Use stable implementation unit IDs (`U1`, `U2`, ...).
- Include system-wide impact, contracts, failure modes, validation, rollout, and rollback.
- For standard, deep, risky, or review-sensitive packages, make requirement trace, validation, rollback, and failure modes concrete enough for `linear-review artifact` to inspect. Do not add review workflow sections to the Tech Spec body.
- Use explicit no-spec exception only for truly simple, low-risk work.
- Do not use no-spec exception for risky, cross-cutting, data, auth, release, or multi-surface work.
- Keep plan-time and implementation-time unknowns separate. Do not pretend exact helper names, SQL, branch sequencing, or runtime failure details are settled before implementation has touched the code.
- Include architecture, contracts, boundaries, risks, files/surfaces, validation, rollout, and rollback when relevant. Omit sections only when they truly add no value.
- For deep or risky work, use the architecture lens from `references/execution-quality.md`: interface as test surface, deletion test, real seams only, and no shallow pass-through modules.
- Directional pseudo-code and diagrams are allowed when they clarify architecture. Do not include copy-paste implementation code or shell choreography.
- Do not write historical repair language.
- Keep workflow mechanics internal. Do not embed `linear-check`, lifecycle, readiness criteria, or agent-contract instructions into the Linear Tech Spec body.
- Do not move the Project to Delivery; Tech Spec creation belongs to Discovery or Handoff. Delivery Start belongs to `linear-implement`.
- Do not create PRs.
- Do not start implementation.

Self-review before finishing:

- Does every important HOW decision trace back to PRD requirements or a cross-cutting technical need?
- Did the spec introduce product behavior that belongs in PRD? If yes, stop and update PRD first.
- Are deferred implementation details clearly marked instead of guessed?
- For deep/risky work, does the spec explain the stable interface or seam that implementation and tests should exercise?
- Is the body free of workflow mechanics and lifecycle/readiness instructions?
- Run or report `linear-check discovery` for standalone use, or `linear-check handoff` when this skill is being used inside `linear-handoff`.
