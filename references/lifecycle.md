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

Forbidden:

- Treating discovery artifacts as durable Linear truth.
- Approving a discovery implementation plan directly.
- Starting implementation from a raw discovery or review plan.

Gate: `linear-check discovery`, then `linear-handoff`.

## Handoff

Turn discovery into Linear-backed delivery.

Required:

- Project in Delivery.
- Current PRD.
- Current Tech Spec.
- User approval recorded as a Linear comment.
- Proposed Issue slicing.

Forbidden:

- Code changes during handoff.
- PR creation during handoff.
- Implementation before approved Issue(s) exist.

Gate: `linear-check handoff`.

## Delivery

Prepare implementation from approved Linear Issue(s).

Required:

- Project in Delivery.
- Current PRD.
- Current Tech Spec or explicit no-spec exception.
- Approved Issue plan.

Gate: `linear-check delivery`.

## Issue

Create the one-PR execution contract.

Required:

- Issue attached to the Project.
- Context snapshot from Project, PRD, and Tech Spec or exception.
- Concrete validation.
- User approval of the handoff package.

Gate: `linear-check issue`.

## Ship

Create and review PR without losing Linear source of truth.

Required:

- `linear-check pre-ship`.
- Delegate PR creation to configured ship workflow.
- Issue moves to `In Review` after PR creation.
- Issue moves to `Done` after merge/user acceptance.
- `linear-check post-ship`.
