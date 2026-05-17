---
name: linear-check
description: Use when checking Linear Project, PRD, Tech Spec, Issue, or ship readiness before moving a workflow to the next stage.
---

# Linear Check

Use this skill as a report-only, best-effort transition gate. It inspects Linear context and reports whether the workflow can move forward. It does not provide deterministic proof and must not rewrite artifacts silently.

Read first:

1. `AGENTS.md`
2. `references/artifact-rules.md`
3. `references/lifecycle.md`
4. `templates/check-output.md`

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

Rules:

- Fetch fresh Linear Project, PRD, Tech Spec, and Issue state before judging readiness.
- Treat Linear Project, PRD, Tech Spec, and Issue as durable source of truth.
- Treat GitHub as branch, PR, review, CI, and merge history only.
- Return `PASS` only when required state was inspected and no blocking drift was found.
- Return `FAIL` loudly when a hard workflow contract was violated.
- Return `BLOCKED` when artifacts cannot be inspected because context or permissions are unavailable.
- Do not edit Project, documents, or Issues unless the user explicitly asked to sync or fix them.
- Do not use Project Updates as a required gate; use Linear comments for user review acceptance.
- Checks are report-only. They must not silently repair drift.

Mode checks:

- `idea`: PASS only when Project URL/id exists, Project status is `Idea`, strengthened brief exists, no premature PRD/Tech Spec/Issue exists, final output contains no implementation plan, and next step is explicitly `/office-hours` or `/brainstorming`.
- `idea`: FAIL when no Project exists, Project is not `Idea`, the agent wrote a plan instead of creating the Project, implementation started, PRD/Tech Spec/Issue was created without explicit repair context, the session ended without Project link and did not mark `linear-idea` as `BLOCKED / INCOMPLETE`, or no next shaping skill was recommended.
- `discovery`: Project is in Discovery or ready for handoff, discovery outputs are available, no implementation has started from a raw discovery plan, and the next required durable mutation is `linear-handoff`.
- `delivery`: Project is in Delivery, PRD is current, Tech Spec or explicit no-spec exception exists, and active Project documents are only PRD and Tech Spec.
- `issue`: Issue belongs to the Project, is a one-PR contract, has required sections, includes chips plus context snapshot, and has no attached PRD/Tech Spec docs.
- `handoff`: Project, PRD, Tech Spec, and approved Issue plan are current; user approval is recorded; implementation starts from Linear Issue(s), not from a raw `/office-hours`, `/brainstorming`, or review plan.
- `pre-ship`: branch/diff matches Issue, Linear artifacts are not stale, scope drift is reflected or accepted, and no durable body contains obsolete PR chips or raw PR URLs.
- `post-ship`: Issue has PR chip/status, `In Review` after PR creation, `Done` after merge/user acceptance, and final drift is synced back to Linear.

Hard FAIL examples:

- `linear-idea` ended without a Linear Project link.
- An agent performed deep implementation discovery and wrote an implementation plan during Idea instead of creating the Project.
- A discovery implementation plan was approved directly without passing through `linear-handoff`.
- PRD, Tech Spec, or Issue was created during Idea without explicit repair context.
- Code implementation started before approved Linear Issue(s) existed.
- Installed consumer `.agents/skills/linear-*` files are redirect adapters instead of full executable skill bodies.

Output:

- Use `templates/check-output.md`.
- Keep output concise.
- Include the exact mode in the status line.
- For FAIL, lead with `FAIL - Linear <mode> not ready`.
