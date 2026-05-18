# Linear Review Rubric

Use this rubric from `linear-review` to inspect Linear Project, PRD, Tech Spec, and Issue packages.

`linear-review` is report-only. It must not create, update, delete, or silently repair Linear artifacts.

## Inputs

- Fresh Linear Project.
- Fresh PRD document, when expected.
- Fresh Tech Spec document, when expected.
- Fresh Issue(s), when expected.
- Discovery and review context when available.
- Consumer config for language, team, and configured workflows.

## Persona Lenses

Always apply:

- Coherence: artifact sections agree with each other.
- Feasibility: the proposed delivery can be implemented and verified.
- Scope: Issue slicing and non-goals keep the work to a one-PR contract by default.

Apply conditionally:

- Product: problem, operator, workflow, and acceptance are clear enough.
- Design: UI/product-surface flows, states, and edge cases are represented.
- Security/data: auth, permissions, privacy, migration, production data, or public API risks exist.
- Ship: pre-ship review, PR mapping, and closeout state are coherent.

## Checks

Project:

- Lifecycle status matches current stage.
- Active docs are PRD and Tech Spec unless an explicit exception exists.
- Active Issues represent current approved execution plan.
- No stale PR chips or raw PR URLs remain.

PRD:

- Defines WHAT and target operator.
- Requirements are stable and checkable.
- Flows and acceptance examples cover stateful or conditional behavior.
- Non-goals and assumptions prevent downstream invention.

Tech Spec:

- Defines HOW and traces to PRD requirements.
- Implementation units are stable and independently understandable.
- Failure modes, validation, rollout, and rollback are concrete.
- No-spec exception is justified when present.

Issue:

- One PR by default.
- Includes `Прочитать сначала` / Read first context, context snapshot, validation, acceptance, and non-goals.
- Uses Project, PRD, and Tech Spec chips.
- Does not attach PRD or Tech Spec docs.

Pre-ship:

- Branch or PR scope still matches Linear artifacts.
- Material drift is synced or explicitly accepted.
- Review feedback and unresolved decisions are represented.

## Finding Format

Each finding must include:

- Tier: `blocking`, `proposed-fix`, `decision`, or `fyi`.
- Artifact: Project, PRD, Tech Spec, Issue, or Ship.
- Evidence: short quote or artifact section reference.
- Impact: what goes wrong if ignored.
- Recommendation: concrete next action.
- Owner workflow: `linear-handoff`, `linear-ship`, `linear-issue`, `linear-prd`, `linear-spec`, or human decision.

## Report Shape

Use `templates/review-output.md`.

Do not emit `PASS`, `FAIL`, or `BLOCKED` as the main review status. Those words belong to `linear-check`.

Allowed review verdicts:

- `ready`
- `advisory-ready`
- `needs-fixes`
- `blocked`
