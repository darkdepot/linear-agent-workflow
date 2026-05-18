# Install Guide

Install this workflow into a consumer repo as a reusable workflow with full local skill bodies.

Consumer `.agents/skills/linear-*` files must be directly executable after opening `SKILL.md`. They must not be thin adapters that send the agent to an env var, sibling checkout, GitHub URL, or `main`.

## Source Of Truth

Canonical workflow truth stays in `linear-agent-workflow`:

- `skills/linear-*/SKILL.md`
- `references/*`
- `templates/*`
- `scripts/sync-consumer.mjs`

Consumer repos receive generated, reviewable copies. Those generated files are not the place to edit workflow behavior by hand.

## Consumer Install

Run the sync command from the upstream checkout:

```bash
node scripts/sync-consumer.mjs --repo /path/to/consumer --consumer-name Zeni
```

The command writes:

- `.agents/skills/linear-*/SKILL.md`
- `.agents/skills/linear-*/references/*`
- `.agents/skills/linear-*/templates/*`
- `.claude/skills/linear-*/SKILL.md`
- `.agents/linear-workflow-check.mjs`
- `.agents/linear-workflow.lock.json`
- `.agents/linear-workflow.config.md` when it does not already exist

Generated `.agents/skills/linear-*` files include a header like:

```markdown
<!-- Generated from darkdepot/linear-agent-workflow @ <commit-sha>. Do not edit manually. -->
```

The generated `.claude` files are discovery wrappers only. They point the agent to the executable `.agents` copy in the consumer repo.

The generated `.agents/linear-workflow-check.mjs` file is a read-only checker that can run inside the consumer repo without an upstream checkout. It verifies generated skill bodies, Claude wrappers, copied `references/` and `templates/`, redirect-stub patterns, unmanaged Linear skill directories, and lockfile hashes.

## Consumer Policy

Keep consumer-specific policy in `.agents/linear-workflow.config.md`, `AGENTS.md`, or supporting repo docs, not in redirect adapters.

Add or preserve a short consumer repo instruction:

- Linear Project, PRD, Tech Spec, and Issue are source of truth.
- GitHub is PR/review/CI/deploy/merge history only.
- Use `linear-idea`, `linear-handoff`, `linear-review`, approved Linear Issue(s), `linear-check`, and `linear-ship` for the main workflow.
- Use `linear-project`, `linear-prd`, `linear-spec`, and `linear-issue` only as internal/advanced atomic helpers for repair or targeted artifact maintenance.
- Configure the ship, review feedback, and land/deploy workflows used by `linear-ship`.

## Updates

Update a consumer repo by rerunning the same sync command from the desired upstream checkout. Do it on a normal branch and review the generated diff before merging it.

The sync command rewrites generated Linear skill copies, generated Claude wrappers, copied `references/` and `templates/`, and lockfile metadata. It preserves `.agents/linear-workflow.config.md` when that file already exists.

## Checks

Validate the upstream workflow contract:

```bash
node scripts/validate-workflow.mjs
```

Verify a consumer repo without writing:

```bash
node scripts/sync-consumer.mjs --repo /path/to/consumer --check
```

Verify from inside a generated consumer repo without the upstream checkout:

```bash
node .agents/linear-workflow-check.mjs
```

The check fails when:

- installed `.agents/skills/linear-*` files are missing, stale, edited, or too small to be executable;
- generated metadata is missing near the top of an installed skill;
- copied `references/` or `templates/` are missing, stale, edited, or have unexpected extra files beside a generated skill;
- `.claude/skills/linear-*` wrappers are missing or stale;
- `.agents/linear-workflow-check.mjs` is missing or stale when checked from upstream;
- `.agents/linear-workflow.lock.json` is missing, corrupted, or has stale hashes/paths for skills, wrappers, copied assets, or the checker;
- an unmanaged `linear-*` skill or wrapper appears in `.agents` or `.claude`;
- installed skill bodies contain redirect-stub patterns.

## Zeni Consumer Notes

- Zeni should keep its existing project-specific skills.
- Zeni `.agents/skills/linear-*` should be generated full copies from upstream.
- Zeni `.claude/skills/linear-*` should remain tiny discovery wrappers to `.agents`.
- Zeni-specific policy belongs in `.agents/linear-workflow.config.md`, `AGENTS.md`, or supporting docs.
- Zeni ship workflow is gstack `ship`.
- Zeni review feedback workflow is Compound `ce-resolve-pr-feedback`.
- Zeni land workflow is gstack `land-and-deploy`.

## Anti-Patterns

- Do not install consumer skills as env-var, sibling-checkout, GitHub URL, or `main` redirects.
- Do not hand-edit generated `.agents/skills/linear-*` files in a consumer repo.
- Do not use `.claude/skills/linear-*` as the executable source of truth.
- Do not let `linear-review` mutate Linear artifacts; accepted fixes belong to `linear-handoff`, explicit atomic skills, or `linear-ship`.
- Do not make Project Updates a required gate; record user review acceptance as a Linear comment.
