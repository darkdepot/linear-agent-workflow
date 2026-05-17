# Linear Agent Workflow

Reusable Linear workflow skills for AI coding agents.

The workflow keeps Linear as the source of truth from raw idea to shipped PR:

```text
linear-idea -> discovery/reviews -> linear-handoff -> implementation/ship
```

GitHub remains the branch, PR, review, CI, and merge-history surface. Linear owns the Project, PRD, Tech Spec, Issue contract, review acceptance, and drift notes.

## Skills

- `linear-idea`: raw idea intake, AskQuestion mini-grill, Project in Idea.
- `linear-handoff`: post-discovery bridge into Project, PRD, Tech Spec, and Issue(s).
- `linear-project`: Project body, status, lifecycle, and chips.
- `linear-prd`: atomic PRD create/update helper.
- `linear-spec`: atomic Tech Spec create/update helper.
- `linear-issue`: atomic one-PR Issue create/update helper.
- `linear-check`: report-only transition readiness checks.
- `linear-ship`: wrapper around a configured project ship workflow.

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
-> after approval: update Linear artifacts
-> ask package approval
-> create Linear Issue(s)
-> implementation starts from approved Issues

/linear-ship
-> PR/review/merge/release sync
```

Discovery artifacts from `/office-hours`, `/brainstorming`, and reviews are inputs, not durable Linear truth. Linear becomes current when `linear-handoff` persists the package.

## Install In A Consumer Repo

Run the sync script from this upstream checkout:

```bash
node scripts/sync-consumer.mjs --repo /path/to/consumer --consumer-name Zeni
```

The script generates a reviewable local install:

- `.agents/skills/linear-*`: full executable skill copies generated from upstream.
- `.agents/skills/linear-*/references` and `.agents/skills/linear-*/templates`: copied beside each generated skill for progressive disclosure.
- `.claude/skills/linear-*`: tiny discovery wrappers that point to the generated `.agents` skills.
- `.agents/linear-workflow.lock.json`: upstream repo, version, immutable commit, generated file paths, and hashes.
- `.agents/linear-workflow.config.md`: consumer policy such as Linear team, language, and ship workflow. Existing config is preserved.

Check an install without writing:

```bash
node scripts/sync-consumer.mjs --repo /path/to/consumer --check
```

The check fails when generated skills are missing, stale, edited, too small to be executable, missing copied references/templates, or look like redirect stubs. Consumer installs must not resolve workflow logic from an env var, sibling checkout, GitHub URL, or `main`.

For Zeni, the configured ship workflow is gstack `ship`.

See `references/install.md` for install details and `references/versioning.md` for the release contract and breaking-change policy.

## Principles

- Reusable first: consumer repos should receive generated workflow copies, not hand-maintained forks.
- Full local install: consumer `.agents/skills/linear-*` files are executable generated copies, not redirect stubs.
- Linear first: durable requirements live in Linear.
- Handoff first: discovery implementation plans must pass through `linear-handoff` before implementation.
- One issue by default: split only into vertical slices with dependencies.
- No silent sync: report drift before moving stages.
- Report-only checks: `PASS` means inspected and no blocking drift found, not deterministic proof.

## Validation

```bash
git diff --check
node --check scripts/sync-consumer.mjs
node scripts/sync-consumer.mjs --repo /path/to/consumer --check
```
