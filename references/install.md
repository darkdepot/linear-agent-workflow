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
- Use `linear-idea`, discovery/reviews, `linear-handoff`, approved Linear Issue(s), `linear-implement`, `linear-preflight`, `linear-ship`, and `linear-deploy` for the main workflow.
- Use `linear-project`, `linear-prd`, `linear-spec`, and `linear-issue` only as internal/advanced atomic helpers for repair or targeted artifact maintenance.
- Configure `Artifact roots` only when the repo has narrow, intentional discovery/review artifact directories. Use `None` otherwise.
- Configure the implementation workflow used by `linear-implement` when the default selection table is not enough.
- Configure the ship and review feedback workflows used by `linear-ship`.
- Configure the documentation workflow used by `linear-ship` before final green certification.
- Configure the deploy workflow used by `linear-deploy`.
- Existing configs without `Implementation workflow` remain valid; `linear-implement` uses the documented default selection table.
- Existing configs with `Land workflow` are not valid in this release; rename that field to `Deploy workflow`.
- Fill every placeholder in `.agents/linear-workflow.config.md`; generated install checks fail while any `<...>` placeholder remains, including optional workflows. Write an explicit workflow name or `None` for optional entries.
- Keep Issues agent-ready: mark `AFK` or `HITL`, name dependencies, and capture bug/perf feedback-loop proof when relevant.

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
- `.agents/linear-workflow.config.md` is missing or still contains unresolved `<...>` placeholders.

## Zeni Consumer Notes

- Zeni should keep its existing project-specific skills.
- Zeni `.agents/skills/linear-*` should be generated full copies from upstream.
- Zeni `.claude/skills/linear-*` should remain tiny discovery wrappers to `.agents`.
- Zeni-specific policy belongs in `.agents/linear-workflow.config.md`, `AGENTS.md`, or supporting docs.
- Zeni implementation workflow defaults to Compound `ce-work`.
- Zeni ship workflow is gstack `ship`.
- Zeni documentation workflow is gstack `document-release`.
- Zeni review feedback workflow is Compound `ce-resolve-pr-feedback`.
- Zeni deploy workflow is gstack `land-and-deploy`.

## Anti-Patterns

- Do not install consumer skills as env-var, sibling-checkout, GitHub URL, or `main` redirects.
- Do not hand-edit generated `.agents/skills/linear-*` files in a consumer repo.
- Do not use `.claude/skills/linear-*` as the executable source of truth.
- Do not let `linear-review` mutate Linear artifacts; accepted fixes belong to `linear-handoff`, explicit atomic skills, or `linear-ship`.
- Do not let `linear-handoff` move the Project to Delivery; Delivery Start belongs to `linear-implement`.
- Do not let `linear-preflight` run pre-ship review/check or create/land the final PR by default; those belong to `linear-ship`.
- Do not let `linear-ship` merge, deploy, run post-ship checks, close Linear as shipped, or record deploy learnings; those belong to `linear-deploy`.
- Do not keep `Land workflow` in consumer config; use `Deploy workflow`.
- Do not make Project Updates a required gate; record user review acceptance as a Linear comment.
