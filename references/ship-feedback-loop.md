# Ship Feedback Loop

`linear-ship` owns orchestration only. It must not reimplement the project ship workflow, documentation workflow, review feedback resolver, or deploy workflow.

The loop goal is a deploy-ready PR and a durable `linear-ship green certificate`. Merge, deploy, post-ship check, Linear closeout, and learning capture belong to `linear-deploy`.

## Inputs

- Fresh Linear Issue and Project context.
- Preflight certificate when present.
- GitHub PR number and URL.
- Latest PR head SHA.
- Documentation workflow from the project config, when configured.
- Review feedback workflow from the project config, when configured.

## Review Bot Configuration Check

Before the first resolver cycle on a PR, check the review bots' configuration: re-review-on-every-push, automatic re-request on head change, and similar settings that make a bot re-review every head and re-emit prior findings.

A config-class problem — the bot re-reviews every push and re-emits already-adjudicated findings — is fixed via configuration or recorded as an environment fact for this PR. It is never burned down with resolver cycles: resolver cycles are for code findings, not for bot behavior.

## Loop

1. Confirm the PR maps to the Linear Issue and the implemented scope has not materially drifted from Project, PRD, Tech Spec, Issue, or the latest preflight certificate.
2. Before the first resolver run on this PR, perform the Review Bot Configuration Check above.
3. Detect the latest PR head SHA before each wait, documentation run, or resolver run.
4. If a Documentation workflow is configured and has not run for the current PR head, invoke it before final review stabilization.
5. If the Documentation workflow pushes commits, record the new head SHA and restart the review loop from that head.
6. Poll relevant checks, GitHub review state, unresolved threads, and Greptile state every 10 minutes until a terminal state or timeout.
7. Detect Greptile status when available:
   - Prefer Greptile MCP review status when the tool is available.
   - Fall back to GitHub checks or commit statuses whose names identify Greptile.
8. Inspect unresolved GitHub review threads and actionable Greptile comments when available; classify each finding as novel or a re-emission per Finding Dedup below.
9. If no actionable unresolved feedback remains, start the quiet period.
10. If actionable unresolved feedback exists and a review feedback workflow is configured, invoke it.
11. If actionable unresolved feedback exists and no review feedback workflow is configured, return `needs-human` with the unresolved feedback summary and missing resolver note.
12. If the resolver pushes commits, record the new head SHA and restart the documentation/review cycle.
13. Repeat until an exit condition is reached, applying Non-Blocking Convergence after the authorized final resolver cycle.

## Defaults

- Poll interval: 10 minutes.
- Maximum resolver rounds: 3.
- Maximum wall-clock time: 90 minutes.
- Quiet period: 10 minutes with no new review comments, check changes, or head SHA changes.
- Resolver rounds are counted per Finding Dedup: only novel findings consume the budget.

## Finding Dedup

A finding already adjudicated on this PR — accepted-and-fixed, or rejected with recorded evidence — that is re-emitted on a later head is closed with a reply referencing the prior adjudication (thread link, commit SHA, or decline rationale).

- A deduplicated re-emission does not consume the resolver cycle budget and does not restart the quiet period.
- Resolver cycle budgets count only novel findings. A wave of re-emitted findings on a new head is not a new resolver round.
- A finding that moves its target (the same cosmetic complaint demanding a different value each wave) is one adjudicated finding, not a stream of novel ones.
- Fail-safe: when in doubt whether a finding is novel, treat it as novel and keep the thread open. Dedup must never become a channel for dismissing real findings. Review-triggered fixes in resolver cycles must never weaken, delete, or bypass tests to reach green (the no-test-edits rule in `references/autoreview-routing.md` binds this path too); a genuinely new angle on an old area is novel.

## Non-Blocking Convergence

After the authorized final resolver cycle, further new non-blocking findings — cosmetic or nit-class: naming, styling values, phrasing, optional refactors — get deferral replies, filed as a follow-up issue when warranted, and the stage proceeds to terminal status.

Blocking-class findings — correctness, security, data loss, broken contracts — always escalate instead; they are never deferred by this rule. When in doubt whether a finding is blocking-class, escalate — the convergence rule must never become a channel for deferring a real defect. Record the deferral list and the published-replies check result in the green certificate.

## Published Replies

A thread-closure reply must be published, not a pending draft. A closure rationale that sits in an unsubmitted review is publicly invisible to reviewers and bots. Unpublished rationales count as unresolved threads.

Before certifying green, verify the worker's own reviews contain no pending drafts:

```bash
gh api repos/<owner>/<repo>/pulls/<n>/reviews --jq '.[] | select(.state=="PENDING")'
```

The output must be empty for the worker's own reviews. This submitted-check is a green-certificate precondition.

## Green Exit

Return `green` and record `linear-ship green certificate` when all are true:

- Latest head SHA is stable.
- Documentation workflow either ran for the latest head, made no changes, or is intentionally unavailable.
- Required checks are green or accepted as non-blocking by repo rules.
- Latest Greptile review is completed or intentionally unavailable.
- No unresolved GitHub review threads remain.
- No pending (unsubmitted) review drafts remain for the worker's own reviews; every thread-closure rationale is published per Published Replies.
- No unaddressed Greptile comments remain when Greptile MCP data is available.
- Merge state is clean or otherwise deployable by repo policy.
- Quiet period passes.

## Green Certificate

The green certificate must be durable in Linear comments or resources so a fresh `linear-deploy` agent can recover it.

```text
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

## Review Status Reporting

Every exit with a PR must report review state in human terms, not only workflow terms.

Include:

- Whether pre-ship review ran, was skipped by gate rules, or was unavailable.
- Whether preflight ran, was unavailable, or reported `blocked`, `drift-candidate`, or `needs-human`.
- Whether the Documentation workflow ran and whether it changed the head SHA.
- Whether GitHub review, Greptile, or another configured reviewer ran.
- Blocking findings, nits, and product/UX/scope questions separately.
- Fixes applied by the resolver, with the commit SHA when a commit was pushed.
- Unresolved GitHub review thread count or an explicit "unknown" when the tool cannot inspect threads.
- Latest head SHA after the final documentation/resolver run.
- Merge state after the final re-check.
- CI/check state after the final re-check.
- Whether the `linear-ship green certificate` was recorded.

If the loop fixed feedback, make the timeline clear: initial review result, feedback found, fix pushed, post-fix review/check status.

Do not collapse a completed loop into "Greptile passed" when the user needs to know whether code review is actually done. Say whether actionable feedback remains and whether the PR is safe for `linear-deploy` from the review/CI perspective.

Also state what was not checked. If the loop did not run manual browser QA, production smoke, mobile QA, deploy verification, or user acceptance, say so explicitly instead of letting "green" imply broader confidence.

## Needs-Human Exit

Return `needs-human` when any are true:

- Maximum resolver rounds reached.
- Greptile failed or skipped repeatedly.
- Merge conflict appears.
- Feedback asks for product, UX, business, or scope decisions.
- Resolver reports `needs-human`.
- Branch or worktree is dirty in a way unrelated to the loop.
- PR head changes by another actor during a fix attempt.

Deploy approval is never a ship gate: `linear-ship` certifies green without it, and `linear-deploy` owns asking for and recording deploy approval per the configured `deployApproval` policy.

## Blocked Or Timed Out

Return `blocked` when required tools, auth, PR state, or Linear context are unavailable and the next action is clear.

Return `timed-out` when checks, reviews, Greptile, or the overall loop stay pending past the configured wall-clock limit. Wall-clock expiry takes precedence over `needs-human` unless the resolver already reported `needs-human` or a human decision is already known to be required.

## Linear Comments

Linear-facing comments must be in Russian. Keep them concise and factual:

- PR created and moved to review.
- Documentation workflow completed, skipped, or changed the PR head.
- Review loop completed or stopped with reason.
- `linear-ship green certificate` recorded or blocked with reason.
- Human decision needed, including the exact question and linked PR context.
