---
name: linear-ship
description: Use when shipping a Linear-tracked change through PR creation, repo documentation sync, strict PR review stabilization, and a deploy-ready green certificate.
---

# Linear Ship

Use this wrapper around the project repo's configured ship, documentation, and review feedback workflows.

`linear-ship` owns the PR lifecycle up to a deploy-ready green certificate. It does not merge, deploy, close Linear Issues as shipped, or run the deploy workflow. Those belong to `linear-deploy`.

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
6. `prepare`: apply or request accepted pre-ship Linear sync decisions through `linear-ship` before PR creation.
7. `prepare`: run or report `linear-check pre-ship`.
8. `create-pr`: gather Project, PRD, Tech Spec, Issue context, and preflight certificate for the configured Ship workflow.
9. `create-pr`: delegate actual PR creation to the configured Ship workflow.
10. `create-pr`: after PR creation, record PR number, PR URL, and latest head SHA; update the Linear Issue to `In Review` and add a PR chip.
11. `document-pr`: when a Documentation workflow is configured, run it after PR creation and before the final review loop. Default Zeni/GStack workflow is `gstack document-release`.
12. `document-pr`: if documentation changes push commits, record the new head SHA and restart review stabilization from that head.
13. `stabilize-review`: when a Review feedback workflow is configured, run the feedback loop in `references/ship-feedback-loop.md`.
14. `green-certificate`: when the review loop is green, record a `linear-ship green certificate` in Linear comments or resources.
15. Return the concise report in `templates/ship-output.md`.

User-facing ship status UX:

- Start with the outcome in human language. Do not start with `Linear ship: <verdict>` when talking to the user.
- Translate internal verdicts:
  - `green`: PR is ready for `linear-deploy`; it has not been merged, deployed, or closed by `linear-ship`.
  - `needs-human`: a specific decision is needed; name the decision, not only the verdict.
  - `blocked`: the workflow cannot proceed because required context, auth, tools, PR state, or Linear state is unavailable.
  - `timed-out`: waiting did not settle; name what is still pending.
- When the PR is green, say: "PR is ready for `linear-deploy`; I stopped before merge/deploy because that belongs to the deploy workflow."
- Make code review state understandable. Include who or what reviewed, what was found, what was fixed, what remains unresolved, CI state, and whether the PR is safe to deploy from the review perspective.
- If a resolver or documentation workflow pushed fixes, include the latest head SHA and say that review state was checked again after that push.
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
- Documentation workflow: <run/skipped/not configured>; <head changed yes/no + outcome>.
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
2. After PR: documentation workflow updated repo docs in `<sha>` or made no changes.
3. CI settled green for latest head `<sha>`.
4. Greptile left 1 nit.
5. Nit fixed in `<sha>`.
6. Re-check: Greptile passed, unresolved threads: 0, merge state: `CLEAN`.
7. `linear-ship green certificate` recorded for `<sha>`.
```

Green certificate shape:

When recording this certificate as a Linear comment, open with the Russian human lead above the machine block:

```text
<1-2 предложения по-русски: итог и следующий шаг — e.g. «PR готов к деплою: ревью чистое, CI зелёный. Дальше — linear-deploy.»>

linear-ship green certificate
Ship: green
Issue(s): <keys>
PR: <number/url>
Head SHA: <sha>
Preflight: <certificate reference + status>
Pre-ship review: <run/skipped + outcome>
Documentation workflow: <run/skipped/not configured + head SHA effect>
CI: <green/non-blocking summary>
Greptile: <completed/unavailable + outcome>
Unresolved review threads: <0/count/unknown>
Merge state: <clean/blocked/conflict/unknown>
Checked: <states inspected>
Not checked: <manual/browser/mobile/prod/deploy surfaces not inspected>
Next: linear-deploy
```

The Russian human lead is required in Linear; the machine core below the marker is never translated or summarized away.

Rules:

- Do not create PRs directly.
- Do not fork or reimplement the project repo's ship workflow.
- Do not resolve review feedback directly when a configured resolver exists; delegate to it.
- Do not merge or deploy directly; route green PRs to `linear-deploy`.
- Do not close Linear Issues as shipped; `linear-deploy` owns verified delivery closeout.
- Do not perform initial implementation or local branch hygiene; route those to `linear-implement` or `linear-preflight`.
- Do not start from a raw discovery/review plan, PRD, or Tech Spec; shipping starts from an approved Linear Issue.
- Do not use GitHub Issues as requirements.
- Sync material drift back to Linear before claiming completion.
- Use Linear comments for user review acceptance, not Project Updates.
- `linear-review` is report-only; `linear-ship` owns accepted pre-ship drift sync, `linear-check pre-ship`, PR/review state updates, documentation-before-green orchestration, and the green certificate.
- Required `linear-review pre-ship` runs for standard, deep, risky, or materially drifted work before PR creation or green certification.
- `linear-preflight` owns local branch readiness and emits a certificate; it must not run or claim `linear-review pre-ship`, `linear-check pre-ship`, PR creation, deploy, or closeout.
- Do not continue into formal pre-ship review/check or PR creation without a recoverable `linear-preflight certificate` in Linear comments or resources.
- Stop with `needs-human` when required review returns unresolved decisions, missing artifacts, or blocking findings.
- After PR creation, enter review stabilization whenever PR checks/reviews can be inspected. Missing Documentation or Review feedback workflows are reported as `not configured`; they are not a reason to skip the green/blocked/timed-out/needs-human outcome.
- If Review feedback workflow is absent, wait for checks/reviews once; stop with `needs-human` if actionable feedback appears, otherwise create the green certificate when strict conditions are met.
- Stop with `needs-human` when feedback asks for product, UX, business, or scope decisions.
- Final verdict `green` always means "ready for `linear-deploy`", not merged or deployed.

Final response must include:

- Ship verdict.
- PR URL and Linear Issue key.
- Latest head SHA.
- Whether documentation workflow ran and whether it changed the head SHA.
- Review status, CI status, and unresolved feedback count.
- Whether a `linear-ship green certificate` was recorded.
- Checked and not-checked boundary.
- Next workflow recommendation, normally `linear-deploy`.
