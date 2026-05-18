# Artifact Quality Bar

Linear artifacts must be strong enough that a zero-context implementation agent can continue without inventing product behavior, workflow boundaries, or validation expectations.

## Project

Required quality:

- States the shaped outcome and why it matters.
- Shows lifecycle status.
- Lists active PRD, Tech Spec, and Issue plan with Linear chips when available.
- Records review-gate state with risk, required/advisory/skipped status, verdict, evidence or comment link, finding disposition, owner workflow, and next step.
- Keeps overview separate from full PRD and Tech Spec content.
- Does not include stale PR chips, closed PRs, or raw PR URLs when chips are available.

## PRD

Required quality:

- Defines WHAT, not HOW.
- Names target operator or actor.
- Captures problem, current workflow, target workflow, scenarios, requirements, non-goals, acceptance, and links.
- Uses stable requirement IDs (`R1`, `R2`, ...).
- Uses actor IDs (`A1`, `A2`, ...), flow IDs (`F1`, `F2`, ...), and acceptance example IDs (`AE1`, `AE2`, ...) when those sections are present.
- Marks PRD-lite when discovery was explicitly skipped and calls out lower confidence.
- Keeps implementation architecture out of the PRD unless the product itself is an agent-workflow mechanism and the boundary is necessary to explain operator experience.

## Tech Spec

Required quality:

- Defines HOW the approved PRD will be built.
- Traces back to PRD requirements.
- Uses stable implementation unit IDs (`U1`, `U2`, ...).
- Describes architecture, contracts, system-wide impact, failure modes, validation, rollout, and rollback.
- Preserves explicit no-spec exceptions only for tiny, low-risk work.
- Avoids historical transcript summaries and repair archaeology.

## Issue

Required quality:

- Defines one PR by default.
- Includes `Прочитать сначала` / Read first context.
- Records review-gate state with risk, required/advisory/skipped status, verdict, evidence or comment link, finding disposition, owner workflow, and next step.
- Carries a context snapshot from Project, PRD, and Tech Spec.
- Lists where to change, how to verify, acceptance criteria, non-goals, and links.
- Uses chips for Project, PRD, and Tech Spec when available.
- Does not attach PRD or Tech Spec documents to the Issue.
- Does not include PR chips before a real PR exists.

## Review Findings

Review findings must distinguish:

- `blocking`: must be resolved before the workflow can move forward.
- `proposed-fix`: concrete change recommended before handoff or ship.
- `decision`: user/product judgment needed.
- `fyi`: useful observation that does not block progress.

Findings should include evidence, impact, recommended action, and owner workflow.
