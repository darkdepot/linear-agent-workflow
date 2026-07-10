# Linear Agent Workflow

Reusable Linear workflow skills for AI coding agents.

The workflow keeps Linear as the source of truth from raw idea to landed PR:

```text
linear-idea -> discovery/reviews -> linear-handoff -> approved Issue(s) -> linear-implement -> linear-preflight -> linear-ship -> linear-deploy
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
- `linear-preflight`: local branch readiness, targeted verification, mandatory risk-routed GPT-5.6 `autoreview` clean gate, and preflight certificate.
- `linear-ship`: wrapper around configured project ship, documentation, review feedback, and green certificate workflows.
- `linear-deploy`: wrapper around configured project deploy, post-ship check, Linear closeout, and learning capture workflows.
- `linear-orchestrate`: control-plane orchestrator session per product; drives projects and Issues through worker sessions, decides technical questions itself, escalates only product decisions (scope, design, risk); runs discovery in director mode — a Second Voice reviewer agent interrogates, the orchestrator answers, and the user gets reviewed prototypes at checkpoints.

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
-> classify final risk, select the explicit GPT-5.6 Luna/Sol route, and run mandatory autoreview until clean
-> commit when safe/configured
-> emit preflight certificate

/linear-ship
-> consume preflight certificate when present
-> run pre-ship linear-review and linear-check pre-ship when required
-> create/sync PR through configured ship workflow
-> run repo documentation workflow before final green when configured
-> stabilize review/CI/Greptile
-> emit linear-ship green certificate

/linear-deploy
-> consume linear-ship green certificate
-> verify current PR head SHA still matches
-> run configured Deploy workflow
-> run/report linear-check post-ship
-> close Linear and record durable learnings
```

Orchestrated mode (optional):

```text
/linear-orchestrate (one session per product)
-> resume state from Linear + ledger + mailbox + worker registry
-> run idea/discovery/handoff in-session (Director Discovery + Second Voice: checkpoints, not question streams)
-> dispatch one worker per Issue (implement -> preflight -> ship)
-> answer technical questions; escalate scope/design/risk as decision briefs
-> run linear-deploy per deployApproval policy
```

Recommended pairing: a Claude Code orchestrator session with one headless
Codex CLI worker per Issue (`codex-cli` transport — `codex exec` spawns,
resumable threads across stages, mailbox reports, `workers.json` registry for
resume). Set `orchestration.transport` in the project config or let the
orchestrator detect the runtime; see `references/orchestration.md`.

Discovery artifacts from `/office-hours`, `/brainstorming`, and reviews are inputs, not durable Linear truth. Linear becomes current when `linear-handoff` persists the package.

Do not use the direct user-facing chain `linear-prd -> linear-spec -> linear-issue` after discovery. Those atomic skills remain installed for repair and advanced maintenance, but the normal route is `linear-handoff`.

Use `linear-handoff` for post-discovery packaging, scope changes, or any state where Project, PRD, Tech Spec, and execution Issues are not current together. Use atomic helpers only for explicit targeted repair, reviewer-feedback updates, drift sync, or maintaining an already-approved package without changing execution scope. If an atomic helper is invoked as the normal post-discovery route, stop and route to `linear-handoff`.

PRD and Tech Spec creation does not mean Delivery. A Project should move to Delivery only through `linear-implement` after approved execution Issue(s) exist and implementation-start approval is explicit.

## Install Locally

Install or update the workflow as a local skill pack from this upstream checkout:

```bash
node scripts/install-local.mjs --remove-stale
```

The default mode is `--all-roots`: the installer discovers every previously-installed skills root by checking for `.linear-agent-workflow.lock.json` in the known roots (`~/.codex/skills`, `~/.claude/skills`, and any root recorded in a discovered lockfile) and syncs each of them in one run, reporting the per-root installed version. On a fresh machine with no lockfiles it falls back to `~/.codex/skills`.

Each installed skills root contains:

- `<skills-root>/linear-*`: executable local skill bodies generated from upstream.
- `<skills-root>/linear-*/references` and `<skills-root>/linear-*/templates`: copied beside each local skill for progressive disclosure.
- `<skills-root>/.linear-agent-workflow.lock.json`: upstream repo, version, commit, dirty flag, installed skill paths, and copied asset hashes.

`linear-preflight` also requires the external `autoreview` skill/helper in the agent runtime. This workflow does not vendor `autoreview`; preflight blocks when the helper is missing.

`linear-preflight` does not inherit the external helper's model default. It
selects the explicit GPT-5.6 route only from the canonical table in
`references/autoreview-routing.md`, re-selects after final risk
reclassification, and records the route and command in the preflight
certificate.

Check every installed root without writing:

```bash
node scripts/install-local.mjs --check
```

Use a single explicit skills root only for testing or alternate runtimes:

```bash
node scripts/install-local.mjs --skills-root /path/to/skills --remove-stale
```

The checks fail when local skills are missing, stale, edited, too small to be executable, copied references/templates are missing, stale, edited, or unexpected, lockfile hashes drift, or any discovered root is pinned to an older upstream version.

## Project Config

Project repos must not vendor this workflow. They should contain only a repo-specific JSON config:

```bash
node scripts/project-config.mjs --repo /path/to/project --project-name Zeni --write --clean
node scripts/project-config.mjs --repo /path/to/project --check
node scripts/project-config.mjs --repo /path/to/project --clean --check
```

The config path is `.agents/linear-workflow.config.json`. It records project policy such as Linear team, Linear-facing language, artifact roots, `autoreview` prerequisite, implementation workflow, ship workflow, documentation workflow, review feedback workflow, and deploy workflow.

`--clean` removes legacy generated project installs:

- `.agents/skills/linear-*`
- `.claude/skills/linear-*`
- `.agents/linear-workflow-check.mjs`
- `.agents/linear-workflow.lock.json`
- `.agents/linear-workflow.config.md`
- `.github/workflows/update-linear-workflow.yml`
- `.github/workflows/update-linear-agent-workflow.yml`

For Zeni, the configured flow can set implementation to Compound `ce-work`, then use gstack `ship`, gstack `document-release`, Compound `ce-resolve-pr-feedback`, and gstack `land-and-deploy` through `Deploy workflow`.

See `references/install.md` for install details and `references/versioning.md` for the local skill pack and project config contract.

## Documentation Map

- `CHANGELOG.md`: released workflow behavior changes.
- `examples/profile-workbench-regression.md`: regression example for handoff-first artifact quality.
- `examples/zeni-dogfood.md`: first Zeni dogfood flow and anti-examples.
- `references/artifact-intake.md`: scoped discovery and review artifact intake.
- `references/artifact-quality.md`: quality bar for Project, PRD, Tech Spec, Issue, preflight, ship, deploy, and review artifacts.
- `references/artifact-rules.md`: source-of-truth and Linear-facing artifact rules.
- `references/execution-quality.md`: PRD, Issue, bug/perf, and architecture guardrails.
- `references/human-friendly-output.md`: user-facing status and confidence-boundary wording.
- `references/install.md`: local install and project config guide.
- `references/lifecycle.md`: idea, discovery, handoff, delivery, preflight, ship, and deploy lifecycle.
- `references/questioning.md`: when workflow skills should ask humans.
- `references/readiness-gates.md`: risk classes, review policy, and owner boundaries.
- `references/review-rubric.md`: `linear-review` inspection rubric.
- `references/ship-feedback-loop.md`: `linear-ship` green-certificate loop.
- `references/versioning.md`: SemVer, local skill pack, and project config contract.
- `templates/check-output.md`: `linear-check` output template.
- `templates/deploy-output.md`: `linear-deploy` output template.
- `templates/issue.md`: Linear Issue template.
- `templates/prd.md`: Linear PRD template.
- `templates/project.md`: Linear Project body template.
- `templates/review-output.md`: `linear-review` output template.
- `templates/ship-output.md`: `linear-ship` output template.
- `templates/tech-spec.md`: Linear Tech Spec template.

## Principles

- Reusable first: the workflow lives in this repo and is installed as a local skill pack, not copied into project repos.
- Config-only projects: project repos keep only `.agents/linear-workflow.config.json` for repo-specific policy.
- Linear first: durable requirements live in Linear.
- Handoff first: discovery implementation plans must pass through `linear-handoff` before implementation.
- Artifact intake first: local discovery/review files are scoped evidence, not broad-search source of truth.
- Delivery ladder: implementation starts through `linear-implement`, branch readiness flows through `linear-preflight`, PR green certification remains in `linear-ship`, and deploy/closeout belongs to `linear-deploy`.
- Strong artifacts first: skills and examples carry the workflow contract; scripts are only lightweight smoke guards for known regressions.
- Product brief Projects: Project bodies cover only five concerns: what, why, target outcome, in scope, and out of scope. Default Russian headings are `Что`, `Зачем`, `Образ результата`, `Что входит`, and `Что не входит`.
- WHAT/HOW/execution split: PRD defines behavior and acceptance, Tech Spec defines implementation, Issue defines one PR.
- Risk-based review: `linear-review` is required for standard, deep, risky, or drifted flows and advisory for tiny PRD-lite/no-spec exceptions.
- Review/check split: `linear-review` returns findings and next owner; `linear-check` owns `PASS`, `FAIL`, and `BLOCKED` readiness.
- One issue by default: split only into vertical slices with dependencies.
- Agent-ready Issues: mark `AFK` or `HITL`, name dependencies, avoid brittle line-number edit scripts, and require repro/fix proof for bug/perf work.
- No silent sync: report drift before moving stages.
- Report-only checks: `PASS` means inspected and no blocking drift found, not deterministic proof.
- Autonomy with transparency: agents resolve non-contested choices themselves and surface them as «Решил сам»; scope boundaries, issue slicing, risk acceptance, and design decisions stay with the user, and design choices are presented visually.

## Validation

Run the one-command entry point before finishing any change:

```bash
node scripts/verify.mjs
```

CI runs `node scripts/verify.mjs` automatically on every PR and push to `main`.

To additionally verify the installed local skill pack (maintainer machine only):

```bash
node scripts/verify.mjs --install-check
```

### Individual checks

```bash
git diff --check
node --check scripts/install-local.mjs
node --check scripts/project-config.mjs
node --check scripts/lint-linear-artifacts.mjs
node scripts/lint-linear-artifacts.mjs
node --check scripts/validate-workflow.mjs
node scripts/validate-workflow.mjs
node scripts/install-local.mjs --check
node scripts/project-config.mjs --repo /path/to/project --check
```
