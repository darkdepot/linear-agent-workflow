---
name: linear-ship
description: Use when shipping a Linear-tracked change through the configured PR creation, review feedback, land/deploy, and Linear closeout workflow.
---

# Linear Ship

Use this wrapper around the consumer repo's configured ship, review feedback, and land/deploy workflows.

Read first:

1. `AGENTS.md`
2. `skills/linear-preflight/SKILL.md`
3. `skills/linear-review/SKILL.md`
4. `skills/linear-check/SKILL.md`
5. `references/artifact-rules.md`
6. `references/readiness-gates.md`
7. `references/execution-quality.md`
8. `references/install.md`
9. `references/ship-feedback-loop.md`
10. `references/human-friendly-output.md`
11. `templates/ship-output.md`

Workflow:

1. `prepare`: fetch the Linear Issue, Project, PRD, and Tech Spec.
2. `prepare`: if there is no approved Linear Issue linked to the Project with current PRD/Tech Spec context, stop and route to `linear-handoff`.
3. `prepare`: read the latest `linear-preflight certificate` from Linear comments or resources. If no certificate exists, route to `linear-preflight` before continuing.
4. `prepare`: classify scope/risk and compare branch or pending PR scope against Linear artifacts.
5. `prepare`: run or report `linear-review pre-ship` when required by `references/readiness-gates.md`.
6. `prepare`: apply or request accepted pre-ship Linear sync decisions through `linear-ship` before PR creation or landing.
7. `prepare`: run or report `linear-check pre-ship`.
8. `create-pr`: gather Project, PRD, Tech Spec, Issue context, and preflight certificate for the configured ship workflow.
9. `create-pr`: delegate actual PR creation to the configured Ship workflow.
10. `create-pr`: after PR creation, record PR number, PR URL, and latest head SHA; update the Linear Issue to `In Review` and add a PR chip.
11. `stabilize-review`: when a Review feedback workflow is configured, run the feedback loop in `references/ship-feedback-loop.md`.
12. `land-deploy`: when the review loop is green and a Land workflow is configured, delegate merge/deploy to that workflow.
13. `linear-closeout`: after merge/user acceptance, update the Linear Issue to `Done`.
14. `linear-closeout`: run or report `linear-check post-ship`.
15. Return the concise report in `templates/ship-output.md`.

User-facing ship status UX:

- Start with the outcome in human language. Do not start with `Linear ship: <verdict>` when talking to the user.
- Translate internal verdicts:
  - `pr-created`: PR created and Linear synced; waiting for configured review or human next step.
  - `green`: PR is ready for landing, but merge/deploy did not run because the land workflow is absent or human approval is required.
  - `merged`: PR was merged/deployed and Linear closeout ran.
  - `needs-human`: a specific decision is needed; name the decision, not only the verdict.
  - `blocked`: the workflow cannot proceed because required context, auth, tools, PR state, or Linear state is unavailable.
  - `timed-out`: waiting did not settle; name what is still pending.
- When the PR is green but merge/deploy requires explicit user approval, say: "PR is ready to land, but I stopped before merge/deploy because I need your explicit approval."
- Make code review state understandable. Include who or what reviewed, what was found, what was fixed, what remains unresolved, CI state, and whether the PR is safe to merge from the review perspective.
- If a resolver pushed fixes, include the latest head SHA and say that review state was checked again after that push.
- For bug or performance work, include the original repro or baseline, the fix proof, and the regression proof or documented test-seam gap.
- Include a compact "checked / not checked" boundary. If manual browser QA, production smoke, mobile QA, deploy verification, or other surfaces did not run, say so plainly.
- Do not dump phase names, git directives, or internal workflow telemetry unless they materially explain the status.
- End with concrete next choices when a human decision is needed.
- Decision choices must explain consequences and include a recommendation when review/CI state makes one path clearly preferable.

Required review status shape when a PR exists:

```text
Review status:
- Preflight: <ready/blocked/drift-candidate/needs-human/not run>; <local readiness outcome>.
- Pre-ship review: <run/skipped/not configured>; <blocking outcome>.
- Bug/perf proof: <not applicable or original symptom/baseline + fix proof + regression proof/gap>.
- GitHub/Greptile review: <run/unavailable/not configured>; <findings outcome>.
- Fixes applied: <none or concise list with commit SHA>.
- Unresolved review threads: <count/status>.
- Merge state: <clean/blocked/conflict/unknown>.

CI status:
- <blocking check>: <state>.
- <other relevant checks>: <state or "no blocking checks">.

Проверено:
- <review/check/Linear state actually inspected>.

Не проверено:
- <manual QA/prod/browser/mobile/deploy surface that did not run>.
```

When a feedback loop ran, include a short timeline:

```text
Review timeline:
1. Before PR: pre-ship review passed and scope matched the Linear Issue.
2. After PR: CI settled green.
3. Greptile left 1 nit.
4. Nit fixed in `<sha>`.
5. Re-check: Greptile passed, unresolved threads: 0, merge state: `CLEAN`.
```

Rules:

- Do not create PRs directly.
- Do not fork or reimplement the consumer repo's ship workflow.
- Do not resolve review feedback directly when a configured resolver exists; delegate to it.
- Do not merge or deploy directly; delegate to the configured land workflow.
- Do not perform initial implementation or local branch hygiene; route those to `linear-implement` or `linear-preflight`.
- Do not start from a raw discovery/review plan, PRD, or Tech Spec; shipping starts from an approved Linear Issue.
- Do not use GitHub Issues as requirements.
- Sync material drift back to Linear before claiming completion.
- Use Linear comments for user review acceptance, not Project Updates.
- `linear-review` is report-only; `linear-ship` owns accepted pre-ship drift sync, `linear-check pre-ship`, and PR/review/merge state updates.
- Required `linear-review pre-ship` runs for standard, deep, risky, or materially drifted work before PR creation or landing.
- `linear-preflight` owns local branch readiness and emits a certificate; it must not run or claim `linear-review pre-ship`, `linear-check pre-ship`, PR creation, landing, or closeout.
- Do not continue into formal pre-ship review/check or PR creation without a recoverable `linear-preflight certificate` in Linear comments or resources.
- Stop with `needs-human` when required review returns unresolved decisions, missing artifacts, or blocking findings.
- If both Review feedback workflow and Land workflow are absent, stop after PR creation/status sync with final verdict `pr-created`.
- If Review feedback workflow is absent but Land workflow is configured, wait for checks/reviews once; stop with `needs-human` if actionable feedback appears, otherwise continue to Land workflow.
- If Land workflow is absent, stop after review stabilization or green review/check wait with final verdict `green`.
- Stop with `needs-human` when feedback asks for product, UX, business, or scope decisions.
