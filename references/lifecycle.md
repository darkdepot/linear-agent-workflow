# Linear Lifecycle

## Idea

Capture a strengthened idea without premature delivery artifacts. `linear-idea` is an intake gate, not a planning skill.

Required:

- Project in Idea.
- Strengthened brief from raw idea plus AskQuestion answers.
- Recommendation for `/office-hours` or `/brainstorming`.

Forbidden:

- PRD.
- Tech Spec.
- Issue.
- ExecPlan.
- Implementation plan.
- Code changes.

Gate: `linear-check idea`.

## Discovery

Use Plan Mode discovery and review skills to shape the idea.

Required:

- Project from `linear-idea`.
- `/office-hours` or `/brainstorming` output when product shape is unclear.
- `/plan-design-review` when UI or product surface needs design review.
- `/plan-eng-review` when architecture is ready to review.
- Handoff to `linear-handoff` instead of direct implementation approval.
- PRD and Tech Spec may exist while the Project remains in Discovery.

Forbidden:

- Treating discovery artifacts as durable Linear truth.
- Approving a discovery implementation plan directly.
- Starting implementation from a raw discovery or review plan.
- Moving the Project to Delivery merely because PRD or Tech Spec exists.

Gate: `linear-check discovery`, then `linear-handoff`.

## Handoff

Turn discovery into a Linear-backed execution package.

Required:

- Project remains in Discovery or an equivalent configured pre-delivery state. If no separate pre-delivery status exists, keep Discovery and record handoff readiness in comments or check output.
- Artifact intake summary following `references/artifact-intake.md`.
- Current PRD.
- Current Tech Spec.
- Package approval recorded as a Linear comment.
- Risk classification and review-gate policy.
- `linear-review handoff` when required by `references/readiness-gates.md`.
- User approval recorded as a Linear comment.
- Proposed Issue slicing.

Forbidden:

- Code changes during handoff.
- PR creation during handoff.
- Implementation before approved Issue(s) exist.
- Moving the Project to Delivery before approved execution Issue(s) exist.
- Moving the Project to Delivery from `linear-handoff`; Delivery Start belongs to `linear-implement`.

Gate: `linear-review handoff` when required or advisory, then `linear-check handoff`.

## Issue

Create the one-PR execution contract.

Required:

- Issue attached to the Project.
- `Прочитать сначала` / Read first context.
- `AFK` or `HITL` readiness with the exact human dependency when present.
- Dependencies and blockers.
- Review-gate record.
- Context snapshot from Project, PRD, and Tech Spec or exception.
- Current vs desired behavior plus reproduction or baseline for bug/perf work.
- Key contracts when they matter for implementation.
- Concrete validation.
- User approval of the handoff package.
- Linear chips for Project, PRD, and Tech Spec where available.

Forbidden:

- Attached PRD or Tech Spec documents on the Issue.
- Raw document URLs when Linear chips can represent the entities.
- Code changes before the Issue is sufficient for another agent.

Gate: `linear-check issue`.

## Delivery

Prepare and run implementation from approved Linear Issue(s). Delivery starts through `linear-implement` only after execution Issue(s) exist and implementation is ready to begin.

Required:

- Project in Delivery.
- Current PRD.
- Current Tech Spec or explicit no-spec exception.
- Approved execution Issue(s).
- Approval covers the current Issue set and explicitly allows implementation start.
- Required review findings resolved, accepted, or explicitly deferred.
- Implementation starts from the approved Issue(s), not from raw discovery output.
- `linear-implement` verifies or obtains implementation-start approval, moves the Project to Delivery, runs or reports `linear-check delivery`, records the start comment, and selects the implementation engine.
- `linear-implement` exits as `implemented-needs-preflight`, `blocked`, `scope-drift-needs-handoff`, or `needs-human`.
- Prior operational learnings consulted through `gstack-learnings-search` when the helper is available, advisory only.

Forbidden:

- Passing delivery readiness with only PRD and Tech Spec.
- Moving to Delivery when package approval did not authorize implementation start.
- Starting implementation from a raw `/office-hours`, `/brainstorming`, or review plan.
- Creating PRs, running pre-ship review/check, deploy, or closeout from `linear-implement`.

Gate: `linear-check delivery`.

## Preflight

Prepare the local implementation branch for ship without taking over PR lifecycle.

Required:

- Approved Linear Issue(s) and implementation output.
- Branch/worktree state inspected.
- Local diff compared against Project, PRD, Tech Spec, and Issue.
- Targeted tests/checks run or explicitly reported as not run.
- Installed `autoreview` helper run until it reports clean, or preflight exits `blocked`/`needs-human`.
- Commit state reported, with commits created only when safe and configured.
- Preflight certificate emitted with status `ready`, `blocked`, `drift-candidate`, or `needs-human`.

Forbidden:

- Running or claiming `linear-review pre-ship`.
- Running or claiming `linear-check pre-ship`.
- Creating the final PR.
- Merging, deploying, or closing Linear Issues.
- Replacing `autoreview` with Compound `ce-code-review`, built-in `/review`, ad hoc review, or a hand-written self-review.

Gate: `linear-preflight` certificate, then `linear-ship`.

## Ship

Create, document, and stabilize a PR without losing Linear source of truth.

Required:

- Read the `linear-preflight` certificate when present. If no recoverable certificate exists, route to `linear-preflight` before continuing.
- `linear-review pre-ship` when risk is standard, deep, risky, or implementation materially drifted from Linear artifacts.
- `linear-check pre-ship`.
- Delegate PR creation to configured ship workflow.
- Issue moves to `In Review` after PR creation.
- Run the configured Documentation workflow before final green when configured.
- If documentation changes the PR head, rerun review/check stabilization on the new head.
- If configured, delegate review feedback stabilization to the configured resolver.
- Poll checks, GitHub review state, unresolved threads, and Greptile every 10 minutes until strict green or terminal stop.
- Record `linear-ship green certificate` with PR URL, head SHA, CI, Greptile, unresolved feedback count, merge state, checked/not-checked boundary, and next `linear-deploy`.

Forbidden:

- Merging or deploying.
- Closing Linear Issues as shipped.
- Running post-ship check.
- Recording deploy evidence or operational learnings.

Gate: `linear-ship green certificate`, then `linear-deploy`.

## Deploy

Merge/deploy a green PR and close out Linear only after delivery evidence exists.

Required:

- Read the latest `linear-ship green certificate`.
- Verify current PR head SHA still matches the certificate head SHA.
- Confirm the configured `Deploy workflow` exists and is not `None`.
- Delegate merge/deploy to the configured Deploy workflow.
- Capture merged SHA, deploy target, and deploy verification evidence.
- Run or report `linear-check post-ship` after deploy evidence is known.
- Move the Linear Issue to `Done` only after verified deploy or an explicit accepted delivery policy says merge is delivery for this repo.
- Consult prior operational learnings through `gstack-learnings-search` before delegating merge/deploy, advisory only.
- Record durable operational learnings through `gstack-learnings-log` when they would save future time.

Forbidden:

- Deploying when the PR head SHA differs from the green certificate.
- Running repo documentation workflow; repo docs belong before ship green.
- Running interactive `/learn prune`, `/learn export`, or `/learn stats` automatically.
- Inventing a merge/deploy path when `Deploy workflow` is missing or `None`.
