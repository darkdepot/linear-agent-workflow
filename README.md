# Linear Agent Workflow

Reusable Linear workflow skills for AI coding agents.

The workflow keeps Linear as the source of truth from raw idea to shipped PR:

```text
Idea -> Discovery -> Delivery -> Issue -> Ship
```

GitHub remains the branch, PR, review, CI, and merge-history surface. Linear owns the Project, PRD, Tech Spec, Issue contract, review acceptance, and drift notes.

## Skills

- `linear-idea`: raw idea intake, AskQuestion mini-grill, Project in Idea.
- `linear-project`: Project body, status, lifecycle, and chips.
- `linear-prd`: PRD after discovery, or PRD-lite after explicit skip.
- `linear-spec`: Tech Spec after engineering review or lightweight engineering pass.
- `linear-issue`: one-PR Issue from Project + PRD + Tech Spec/exception.
- `linear-check`: report-only transition readiness checks.
- `linear-ship`: wrapper around a configured project ship workflow.

## Install And Update

This repo has one canonical workflow source and two generated wrapper modes.

Canonical truth stays only in this repo:

- `skills/linear-*/SKILL.md`
- `references/*`
- `templates/*`

Generated wrappers are discovery adapters. They are not workflow truth.

### Self Mode

Use self mode only inside `linear-agent-workflow` itself:

```bash
scripts/install.sh --mode self --target /Users/sasha/Projects/linear-agent-workflow
scripts/check.sh --mode self --target /Users/sasha/Projects/linear-agent-workflow
```

Self mode generates local Codex and Claude Code wrappers:

- `.agents/skills/linear-*/SKILL.md`
- `.claude/skills/linear-*/SKILL.md`

Wrappers point repo-relatively to `skills/linear-*/SKILL.md`. No lockfile is used because self mode follows the current checkout.

### Consumer Mode

Use consumer mode for Zeni and future repos:

```bash
scripts/install.sh \
  --mode consumer \
  --target /Users/sasha/Projects/zeni \
  --version v0.1.0
```

Run this after the requested SemVer tag exists in the workflow repository.

Consumer mode generates thin wrappers plus `.agents/linear-workflow.lock.json`. The lockfile pins the repository URL, SemVer tag, immutable commit SHA, adapter format version, generated wrapper hashes, and consumer config.

Consumer wrappers resolve the pinned workflow source from the lockfile. They must not point to `main`, a sibling checkout, or a machine-specific absolute path.

Updates are explicit and reviewable:

```bash
scripts/update.sh \
  --mode consumer \
  --target /Users/sasha/Projects/zeni \
  --version v0.2.0 \
  --branch linear-workflow-v0.2.0
```

For Zeni, the configured ship workflow is gstack `ship`.

See `references/versioning.md` for the full adapter contract and breaking-change policy.

## Principles

- Reusable first: consumer repos should not fork the workflow logic.
- Linear first: durable requirements live in Linear.
- One issue by default: split only into vertical slices with dependencies.
- No silent sync: report drift before moving stages.
- Report-only checks: `PASS` means inspected and no blocking drift found, not deterministic proof.

## Validation

```bash
git diff --check
scripts/check.sh --mode self --target /Users/sasha/Projects/linear-agent-workflow
scripts/smoke-test.sh
```
