---
name: mono-check
description: Use when checking Linear Project, PRD, Tech Spec, Issue, or ship readiness before moving a workflow to the next stage.
---

# Mono Check

Use this skill as a report-only, best-effort transition gate. It inspects Linear context and reports whether the workflow can move forward. It does not provide deterministic proof and must not rewrite artifacts silently.

Read first:

1. `AGENTS.md`
2. `references/artifact-rules.md`
3. `references/readiness-gates.md`
4. `references/execution-quality.md`
5. `references/lifecycle.md`
6. `references/human-friendly-output.md`
7. `templates/check-output.md`

Statuses:

- `PASS`: required state was inspected and no blocking drift was found.
- `FAIL`: the workflow violated a hard contract or skipped a required artifact.
- `BLOCKED`: the check cannot complete because required context or permissions are unavailable.

Modes:

- `idea`
- `discovery`
- `delivery`
- `issue`
- `handoff`
- `pre-ship`
- `post-ship`
- `project-config`

Rules:

- Fetch fresh Linear Project, PRD, Tech Spec, and Issue state before judging readiness.
- Treat Linear Project, PRD, Tech Spec, and Issue as durable source of truth.
- Treat GitHub as branch, PR, review, CI, and merge history only.
- Return `PASS` only when required state was inspected and no blocking drift was found.
- Return `FAIL` loudly when a hard workflow contract was violated.
- Return `BLOCKED` when artifacts cannot be inspected because context or permissions are unavailable.
- Keep `PASS`, `FAIL`, and `BLOCKED` in the status line for machine readability, but add a one-line human meaning immediately after it.
- Never edit Project, documents, or Issues from `mono-check`. If the user asks to sync or fix artifacts, report the owner workflow to run.
- Do not use Project Updates as a required gate; use Linear comments for user review acceptance.
- Checks are report-only. They must not silently repair drift.
- Judge artifact shape by semantics before exact heading spelling. Do not fail merely because a heading label differs when the artifact still has the right product/implementation/execution shape.
- Do fail when a document has the wrong responsibility: PRD invents HOW, Tech Spec invents WHAT, Issue copies whole PRD/Spec bodies, or Project becomes a workflow dashboard.
- Do not emit review findings, proposed fixes, decisions, or FYI sections. Those belong to `mono-review`.
- Treat `mono-review` as a risk-based quality gate and `mono-check` as the readiness status reporter.
- For standard, deep, or risky work, return `FAIL` if the required `mono-review` gate is missing, unresolved, or replaced by an unrecorded exception.
- For tiny advisory work, allow skipped `mono-review` only when the advisory reason is recorded in the relevant Project or Issue review-gate field.
- When checking project config status in an upstream checkout, run or report `node scripts/project-config.mjs --repo <project> --check` output.
- When checking project config status from inside a project repo, inspect `.agents/mono-workflow.config.json` and verify legacy vendored workflow files are absent, or route to the upstream `scripts/project-config.mjs --repo <project> --check`.
- Do not install, update, remove, or rewrite workflow skills from `mono-check`.
- Include a compact "checked / not checked" boundary. `PASS` must not imply uninspected manual QA, browser QA, production smoke, deploy verification, or user acceptance.

Mode checks:

- `idea`: PASS only when Project URL/id exists, Project status is `Idea`, strengthened brief exists, no premature PRD/Tech Spec/Issue exists, final output contains no implementation plan, and next step is explicitly `/office-hours` or `/brainstorming`.
- `idea`: FAIL when no Project exists, Project is not `Idea`, the agent wrote a plan instead of creating the Project, implementation started, PRD/Tech Spec/Issue was created without explicit repair context, the session ended without Project link and did not mark `mono-idea` as `BLOCKED / INCOMPLETE`, or no next shaping skill was recommended.
- `idea` (issue-only route): PASS when the request was correctly routed to the `mono-issue-intake` front door as unmistakable one-PR issue-only work and no Project was created by design; the missing Project is expected, not a FAIL. Ambiguous or project-shaped ideas still require a Project by the rules above.
- `discovery`: Project is in Discovery or an equivalent pre-delivery state, discovery outputs are available, no implementation has started from a raw discovery plan, and the next required durable mutation is `mono-handoff`.
- `discovery`: PASS when PRD and Tech Spec exist but Project remains pre-delivery; FAIL when Project moved to Delivery merely because PRD or Tech Spec exists.
- `handoff`: PASS when Project, PRD, Tech Spec, and proposed or created Issue slicing are current; Project body is a concise product brief; package approval is recorded as a Linear comment; required `mono-review handoff` ran or a tiny advisory exception is recorded; and implementation has not started from raw `/office-hours`, `/brainstorming`, or review plan. Return `BLOCKED` when the package is otherwise valid but approval is pending.
- `issue`: Issue belongs to the Project, is a one-PR contract, has required sections, includes `Прочитать сначала` / Read first context, `AFK` or `HITL` readiness, dependencies/blockers, Project/PRD/Tech Spec chips plus context snapshot, adds PRD/Tech Spec as resources/links when available, has coherent review-gate status and disposition, and has no attached PRD/Tech Spec docs.
- `issue`: bug/perf Issues include current behavior, desired behavior, reproduction or baseline, and fix-proof expectation, or explicitly say why the original symptom cannot be reproduced yet.
- `issue` (issue-only lane): confirm the package actually resolves issue-only through the resolver — do not PASS on marker and label text alone, which an unauthorized participant could forge (the fingerprint is publicly computable). Read the project config, locate the authenticated owner-approval comment, verify its author against `issueOnlyLane.ownerPrincipal`, read the current `mono-issue-only marker` comment, and run the installer-published `resolve-issue-context.mjs` with the Issue body (`--issue`), that marker comment (`--marker`, since the marker lives in a Linear comment, not the Issue body), `--config`, the verified `--label issue-only`, and `--approval-verified <fingerprint>`; PASS only when it returns `package_kind=issue-only`. Then judge it against the issue-only contract — a self-contained one-PR contract with objective/scope/desired behavior, acceptance criteria with stable IDs, verification, non-goals, the five-field marker, and the owner-approved scope fingerprint — without requiring a parent Project, PRD/Tech Spec chips, or resource links. In Phase 1 the package must also sit in a pre-start Linear state: its state type must be one of `triage`, `backlog`, or `unstarted`. Reject `started` (an unsupported activation the downstream delivery stages cannot consume until Slices 3-5, MONO-16..MONO-18, land) and reject the terminal types `completed` and `canceled` (a finished or abandoned Issue is not a package prepared for future activation); any of these returns `FAIL`. If the resolver returns project-first, or the approval author is not the owner principal, return `FAIL` or `BLOCKED`.
- `delivery`: Project is in Delivery, PRD is current, Tech Spec or explicit no-spec exception exists, approved execution Issue(s) exist, approval covers the current Issue set and implementation start, required/advisory review-gate record is coherent with the risk classification, and `mono-implement` starts from those Issue(s).
- `pre-ship`: branch/diff matches Issue, local branch readiness is known through a `mono-preflight` certificate, required `mono-review pre-ship` ran for standard, deep, risky, or materially drifted work, Linear artifacts are not stale, scope drift is reflected or accepted, and no durable body contains obsolete PR chips or raw PR URLs.
- `post-ship`: Issue has PR chip/status, `In Review` after PR creation, `Done` only after verified deploy or explicit accepted delivery policy, deploy evidence is recorded, post-ship drift is synced back to Linear, and learning capture is reported when relevant.
- `project-config`: the project repo has `.agents/mono-workflow.config.json`, required config fields are present, `prerequisites.autoreviewHelper` is `true`, no unresolved placeholders remain, and no legacy generated Mono files or previous-brand `.agents/linear-workflow*`, `.agents/skills/linear-*`, `.claude/skills/linear-*`, or `.github/workflows/update-linear-*.yml` files remain.

Content-shape checks:

- Project: concise product brief. Relationships, status, review acceptance, and links live in Linear metadata, resources, or comments.
- PRD: WHAT document. It defines operator, problem, target workflow, requirements, non-goals, acceptance, and success criteria. Standard/Deep PRDs should use stable `R` requirement IDs and acceptance examples when behavior is conditional.
- Tech Spec: HOW document. It traces important design decisions back to PRD requirements when IDs exist, captures contracts/boundaries/validation/rollout, and does not redefine product behavior.
- Issue: one-PR execution contract. It contains chips for Project/PRD/Tech Spec, resource links when available, `AFK` or `HITL` readiness, dependencies, key contracts when useful, an implementation-critical context snapshot, and concrete validation/acceptance.

Hard FAIL examples:

- `mono-idea` ended without a Linear Project link, unless it routed unmistakable one-PR issue-only work to `mono-issue-intake` (the issue-only front door creates no Project by design).
- An agent performed deep implementation discovery and wrote an implementation plan during Idea instead of creating the Project.
- A discovery implementation plan was approved directly without passing through `mono-handoff`.
- PRD, Tech Spec, or Issue was created during Idea without explicit repair context.
- Code implementation started before approved Linear Issue(s) existed.
- Project moved to Delivery with PRD and Tech Spec but no approved execution Issue or no implementation-start approval.
- Project moved to Delivery outside `mono-implement` without an explicit implementation-start approval record.
- Durable Project, PRD, Tech Spec, or Issue body contains workflow mechanics such as `mono-check`, `Skill contracts`, lifecycle gates, or agent-only instructions.
- Standard, deep, risky, or materially drifted work moved forward without the required `mono-review` gate.
- A no-spec exception was used for non-tiny work without `mono-review`.
- A project repo still vendors `.agents/skills/mono-*`, `.claude/skills/mono-*`, workflow lockfiles, local workflow checkers, or updater CI for this workflow.

Output:

- Use `templates/check-output.md`.
- Keep output concise.
- Include the exact mode in the status line.
- For FAIL, lead with `FAIL - Linear <mode> not ready`.
- For BLOCKED, name the smallest useful unblock step.
