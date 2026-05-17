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
7. If actionable unresolved feedback exists, invoke the configured review feedback workflow.
8. If the resolver pushes commits, record the new head SHA and restart the wait/review cycle.
9. Repeat until an exit condition is reached.

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

## Needs-Human Exit

Return `needs-human` when any are true:

- Maximum resolver rounds reached.
- Maximum wall-clock time reached.
- Greptile failed or skipped repeatedly.
- Merge conflict appears.
- Feedback asks for product, UX, business, or scope decisions.
- Resolver reports `needs-human`.
- Branch or worktree is dirty in a way unrelated to the loop.
- PR head changes by another actor during a fix attempt.

## Blocked Or Timed Out

Return `blocked` when required tools, auth, PR state, or Linear context are unavailable and the next action is clear.

Return `timed-out` when checks, reviews, Greptile, or deploy readiness stay pending past the configured wall-clock limit.

## Linear Comments

Linear-facing comments must be in Russian. Keep them concise and factual:

- PR created and moved to review.
- Review loop completed or stopped with reason.
- Merge/deploy completed or stopped with reason.
- Human decision needed, including the exact question and linked PR context.
