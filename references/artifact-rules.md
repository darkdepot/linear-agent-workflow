# Linear Artifact Rules

Linear-facing content must follow the consumer config language policy.

If no consumer config is present, use Russian for:

- Project summary/body
- PRD
- Tech Spec
- Issue description
- Linear comments

Repo skill instructions must be in English.

Source-of-truth policy:

- Linear owns requirements and implementation contracts.
- GitHub owns PR/review/CI/merge history.
- GitHub Issues are not the implementation source of truth.
- `/office-hours`, `/brainstorming`, `/plan-design-review`, and `/plan-eng-review` outputs are discovery inputs until `linear-handoff` persists them to Linear.
- Local markdown plans are temporary execution scratch unless explicitly promoted into Linear by `linear-handoff`.

Document policy:

- Active Project document types for this MVP are PRD and Tech Spec.
- Attach PRD and Tech Spec to the Project, not to the Issue.
- The Issue should contain chips and an implementation-critical snapshot, not attached docs.
- Use Linear chips/entity mentions where available.
- Do not leave obsolete or closed PR chips in durable Project, PRD, Tech Spec, or Issue body.
- Do not use raw PR/document URLs in durable body when Linear chips can represent the entity.

Review policy:

- User review acceptance is recorded as a Linear comment.
- Project Updates are not a required gate.
- `linear-check` reports drift; it does not silently fix it.
- Raw discovery implementation plans must not be approved directly in this workflow; run `linear-handoff` first.
