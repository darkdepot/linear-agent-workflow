# Ship Feedback Loop

`linear-ship` owns orchestration only. It must not reimplement the consumer ship workflow, review feedback resolver, or land/deploy workflow.

## Inputs

- Fresh Linear Issue and Project context.
- GitHub PR number and URL.
- Latest PR head SHA.
- Review feedback workflow from the consumer config, when configured.
- Land workflow from the consumer config, when configured.

## Loop

1. Confirm the PR maps to the Linear Issue and the implemented scope has not materially drifted from Project, PRD, Tech Spec, or Issue.
2. Detect the latest PR head SHA before each wait or resolver run.
3. Wait for relevant checks and reviews to settle.
4. Detect Greptile status when available:
   - Prefer Greptile MCP review status when the tool is available.
   - Fall back to GitHub checks or commit statuses whose names identify Greptile.
5. Inspect unresolved GitHub review threads and actionable Greptile comments when available.
6. If no actionable unresolved feedback remains, start the quiet period.
7. If actionable unresolved feedback exists and a review feedback workflow is configured, invoke it.
8. If actionable unresolved feedback exists and no review feedback workflow is configured, return `needs-human` with the unresolved feedback summary and missing resolver note.
9. If the resolver pushes commits, record the new head SHA and restart the wait/review cycle.
10. Repeat until an exit condition is reached.

## Defaults

- Maximum resolver rounds: 3.
- Maximum wall-clock time: 90 minutes.
- Quiet period: 10 minutes with no new review comments, check changes, or head SHA changes.

## Green Exit

Return `green` when all are true:

- Latest head SHA is stable.
- Required checks are green or accepted as non-blocking by repo rules.
- Latest Greptile review is completed or intentionally unavailable.
- No unresolved GitHub review threads remain.
- No unaddressed Greptile comments remain when Greptile MCP data is available.
- Quiet period passes.

## Review Status Reporting

Every exit with a PR must report review state in human terms, not only workflow terms.

Include:

- Whether pre-ship review ran, was skipped by gate rules, or was unavailable.
- Whether GitHub review, Greptile, or another configured reviewer ran.
- Blocking findings, nits, and product/UX/scope questions separately.
- Fixes applied by the resolver, with the commit SHA when a commit was pushed.
- Unresolved GitHub review thread count or an explicit "unknown" when the tool cannot inspect threads.
- Latest head SHA after the final resolver run.
- Merge state after the final re-check.
- CI/check state after the final re-check.

If the loop fixed feedback, make the timeline clear: initial review result, feedback found, fix pushed, post-fix review/check status.

Do not collapse a completed loop into "Greptile passed" when the user needs to know whether code review is actually done. Say whether actionable feedback remains and whether the PR is safe to land from the review/CI perspective.

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

## Blocked Or Timed Out

Return `blocked` when required tools, auth, PR state, or Linear context are unavailable and the next action is clear.

Return `timed-out` when checks, reviews, Greptile, deploy readiness, or the overall loop stay pending past the configured wall-clock limit. Wall-clock expiry takes precedence over `needs-human` unless the resolver already reported `needs-human` or a human decision is already known to be required.

## Linear Comments

Linear-facing comments must be in Russian. Keep them concise and factual:

- PR created and moved to review.
- Review loop completed or stopped with reason.
- Merge/deploy completed or stopped with reason.
- Human decision needed, including the exact question and linked PR context.
