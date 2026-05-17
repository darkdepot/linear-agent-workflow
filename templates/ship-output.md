# Ship Output Template

```text
Linear ship: <verdict>

PR:
Linear Issue:
Phases run:
Rounds run:
Latest head SHA:
Checks status:
Greptile status:
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
