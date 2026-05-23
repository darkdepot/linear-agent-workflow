---
name: linear-preflight
description: Use after implementation and before ship to verify local branch readiness and produce a preflight certificate.
---

# Linear Preflight

Use this skill after implementation is complete or nearly complete, before `linear-ship`.

`linear-preflight` owns local branch readiness only. It checks worktree state, compares the local diff against approved Linear scope, runs targeted verification, runs a bounded branch code-review/fix loop, commits when safe and configured, and emits a preflight certificate that `linear-ship` can consume.

Read first:

1. `AGENTS.md`
2. `skills/linear-check/SKILL.md`
3. `skills/linear-review/SKILL.md`
4. `references/artifact-rules.md`
5. `references/artifact-quality.md`
6. `references/readiness-gates.md`
7. `references/execution-quality.md`
8. `references/lifecycle.md`
9. `references/human-friendly-output.md`

When to use:

- Implementation has produced local changes and the user says "prepare PR", "commit", "self-review", "preflight", or "ship".
- `linear-implement` exited with `implemented-needs-preflight`.
- A branch needs local readiness proof before PR creation or ship orchestration.

Do not use:

- Before code implementation has started.
- As a substitute for `linear-review pre-ship` or `linear-check pre-ship`.
- For PR creation, review-loop stabilization, deploy, or Linear closeout. PR creation and review stabilization belong to `linear-ship`; deploy and closeout belong to `linear-deploy`.

Inputs to gather:

- Fresh Linear Project, PRD, Tech Spec, and Issue context.
- Current branch, worktree status, staged/unstaged changes, and commit state.
- Local diff against the intended base branch.
- Consumer config and repo validation commands from `AGENTS.md` or project docs.
- Any implementation-start or preflight Linear comments already present.

Workflow:

1. Confirm there is an approved Linear Issue and implementation is in Delivery or otherwise explicitly approved to proceed.
2. Inspect git branch and worktree state.
3. Compare the local diff against Project, PRD, Tech Spec, and Issue scope.
4. Run targeted tests/checks appropriate to the diff. If a check cannot run, report it under `Not checked`.
5. Run a bounded self-review loop:
   - Prefer Compound `ce-code-review mode:headless` with the current branch diff scope when available.
   - Run at most 2 review/fix rounds.
   - Allow only `safe_auto` fixes to be applied automatically.
   - Re-run targeted verification after any applied fix.
   - Stop with `needs-human` when residual P1/P2 `gated_auto`, `manual`, or `human` findings remain.
   - Record residual P3/advisory findings in the certificate without blocking unless repo policy says otherwise.
   - Use Superpowers `requesting-code-review` only when a separate reviewer/subagent is useful and allowed.
6. Commit via Compound `ce-commit` or repo convention when the branch is safe and the commit workflow is configured. If not safe, leave a precise next action.
7. Record the full preflight certificate as a Linear comment or resource with the stable marker `linear-preflight certificate`.
8. Emit the preflight certificate.

Certificate statuses:

- `ready`: local branch is ready for `linear-ship`.
- `blocked`: required repo state, validation, auth, or tooling is unavailable.
- `drift-candidate`: local diff may materially differ from approved Linear scope and needs formal pre-ship review or handoff repair.
- `needs-human`: a product, UX, business, external access, dirty-worktree, or risk decision is required.

Preflight certificate shape:

```text
linear-preflight certificate
Preflight: <ready|blocked|drift-candidate|needs-human>
Issue(s): <keys>
Branch: <branch>; commit state: <clean/dirty/committed>
Changed files: <count/list or summary>
Local verification: <commands run + outcome>
Self-review: <run/skipped/unavailable + outcome>
Review rounds: <0|1|2>; safe fixes applied: <none/list>; residual findings: <none/list>
Drift candidate: <none/summary>
Not checked: <manual QA/browser/mobile/deploy/etc.>
Next: <linear-ship | linear-handoff | needs-human>
```

Rules:

- Do not create the final PR.
- Do not merge, deploy, close Linear Issues, or mark work shipped.
- Do not run or claim `linear-review pre-ship`; it remains owned by `linear-ship`.
- Do not run or claim `linear-check pre-ship`; it remains owned by `linear-ship`.
- If drift appears material but not yet confirmed, mark `drift-candidate` and let `linear-ship` own the formal pre-ship review/check decision.
- If drift is already clearly outside the approved package, route back to `linear-handoff` or explicit atomic artifact repair before PR.
- Do not run more than 2 branch review/fix rounds. If the branch is still not clean, report residual findings and stop with `needs-human` or `blocked`.
- Do not auto-apply `gated_auto`, `manual`, `human`, or release-sensitive findings from `ce-code-review`.
- Keep Linear-facing comments in the consumer config language; use Russian when no consumer config is present.
- Include a checked/not-checked boundary. Local tests do not imply browser QA, production smoke, mobile QA, deploy verification, or user acceptance.
- Do not summarize the certificate away in Linear. A fresh `linear-ship` agent must be able to recover the full certificate from Linear comments or resources.

Human Linear comment/resource shape:

```text
linear-preflight certificate
Preflight: <ready|blocked|drift-candidate|needs-human>
Issue(s): <keys>
Branch: <branch>; commit state: <clean/dirty/committed>
Changed files: <count/list or summary>
Local verification: <commands run + outcome>
Self-review: <run/skipped/unavailable + outcome>
Review rounds: <0|1|2>; safe fixes applied: <none/list>; residual findings: <none/list>
Drift candidate: <none/summary>
Not checked: <manual QA/browser/mobile/deploy/etc.>
Next: <linear-ship | linear-handoff | needs-human>
```

Final response must include:

- Preflight certificate.
- Whether local code is committed, dirty, or blocked.
- Tests/checks run and not run.
- Self-review outcome.
- Review rounds, safe fixes applied, and residual review findings.
- Drift candidate summary.
- Next workflow recommendation.
