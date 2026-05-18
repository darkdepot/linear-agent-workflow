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

Gate: `linear-review handoff` when required or advisory, then `linear-check handoff`.

## Issue

Create the one-PR execution contract.

Required:

- Issue attached to the Project.
- `Прочитать сначала` / Read first context.
- Review-gate record.
- Context snapshot from Project, PRD, and Tech Spec or exception.
- Concrete validation.
- User approval of the handoff package.
- Linear chips for Project, PRD, and Tech Spec where available.

Forbidden:

- Attached PRD or Tech Spec documents on the Issue.
- Raw document URLs when Linear chips can represent the entities.
- Code changes before the Issue is sufficient for another agent.

Gate: `linear-check issue`.

## Delivery

Prepare implementation from approved Linear Issue(s). Delivery starts only after execution Issue(s) exist and implementation is ready to begin.

Required:

- Project in Delivery.
- Current PRD.
- Current Tech Spec or explicit no-spec exception.
- Approved execution Issue(s).
- Approval covers the current Issue set and explicitly allows implementation start.
- Required review findings resolved, accepted, or explicitly deferred.
- Implementation starts from the approved Issue(s), not from raw discovery output.

Forbidden:

- Passing delivery readiness with only PRD and Tech Spec.
- Moving to Delivery when package approval did not authorize implementation start.
- Starting implementation from a raw `/office-hours`, `/brainstorming`, or review plan.

Gate: `linear-check delivery`.

## Ship

Create, stabilize, land, and close out a PR without losing Linear source of truth.

Required:

- `linear-review pre-ship` when risk is standard, deep, risky, or implementation materially drifted from Linear artifacts.
- `linear-check pre-ship`.
- Delegate PR creation to configured ship workflow.
- Issue moves to `In Review` after PR creation.
- If configured, delegate review feedback stabilization to the configured resolver.
- If configured, delegate merge/deploy to the configured land workflow.
- Issue moves to `Done` after merge/user acceptance.
- `linear-check post-ship`.
