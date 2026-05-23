# Linear Agent Workflow

Reusable Linear workflow skills for AI coding agents.

The workflow keeps Linear as the source of truth from raw idea to landed PR:

```text
linear-idea -> discovery/reviews -> linear-handoff -> approved Issue(s) -> linear-implement -> linear-preflight -> linear-ship
```

GitHub remains the branch, PR, review, CI, deploy, and merge-history surface. Linear owns the Project, PRD, Tech Spec, Issue contract, review acceptance, and drift notes.

## Skills

- `linear-idea`: raw idea intake, AskQuestion mini-grill, Project in Idea.
- `linear-handoff`: primary post-discovery bridge into Project, PRD, Tech Spec, package approval, and Issue(s).
- `linear-project`: concise Project product brief helper.
- `linear-prd`: internal/advanced atomic PRD create/update helper.
- `linear-spec`: internal/advanced atomic Tech Spec create/update helper.
- `linear-issue`: internal/advanced one-PR Issue create/update helper.
- `linear-review`: report-only artifact quality and risk review.
- `linear-check`: report-only transition readiness checks.
- `linear-implement`: Delivery Start and implementation execution from approved Issue(s).
- `linear-preflight`: local branch readiness, targeted verification, self-review, and preflight certificate.
- `linear-ship`: wrapper around configured project ship, review feedback, land/deploy, and Linear closeout workflows.

The workflow includes an execution quality layer inspired by proven agent-skill
guardrails: PRDs must cover actor, capability, and benefit; Issues must be
durable AFK/HITL execution contracts; bug/perf work must carry a feedback-loop
proof expectation; and deep/risky work gets an architecture-quality lens.

## Workflow

```text
raw idea
-> /linear-idea outside Plan Mode
-> Linear Project in Idea

optional Plan Mode discovery
-> /office-hours or /brainstorming
-> /plan-design-review if UI/product surface
-> /plan-eng-review when architecture is ready

when final discovery/review plan appears
-> do not approve direct implementation
-> run /linear-handoff

/linear-handoff
-> if still in Plan Mode: produce handoff exit-plan
-> inspect scoped discovery/review artifacts through artifact intake
-> draft package and ask package approval before durable writes
-> after approval: update Linear artifacts
-> run required/advisory linear-review gate
-> apply accepted artifact fixes
-> create Linear Issue(s)
-> stop with approved Issue(s), or route explicit implementation-start approval to linear-implement

/linear-implement
-> verify implementation-start approval
-> move Project to Delivery when ready
-> run/report linear-check delivery
-> select implementation engine and implement from approved Issue(s)
-> exit to linear-preflight

/linear-preflight
-> inspect branch/worktree/diff
-> run targeted verification and self-review
-> commit when safe/configured
-> emit preflight certificate

/linear-ship
-> consume preflight certificate when present
-> run pre-ship linear-review and linear-check pre-ship when required
-> PR/review feedback/land/Linear closeout sync
```

Discovery artifacts from `/office-hours`, `/brainstorming`, and reviews are inputs, not durable Linear truth. Linear becomes current when `linear-handoff` persists the package.

Do not use the direct user-facing chain `linear-prd -> linear-spec -> linear-issue` after discovery. Those atomic skills remain installed for repair and advanced maintenance, but the normal route is `linear-handoff`.

Use `linear-handoff` for post-discovery packaging, scope changes, or any state where Project, PRD, Tech Spec, and execution Issues are not current together. Use atomic helpers only for explicit targeted repair, reviewer-feedback updates, drift sync, or maintaining an already-approved package without changing execution scope. If an atomic helper is invoked as the normal post-discovery route, stop and route to `linear-handoff`.

PRD and Tech Spec creation does not mean Delivery. A Project should move to Delivery only through `linear-implement` after approved execution Issue(s) exist and implementation-start approval is explicit.

## Install In A Consumer Repo

Run the sync script from this upstream checkout:

```bash
node scripts/sync-consumer.mjs --repo /path/to/consumer --consumer-name Zeni
```

The script generates a reviewable local install:

- `.agents/skills/linear-*`: full executable skill copies generated from upstream.
- `.agents/skills/linear-*/references` and `.agents/skills/linear-*/templates`: copied beside each generated skill for progressive disclosure.
- `.claude/skills/linear-*`: tiny discovery wrappers that point to the generated `.agents` skills.
- `.agents/linear-workflow-check.mjs`: generated read-only local install checker for the consumer repo.
- `.agents/linear-workflow.lock.json`: upstream repo, version, immutable commit, generated skill/wrapper paths and hashes, checker hash, and copied reference/template hashes.
- `.agents/linear-workflow.config.md`: consumer policy such as Linear team, language, implementation workflow, and ship workflow. Existing config is preserved.

Check an install without writing:

```bash
node scripts/sync-consumer.mjs --repo /path/to/consumer --check
```

Inside a generated consumer repo, run the self-contained local checker:

```bash
node .agents/linear-workflow-check.mjs
```

The checks fail when generated skills are missing, stale, edited, too small to be executable, copied references/templates are missing, stale, edited, or unexpected, wrapper/checker/lockfile hashes drift, unmanaged Linear skills appear, or installed skills look like redirect stubs. Consumer installs must not resolve workflow logic from an env var, sibling checkout, GitHub URL, or `main`.

For Zeni, the configured flow defaults implementation to Compound `ce-work`, then uses gstack `ship`, Compound `ce-resolve-pr-feedback`, and gstack `land-and-deploy`.

See `references/install.md` for install details and `references/versioning.md` for the release contract and breaking-change policy.

## Principles

- Reusable first: consumer repos should receive generated workflow copies, not hand-maintained forks.
- Full local install: consumer `.agents/skills/linear-*` files are executable generated copies, not redirect stubs.
- Linear first: durable requirements live in Linear.
- Handoff first: discovery implementation plans must pass through `linear-handoff` before implementation.
- Artifact intake first: local discovery/review files are scoped evidence, not broad-search source of truth.
- Delivery bridge: implementation starts through `linear-implement`, branch readiness flows through `linear-preflight`, and PR lifecycle remains in `linear-ship`.
- Strong artifacts first: skills and examples carry the workflow contract; scripts are only lightweight smoke guards for known regressions.
- Product brief Projects: Project bodies cover only five concerns: what, why, target outcome, in scope, and out of scope. Default Russian headings are `Что`, `Зачем`, `Образ результата`, `Что входит`, and `Что не входит`.
- WHAT/HOW/execution split: PRD defines behavior and acceptance, Tech Spec defines implementation, Issue defines one PR.
- Risk-based review: `linear-review` is required for standard, deep, risky, or drifted flows and advisory for tiny PRD-lite/no-spec exceptions.
- Review/check split: `linear-review` returns findings and next owner; `linear-check` owns `PASS`, `FAIL`, and `BLOCKED` readiness.
- One issue by default: split only into vertical slices with dependencies.
- Agent-ready Issues: mark `AFK` or `HITL`, name dependencies, avoid brittle line-number edit scripts, and require repro/fix proof for bug/perf work.
- No silent sync: report drift before moving stages.
- Report-only checks: `PASS` means inspected and no blocking drift found, not deterministic proof.

## Validation

```bash
git diff --check
node --check scripts/sync-consumer.mjs
node --check scripts/lint-linear-artifacts.mjs
node scripts/lint-linear-artifacts.mjs
node --check scripts/validate-workflow.mjs
node scripts/validate-workflow.mjs
node scripts/sync-consumer.mjs --repo /path/to/consumer --check
node /path/to/consumer/.agents/linear-workflow-check.mjs
```
