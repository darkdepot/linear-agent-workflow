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
- Requirements and scenarios have actor -> capability -> benefit coverage.
- States behavior-validation intent without leaking commands, file paths, or HOW.
- Marks PRD-lite when discovery was explicitly skipped and calls out lower confidence.
- Keeps implementation architecture out of the PRD unless the product itself is an agent-workflow mechanism and the boundary is necessary to explain operator experience.

## Tech Spec

Required quality:

- Defines HOW the approved PRD will be built.
- Traces back to PRD requirements.
- Uses stable implementation unit IDs (`U1`, `U2`, ...).
- Describes architecture, contracts, system-wide impact, failure modes, validation, rollout, and rollback.
- For deep or risky work, identifies the stable interface or seam and avoids shallow pass-through modules.
- Preserves explicit no-spec exceptions only for tiny, low-risk work.
- Avoids historical transcript summaries and repair archaeology.

## Issue

Required quality:

- Defines one PR by default.
- Includes `Прочитать сначала` / Read first context.
- States `AFK` or `HITL` readiness and names any human dependency.
- Lists parent/source package, blockers, and whether the Issue can start immediately.
- For bug or performance work, captures current behavior, desired behavior, reproduction or baseline, and fix-proof expectation.
- Names key contracts when needed without becoming a stale file/line edit script.
- Records review-gate state with risk, required/advisory/skipped status, verdict, evidence or comment link, finding disposition, owner workflow, and next step.
- Carries a context snapshot from Project, PRD, and Tech Spec.
- Lists where to change, how to verify, acceptance criteria, non-goals, and links.
- Uses chips for Project, PRD, and Tech Spec when available.
- Does not attach PRD or Tech Spec documents to the Issue.
- Does not include PR chips before a real PR exists.
- Avoids line numbers and brittle implementation choreography.

## Preflight Certificate

Required quality:

- Starts with the stable marker `linear-preflight certificate` when recorded in Linear.
- States one status: `ready`, `blocked`, `drift-candidate`, or `needs-human`.
- Names the Linear Issue(s), branch, and commit state.
- Summarizes changed files without copying the full diff.
- Lists local verification commands and outcomes.
- States the final selected-scope `autoreview` command, loop outcome, final clean result, fixes applied from accepted findings, and any residual actionable findings. `ready` requires no residual actionable findings.
- Calls out drift candidates against Project, PRD, Tech Spec, and Issue.
- Includes a compact checked/not-checked boundary for manual QA, browser QA, mobile QA, deploy verification, and user acceptance.
- Names the next owner workflow: `linear-ship`, `linear-handoff`, or human decision.
- Is durable in Linear comments or resources so a fresh `linear-ship` agent can recover it.

It must not claim `linear-review pre-ship`, `linear-check pre-ship`, PR creation, merge, deploy, closeout, or readiness from a review path that replaced/skipped `autoreview`.

## Ship Green Certificate

Required quality:

- Starts with the stable marker `linear-ship green certificate` when recorded in Linear.
- States `Ship: green`.
- Names the Linear Issue(s), PR number/URL, and reviewed head SHA.
- References the preflight certificate and pre-ship review outcome.
- States whether the Documentation workflow ran and whether it changed the head SHA.
- Summarizes CI, Greptile, unresolved review threads, and merge state.
- Includes a compact checked/not-checked boundary for manual QA, browser QA, mobile QA, production smoke, deploy verification, and user acceptance.
- Names the next owner workflow: `linear-deploy`.
- Is durable in Linear comments or resources so a fresh `linear-deploy` agent can recover it.

It must not claim merge, deploy, post-ship check, Linear closeout, or production verification.

## Deploy Closeout

Required quality:

- References the `linear-ship green certificate` and reviewed head SHA.
- Confirms the current PR head SHA matched the certificate before deploy.
- Names the configured Deploy workflow.
- Captures merged SHA, deploy target, and deploy verification evidence when available.
- Reports `linear-check post-ship` outcome or why it could not run.
- States whether Linear was moved to `Done` and why.
- Lists durable learnings recorded, or `none`.
- Includes checked/not-checked boundaries for manual QA, browser QA, mobile QA, and production smoke.

## Review Findings

Review findings must distinguish:

- `blocking`: must be resolved before the workflow can move forward.
- `proposed-fix`: concrete change recommended before handoff or ship.
- `decision`: user/product judgment needed.
- `fyi`: useful observation that does not block progress.

Findings should include evidence, impact, recommended action, and owner workflow.
