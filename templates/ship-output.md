# Ship Output Template

Default user-facing response:

```text
<Outcome sentence in human language. Say whether the PR is ready for deploy, blocked, timed out, or waiting for a named decision.>

PR: [#<number>](<url>)
Linear Issue: `<key>` - <current Linear status>
Latest head SHA: `<sha>`

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

Green certificate:
- `linear-ship green certificate`: <recorded/not recorded + reason>.
- Next: <linear-deploy | needs-human | blocked>.

Проверено:
- <Linear/PR/review/check/docs state actually inspected>.

Не проверено:
- <manual QA/browser/prod/mobile/deploy surface/etc. that did not run, or `none known`>.

Linear status:
- <issue/project sync outcome>.
- <comments/resources/status updates outcome>.

Что дальше:
1. <recommended next action, normally `linear-deploy` when green>.
2. <alternative next action, when useful>.
```

Optional internal summary for logs or Linear comments:

```text
Linear ship verdict: <green|needs-human|blocked|timed-out>

PR:
Linear Issue:
Phases run:
Rounds run:
Latest head SHA:
Checks status:
Greptile status:
Review status:
Documentation workflow:
Resolver used:
Commits pushed:
Green certificate:
Unresolved feedback:
Notes:
```

Verdicts:

- `green`: PR is stable after documentation, review feedback, and a green review/check wait; `linear-ship green certificate` was recorded and the next workflow is `linear-deploy`.
- `needs-human`: a product, UX, business, scope, resolver, dirty-worktree, deploy-approval, or external-head-change decision is needed.
- `blocked`: required context, auth, tools, PR state, or Linear state is unavailable.
- `timed-out`: checks, reviews, Greptile, or review readiness did not settle within the wall-clock limit.

Verdict-to-human translation:

- For `green`, say "PR is ready for `linear-deploy`; it has not been merged or deployed by `linear-ship`."
- For `needs-human` with green review/checks but explicit deploy approval required, say "PR is ready for deploy, waiting for your approval." Do not make it sound blocked.
- For `needs-human` with unresolved review feedback, say "Decision needed on review feedback" and list the concrete unresolved items.
- For `blocked`, name the missing prerequisite and the exact next unblock step.
- For `timed-out`, name what did not settle and whether the PR is otherwise safe or unknown.
