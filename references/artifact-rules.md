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
- Artifact intake follows `references/artifact-intake.md`: local discovery files are scoped evidence, not broad-search source of truth.

Document policy:

- Active Project document types for this MVP are PRD and Tech Spec.
- Project body is a concise product brief with only five concerns: what, why, target outcome, in scope, and out of scope. Render headings in the consumer config language; default Russian headings are `Что`, `Зачем`, `Образ результата`, `Что входит`, and `Что не входит`.
- Do not put active docs, active issues, lifecycle bookkeeping, status tracking, or workflow mechanics in the Project body.
- PRD is the WHAT artifact. It defines operator, problem, target workflow, requirements, acceptance examples, success criteria, and non-goals.
- Tech Spec is the HOW artifact. It defines architecture, contracts, boundaries, risks, files/surfaces, validation, rollout, and rollback against the approved PRD.
- Issue is the one-PR execution contract. It should be enough for a zero-context implementation agent without copying the whole PRD or Tech Spec.
- Execution quality follows `references/execution-quality.md`: PRDs cover actor, capability, and benefit; Issues state `AFK` or `HITL`, dependencies, key contracts, and bug/perf feedback-loop proof when relevant.
- Prefer content-shape correctness over exact heading policing. Headings help readers, but the hard contract is responsibility separation: Project = product brief, PRD = WHAT, Tech Spec = HOW, Issue = execution.
- Attach PRD and Tech Spec to the Project, not to the Issue.
- The Issue should contain chips and an implementation-critical snapshot, not attached docs.
- Add PRD and Tech Spec as Issue resources/links when the connector supports it.
- Use Linear chips/entity mentions where available.
- Do not leave obsolete or closed PR chips in durable Project, PRD, Tech Spec, or Issue body.
- Do not use raw PR/document URLs in durable body when Linear chips can represent the entity.
- Keep workflow mechanics internal to skills, checks, and handoff summaries; do not leak `linear-check`, lifecycle gates, or agent instructions into Linear-facing Project, PRD, Tech Spec, or Issue bodies.

Review policy:

- User review acceptance is recorded as a Linear comment.
- Package approval authorizes durable Project/PRD/Tech Spec updates and Issue creation from the previewed package. The approval comment should name the approved package, PRD/Tech Spec links or intended titles, approved Issue slice titles or ids, and whether implementation may start.
- If approval is missing, rejected, changes are requested, or the approval comment cannot be recorded, do not create execution Issues, do not move the Project to Delivery, and return `BLOCKED` or `INCOMPLETE` with current links.
- Implementation-start approval is owned by `linear-implement`. `linear-handoff` may record that implementation may start, but `linear-implement` verifies or obtains that approval before moving the Project to Delivery.
- Project Updates are not a required gate.
- `linear-review` is report-only. It returns findings, proposed fixes, decisions, FYI notes, verdict, risk, and next workflow.
- `linear-check` reports drift; it does not silently fix it.
- `linear-check` owns `PASS`, `FAIL`, and `BLOCKED`; `linear-review` must not use those as its main status.
- `linear-handoff`, explicit atomic skills, or `linear-ship` apply accepted fixes from a review report.
- `linear-implement` owns Delivery Start and implementation execution from approved Issue(s).
- `linear-preflight` owns local branch readiness, self-review, targeted verification, commit state, and preflight certificate.
- `linear-ship` owns formal pre-ship review/check, PR creation, review-loop stabilization, landing/deploy delegation, and closeout.
- Risk-based review gates follow `references/readiness-gates.md`.
- Tiny PRD-lite or no-spec exceptions may use advisory review only when the exception and reason are recorded.
- Raw discovery implementation plans must not be approved directly in this workflow; run `linear-handoff` first.
