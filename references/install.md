# Install Guide

Install this workflow into a consumer repo as a reusable workflow with full local skill bodies.

Consumer `.agents/skills/linear-*` files must be directly executable after opening `SKILL.md`. They must not be thin adapters that send the agent to an env var, sibling checkout, or GitHub URL.

## Recommended Consumer Setup

1. Run the sync command from the upstream checkout:

   ```bash
   node scripts/sync-consumer.mjs --repo /path/to/consumer
   ```

2. Keep `.agents/skills/linear-*` as generated full skill copies.
3. Keep `.claude/skills/linear-*` as tiny discovery wrappers to `.agents/skills/...`.
4. Keep consumer-specific policy in `.agents/linear-workflow.config.md` or repo docs, not in redirect adapters.
5. Add a short consumer repo instruction:
   - Linear Project, PRD, Tech Spec, and Issue are source of truth.
   - GitHub is PR/review/CI/merge history only.
   - Use `linear-idea`, `linear-handoff`, `linear-check`, and `linear-ship` for the main workflow.
   - Use `linear-project`, `linear-prd`, `linear-spec`, and `linear-issue` as atomic helpers.
6. Configure the ship workflow used by `linear-ship`.

Update a consumer repo with the same command. It preserves `.agents/linear-workflow.config.md` when that file already exists.

Verify a consumer repo without writing:

```bash
node scripts/sync-consumer.mjs --repo /path/to/consumer --check
```

The check fails when installed `.agents/skills/linear-*` files are missing, lack upstream commit metadata, or look like redirect stubs.

Generated `.agents/skills/linear-*` files include a header like:

```markdown
<!-- Generated from darkdepot/linear-agent-workflow @ <commit-sha>. Do not edit manually. -->
```

## Zeni Consumer Notes

- Zeni should keep its existing project-specific skills.
- Zeni `.agents/skills/linear-*` should be generated full copies from upstream.
- Zeni `.claude/skills/linear-*` can remain tiny discovery wrappers to `.agents`.
- Zeni-specific policy belongs in `.agents/linear-workflow.config.md`, `AGENTS.md`, or supporting docs.
- Zeni ship workflow is gstack `ship`.
