# Install Guide

Install this workflow as generated wrappers over one canonical workflow source.

## Source Of Truth

Canonical workflow truth stays only in `linear-agent-workflow`:

- `skills/linear-*/SKILL.md`
- `references/*`
- `templates/*`

Consumer repos must not copy full workflow truth. They get generated wrappers and, in consumer mode, a lockfile.

## Self Mode

Use self mode inside this repo:

```bash
scripts/install.sh --mode self --target /Users/sasha/Projects/linear-agent-workflow
scripts/check.sh --mode self --target /Users/sasha/Projects/linear-agent-workflow
```

Self mode generates Codex and Claude Code wrappers that point repo-relatively to `skills/linear-*/SKILL.md`. It does not create `.agents/linear-workflow.lock.json`.

## Consumer Mode

Use consumer mode in Zeni and future repos:

```bash
scripts/install.sh \
  --mode consumer \
  --target /Users/sasha/Projects/zeni \
  --version v0.1.0
```

Run this after the requested SemVer tag exists in the workflow repository.

Consumer mode generates:

- `.agents/linear-workflow.lock.json`
- `.agents/skills/linear-*/SKILL.md`
- `.claude/skills/linear-*/SKILL.md`

The lockfile pins repository URL, SemVer tag, immutable commit SHA, adapter format version, generated wrapper hashes, and consumer configuration.

Consumer wrappers must read the lockfile and resolve the pinned workflow source. They must not resolve from a local absolute path, a sibling checkout, or `main`.

## Updates

Updates should happen on a branch and be reviewed as a consumer PR:

```bash
scripts/update.sh \
  --mode consumer \
  --target /Users/sasha/Projects/zeni \
  --version v0.2.0 \
  --branch linear-workflow-v0.2.0
```

`update.sh` rewrites only generated wrappers and lockfile metadata. It does not rewrite consumer product code.

## Checks

Use:

```bash
scripts/check.sh --mode self --target /Users/sasha/Projects/linear-agent-workflow
scripts/check.sh --mode consumer --target /Users/sasha/Projects/zeni
```

Self check verifies generated wrappers and confirms no lockfile is required.

Consumer check verifies lockfile shape, pinned commit resolution, wrapper hashes, generated wrapper thinness, and absence of copied `references/` or `templates/` inside consumer skill dirs.

## Zeni Consumer Notes

- Zeni should keep its existing project-specific skills.
- Zeni should not copy the whole reusable workflow into `.agents/skills` or `.claude/skills`.
- Zeni should use generated consumer wrappers plus `.agents/linear-workflow.lock.json`.
- Zeni ship workflow is gstack `ship`.
