---
name: linear-check
description: Use when checking Linear Project, PRD, Tech Spec, Issue, or ship readiness before moving a workflow to the next stage.
---

# Linear Check

Use this skill as a report-only, best-effort transition gate. It inspects Linear context and reports whether the workflow can move forward. It does not provide deterministic proof and must not rewrite artifacts silently.

Read first:

1. `AGENTS.md`
2. `references/artifact-rules.md`
3. `references/readiness-gates.md`
4. `references/lifecycle.md`
5. `templates/check-output.md`

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
- `adapter`

Rules:

- Fetch fresh Linear Project, PRD, Tech Spec, and Issue state before judging readiness.
- Treat Linear Project, PRD, Tech Spec, and Issue as durable source of truth.
- Treat GitHub as branch, PR, review, CI, and merge history only.
- Return `PASS` only when required state was inspected and no blocking drift was found.
- Return `FAIL` loudly when a hard workflow contract was violated.
- Return `BLOCKED` when artifacts cannot be inspected because context or permissions are unavailable.
- Never edit Project, documents, or Issues from `linear-check`. If the user asks to sync or fix artifacts, report the owner workflow to run.
- Do not use Project Updates as a required gate; use Linear comments for user review acceptance.
- Checks are report-only. They must not silently repair drift.
- Judge artifact shape by semantics before exact heading spelling. Do not fail merely because a heading label differs when the artifact still has the right product/implementation/execution shape.
- Do fail when a document has the wrong responsibility: PRD invents HOW, Tech Spec invents WHAT, Issue copies whole PRD/Spec bodies, or Project becomes a workflow dashboard.
- Do not emit review findings, proposed fixes, decisions, or FYI sections. Those belong to `linear-review`.
- Treat `linear-review` as a risk-based quality gate and `linear-check` as the readiness status reporter.
- For standard, deep, or risky work, return `FAIL` if the required `linear-review` gate is missing, unresolved, or replaced by an unrecorded exception.
- For tiny advisory work, allow skipped `linear-review` only when the advisory reason is recorded in the relevant Project or Issue review-gate field.
- When checking adapter status in an upstream checkout, run or report `scripts/sync-consumer.mjs --repo <consumer> --check` output.
- When checking adapter status inside a generated consumer install, run or report `node .agents/linear-workflow-check.mjs` output.
- Do not install, update, or rewrite generated skills from `linear-check`.

Mode checks:

- `idea`: PASS only when Project URL/id exists, Project status is `Idea`, strengthened brief exists, no premature PRD/Tech Spec/Issue exists, final output contains no implementation plan, and next step is explicitly `/office-hours` or `/brainstorming`.
- `idea`: FAIL when no Project exists, Project is not `Idea`, the agent wrote a plan instead of creating the Project, implementation started, PRD/Tech Spec/Issue was created without explicit repair context, the session ended without Project link and did not mark `linear-idea` as `BLOCKED / INCOMPLETE`, or no next shaping skill was recommended.
- `discovery`: Project is in Discovery or an equivalent pre-delivery state, discovery outputs are available, no implementation has started from a raw discovery plan, and the next required durable mutation is `linear-handoff`.
- `discovery`: PASS when PRD and Tech Spec exist but Project remains pre-delivery; FAIL when Project moved to Delivery merely because PRD or Tech Spec exists.
- `handoff`: PASS when Project, PRD, Tech Spec, and proposed or created Issue slicing are current; Project body is a concise product brief; package approval is recorded as a Linear comment; required `linear-review handoff` ran or a tiny advisory exception is recorded; and implementation has not started from raw `/office-hours`, `/brainstorming`, or review plan. Return `BLOCKED` when the package is otherwise valid but approval is pending.
- `issue`: Issue belongs to the Project, is a one-PR contract, has required sections, includes `Прочитать сначала` / Read first context, Project/PRD/Tech Spec chips plus context snapshot, adds PRD/Tech Spec as resources/links when available, has coherent review-gate status and disposition, and has no attached PRD/Tech Spec docs.
- `delivery`: Project is in Delivery, PRD is current, Tech Spec or explicit no-spec exception exists, approved execution Issue(s) exist, approval covers the current Issue set and implementation start, required/advisory review-gate record is coherent with the risk classification, and implementation starts from those Issue(s).
- `pre-ship`: branch/diff matches Issue, required `linear-review pre-ship` ran for standard, deep, risky, or materially drifted work, Linear artifacts are not stale, scope drift is reflected or accepted, and no durable body contains obsolete PR chips or raw PR URLs.
- `post-ship`: Issue has PR chip/status, `In Review` after PR creation, `Done` after merge/user acceptance, and final drift is synced back to Linear.
- `adapter`: generated consumer skills are full executable copies, Claude wrappers point to `.agents`, the consumer lockfile pins an immutable commit plus copied asset hashes, and drift is reported from `scripts/sync-consumer.mjs --repo <consumer> --check` or the generated `.agents/linear-workflow-check.mjs`.

Content-shape checks:

- Project: concise product brief. Relationships, status, review acceptance, and links live in Linear metadata, resources, or comments.
- PRD: WHAT document. It defines operator, problem, target workflow, requirements, non-goals, acceptance, and success criteria. Standard/Deep PRDs should use stable `R` requirement IDs and acceptance examples when behavior is conditional.
- Tech Spec: HOW document. It traces important design decisions back to PRD requirements when IDs exist, captures contracts/boundaries/validation/rollout, and does not redefine product behavior.
- Issue: one-PR execution contract. It contains chips for Project/PRD/Tech Spec, resource links when available, an implementation-critical context snapshot, and concrete validation/acceptance.

Hard FAIL examples:

- `linear-idea` ended without a Linear Project link.
- An agent performed deep implementation discovery and wrote an implementation plan during Idea instead of creating the Project.
- A discovery implementation plan was approved directly without passing through `linear-handoff`.
- PRD, Tech Spec, or Issue was created during Idea without explicit repair context.
- Code implementation started before approved Linear Issue(s) existed.
- Project moved to Delivery with PRD and Tech Spec but no approved execution Issue or no implementation-start approval.
- Durable Project, PRD, Tech Spec, or Issue body contains workflow mechanics such as `linear-check`, `Skill contracts`, lifecycle gates, or agent-only instructions.
- Standard, deep, risky, or materially drifted work moved forward without the required `linear-review` gate.
- A no-spec exception was used for non-tiny work without `linear-review`.
- Installed consumer `.agents/skills/linear-*` files are redirect adapters instead of full executable skill bodies.

Output:

- Use `templates/check-output.md`.
- Keep output concise.
- Include the exact mode in the status line.
- For FAIL, lead with `FAIL - Linear <mode> not ready`.
