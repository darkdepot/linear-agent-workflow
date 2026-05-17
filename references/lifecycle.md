# Linear Lifecycle

## Idea

Capture a strengthened idea without premature delivery artifacts.

Required:

- Project in Idea.
- Strengthened brief from raw idea plus AskQuestion answers.
- Recommendation for `/brainstorming` or `/office-hours`.

Forbidden:

- PRD.
- Tech Spec.
- Issue.

Gate: `linear-check idea`.

## Discovery

Turn the idea into product truth.

Required:

- Project in Discovery.
- PRD after `/brainstorming` or `/office-hours`, or PRD-lite after explicit skip.
- User review handoff.

Gate: `linear-check discovery`.

## Delivery

Prepare implementation truth.

Required:

- Project in Delivery.
- Current PRD.
- Tech Spec from engineering review or lightweight engineering pass, or explicit no-spec exception.

Gate: `linear-check delivery`.

## Issue

Create the one-PR execution contract.

Required:

- Issue attached to the Project.
- Context snapshot from Project, PRD, and Tech Spec or exception.
- Concrete validation.

Gate: `linear-check issue`.

## Ship

Create, stabilize, land, and close out a PR without losing Linear source of truth.

Required:

- `linear-check pre-ship`.
- Delegate PR creation to configured ship workflow.
- Issue moves to `In Review` after PR creation.
- If configured, delegate review feedback stabilization to the configured resolver.
- If configured, delegate merge/deploy to the configured land workflow.
- Issue moves to `Done` after merge/user acceptance.
- `linear-check post-ship`.
