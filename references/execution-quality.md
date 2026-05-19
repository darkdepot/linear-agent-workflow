# Execution Quality Layer

Use this reference to make Linear PRDs, Tech Specs, and Issues easier for a
zero-context implementation agent to execute safely.

This layer borrows engineering guardrails from external skill packs, but it
does not change the workflow source of truth:

- Linear owns Project, PRD, Tech Spec, Issue, review acceptance, and drift.
- GitHub owns branch, PR, review, CI, deploy, and merge history.
- PRD remains WHAT, Tech Spec remains HOW, Issue remains one-PR execution.

## PRD Coverage

PRD requirements and scenarios should cover:

- actor: who takes the action or experiences the result;
- capability: what the workflow lets them do or understand;
- benefit: why that behavior matters.

Do not add a long user-story section by default. Use the
`actor -> capability -> benefit` shape as a coverage check for scenarios and
requirements. If a requirement has no clear actor or benefit, sharpen it before
handing it to Tech Spec or Issue creation.

PRDs should also state behavior-validation intent: the user-visible behaviors
that later Tech Spec and Issue validation must be able to prove. This is not a
command list and must not name test files. It is the product-facing proof
target.

## Durable Issue Writing

Issues may sit for days or weeks before an agent implements them. Write them so
they survive ordinary refactors.

Prefer:

- current behavior and desired behavior;
- observable behavior, contracts, and invariants;
- stable type, config, endpoint, or domain contract names when they matter;
- acceptance criteria that can be checked independently.

Avoid:

- line numbers;
- brittle "open this file and change this function" instructions;
- step-by-step implementation choreography;
- copying full PRD or Tech Spec bodies into the Issue.

File paths are allowed only when they are stable surfaces a zero-context agent
must read first, not when they are used as a fragile edit script.

## Agent Readiness

Every execution Issue should state whether it is `AFK` or `HITL`.

`AFK` means a coding agent can implement and verify the Issue from the Linear
artifact set without new human judgment.

`HITL` means a human decision, design judgment, external access, manual QA, or
risk acceptance is still required before the Issue is safe to execute.

When Issues are split, each slice must be vertical:

- it cuts through the needed product/implementation layers for one complete
  path;
- it is demoable or verifiable on its own;
- dependencies are explicit as `Blocked by` or `None - can start immediately`.

Prefer one strong Issue by default. Split only when one PR is too large or when
independent vertical slices can safely move in parallel.

## Bug And Performance Proof

Bug and performance Issues need a feedback-loop contract.

Before implementation starts, the Issue should capture one of:

- reproduction steps;
- a failing test or command;
- a browser, CLI, curl, trace, fixture, or benchmark loop;
- an explicit reason the original symptom cannot be reproduced yet.

Before ship, the PR should report:

- the original symptom or baseline;
- the proof that the symptom no longer reproduces, or that the metric improved;
- the regression test or documented test-seam gap;
- any manual QA, browser QA, production smoke, deploy, or mobile checks not run.

Do not let "tests passed" replace proof of the user-reported symptom.

## Tracer-Bullet Implementation

Implementation Issues should encourage one behavior at a time:

- add or identify one behavior proof;
- make the smallest implementation change that satisfies it;
- repeat for the next behavior;
- refactor only after the behavior proof is green.

Do not ask the implementation agent to write all tests first and then all code.
That creates horizontal slices and weak feedback.

## Architecture Lens

For `deep` and `risky` work, review the plan and diff with these terms:

- Module: anything with an interface and an implementation.
- Interface: everything a caller must know, including invariants, ordering,
  error modes, and configuration.
- Seam: where the interface lives.
- Adapter: a concrete implementation at a seam.

Checks:

- deletion test: deleting the module should cause meaningful complexity to
  reappear across callers; otherwise it may be a pass-through;
- interface is the test surface: tests should prove behavior through the same
  surface callers use;
- one adapter is usually a hypothetical seam, two adapters make the seam real;
- avoid shallow modules whose interface is nearly as complex as the
  implementation.
