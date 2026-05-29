---
name: linear-preflight
description: Use after implementation and before ship to verify local branch readiness through mandatory autoreview and produce a preflight certificate.
---

# Linear Preflight

Use this skill after implementation is complete or nearly complete, before `linear-ship`.

`linear-preflight` owns local branch readiness only. It checks worktree state, compares the local diff against approved Linear scope, runs targeted verification, runs the mandatory `autoreview` closeout loop until the helper reports clean, commits when safe and configured, and emits a preflight certificate that `linear-ship` can consume.

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
5. Run the mandatory `autoreview` gate:
   - Invoke the installed `autoreview` skill/helper. Do not substitute Compound `ce-code-review`, built-in `/review`, ad hoc self-review, reviewer panels, or a hand-written summary for this gate.
   - Resolve the concrete helper path before running it. Use the consumer-installed helper at `.agents/skills/autoreview/scripts/autoreview` only when that repo explicitly installs it; otherwise use an installed global helper such as `~/.codex/skills/autoreview/scripts/autoreview` or the path documented by the installed `autoreview` skill. This workflow does not vendor `autoreview` into generated consumer installs; if no helper is available, stop with `blocked`. Record the exact command in the certificate.
   - Choose the helper target using the `autoreview` contract:
     - Dirty local work: first run `<autoreview-helper> --mode local` only for the staged/unstaged/untracked tail, then apply accepted fixes and commit or intentionally leave the branch dirty with `blocked`/`needs-human`.
     - Branch or PR work: run `<autoreview-helper> --mode branch --base <resolved-base-ref>`, using the actual PR/default base when known.
     - Already-landed or single-commit work: `<autoreview-helper> --mode commit --commit <ref>`.
   - Leave the engine/model unchanged unless the user explicitly configured it. Codex remains the default engine when no engine is set.
   - Treat helper exit 0 plus the clean result (`autoreview clean: no accepted/actionable findings reported`) as the only successful review outcome.
   - Treat nonzero helper exit with accepted/actionable findings as not clean. Verify every finding against the real code, reject only unsupported findings with evidence, and apply small fixes for accepted/actionable findings at the right ownership boundary.
   - After any review-triggered code change, re-run the relevant targeted verification and re-run `autoreview`.
   - Keep looping until `autoreview` exits clean, or stop with `blocked`/`needs-human` if the helper is unavailable, cannot determine scope, repeatedly fails for tooling/capacity reasons, or still reports actionable findings that require a human decision.
   - Before emitting `ready`, run one final clean branch/PR review with `<autoreview-helper> --mode branch --base <resolved-base-ref>` after all review-triggered fixes are committed. A clean local dirty-work review alone is not sufficient when the branch has committed changes.
   - Do not mark preflight `ready` while `autoreview` is unavailable, skipped, replaced by another reviewer, or still reporting accepted/actionable findings.
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
Autoreview: <clean|blocked|needs-human|unavailable>; final command: <branch/PR helper command>; clean result: <exit 0 + clean line or none>
Autoreview loop: <iterations>; accepted findings fixed: <none/list>; residual actionable findings: <none/list, must be none for ready>
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
- Do not cap the review loop at an arbitrary round count. The `autoreview` helper is the loop authority; preflight readiness requires its clean result.
- Do not call Compound `ce-code-review` for this gate. It is not an acceptable replacement for `autoreview` inside `linear-preflight`.
- Do not auto-apply broad rewrites, release-sensitive changes, or fixes that the agent cannot defend after reading the relevant code and contracts.
- Do not silently reject a repeated `autoreview` finding and mark `ready`. If `autoreview` does not return clean, the certificate must be `blocked` or `needs-human`.
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
Autoreview: <clean|blocked|needs-human|unavailable>; final command: <branch/PR helper command>; clean result: <exit 0 + clean line or none>
Autoreview loop: <iterations>; accepted findings fixed: <none/list>; residual actionable findings: <none/list, must be none for ready>
Drift candidate: <none/summary>
Not checked: <manual QA/browser/mobile/deploy/etc.>
Next: <linear-ship | linear-handoff | needs-human>
```

Final response must include:

- Preflight certificate.
- Whether local code is committed, dirty, or blocked.
- Tests/checks run and not run.
- Autoreview command and outcome.
- Autoreview loop iterations, accepted findings fixed, and residual actionable findings.
- Drift candidate summary.
- Next workflow recommendation.
