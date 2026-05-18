# Ship Output Template

Default user-facing response:

```text
<Outcome sentence in human language. Say whether the PR is ready, merged, blocked, timed out, or waiting for a named decision.>

PR: [#<number>](<url>)
Linear Issue: `<key>` - <current Linear status>

Review status:
- Pre-ship review: <run/skipped/not configured>; <blocking outcome>.
- GitHub/Greptile review: <run/unavailable/not configured>; <findings outcome>.
- Fixes applied: <none or concise list with commit SHA>.
- Unresolved review threads: <count/status>.
- Merge state: <clean/blocked/conflict/unknown>.

CI status:
- <blocking check>: <state>.
- <other relevant checks>: <state or "no blocking checks">.

Проверено:
- <Linear/PR/review/check/deploy state actually inspected>.

Не проверено:
- <manual QA/browser/prod/mobile/deploy surface/etc. that did not run, or `none known`>.

Linear status:
- <issue/project sync outcome>.
- <comments/resources/status updates outcome>.

Что дальше:
1. <recommended next action, when one exists>.
2. <alternative next action, when useful>.
```

Use this shorter shape when the PR was merged/deployed:

```text
Готово: PR #<number> merged/deployed через configured land workflow, Linear `<key>` закрыт.

Review and CI were green before landing. Latest head SHA: `<sha>`.
Post-ship check: <passed/blocked/details>.
```

Optional internal summary for logs or Linear comments:

```text
Linear ship verdict: <verdict>

PR:
Linear Issue:
Phases run:
Rounds run:
Latest head SHA:
Checks status:
Greptile status:
Review status:
Resolver used:
Commits pushed:
Land/deploy workflow:
Unresolved feedback:
Notes:
```

Verdicts:

- `pr-created`: PR was created and Linear was moved to review, but neither review feedback nor land/deploy workflow is configured.
- `green`: PR is stable after review feedback or a green review/check wait, but no land/deploy workflow is configured.
- `merged`: PR was merged/deployed through the configured land workflow and Linear closeout ran.
- `needs-human`: a product, UX, business, scope, resolver, dirty-worktree, or external-head-change decision is needed.
- `blocked`: required context, auth, tools, PR state, or Linear state is unavailable.
- `timed-out`: checks, reviews, Greptile, or deploy readiness did not settle within the wall-clock limit.

Verdict-to-human translation:

- For `needs-human` with green review/checks and explicit merge approval required, say "PR is ready to land, waiting for your approval." Do not make it sound blocked.
- For `needs-human` with unresolved review feedback, say "Decision needed on review feedback" and list the concrete unresolved items.
- For `blocked`, name the missing prerequisite and the exact next unblock step.
- For `timed-out`, name what did not settle and whether the PR is otherwise safe or unknown.
