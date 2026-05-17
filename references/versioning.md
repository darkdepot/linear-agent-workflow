# Versioning And Adapter Contract

This repository has one canonical workflow source and two generated wrapper modes.

Canonical workflow truth lives only in:

- `skills/linear-*/SKILL.md`
- `references/*`
- `templates/*`

Generated wrappers are discovery adapters. They are not workflow truth and should not be edited by hand.

## Modes

### Self Mode

Use self mode only inside `linear-agent-workflow` itself:

```bash
scripts/install.sh --mode self --target "$(pwd)"
scripts/check.sh --mode self --target "$(pwd)"
```

Self mode generates:

- `.agents/skills/linear-*/SKILL.md`
- `.claude/skills/linear-*/SKILL.md`

Each wrapper points repo-relatively to `skills/linear-*/SKILL.md`. No lockfile is required because self mode follows the current checkout.

### Consumer Mode

Use consumer mode for repos like Zeni:

```bash
scripts/install.sh \
  --mode consumer \
  --target <path/to/consumer-repo> \
  --version v0.1.0
```

Consumer mode generates:

- `.agents/linear-workflow.lock.json`
- `.agents/skills/linear-*/SKILL.md`
- `.claude/skills/linear-*/SKILL.md`

Consumer wrappers read `.agents/linear-workflow.lock.json` and resolve the pinned workflow source from the lockfile. They must not point to `main`, a sibling checkout, or a machine-specific absolute path.

Generated consumer wrappers and lockfile skill entries are produced from the pinned commit, not from whatever happens to be checked out when the script runs.

## Lockfile

The lockfile pins:

- workflow repository URL;
- SemVer tag, for example `v0.1.0`;
- immutable 40-character commit SHA;
- adapter format version;
- generator version;
- generated wrapper file hashes;
- consumer configuration such as ship workflow, optional review feedback workflow, optional land workflow, language, hosts, and skills.

Example shape:

```json
{
  "schemaVersion": 1,
  "workflow": {
    "name": "linear-agent-workflow",
    "repository": "https://github.com/darkdepot/linear-agent-workflow.git",
    "version": "v0.1.0",
    "commit": "0123456789abcdef0123456789abcdef01234567"
  },
  "adapter": {
    "formatVersion": 1,
    "generatorVersion": "0.1.0",
    "hosts": ["codex", "claude"],
    "skills": ["linear-check"],
    "generatedFiles": [
      {
        "path": ".agents/skills/linear-check/SKILL.md",
        "sha256": "..."
      }
    ]
  },
  "consumer": {
    "name": "zeni",
    "shipWorkflow": "gstack ship",
    "reviewFeedbackWorkflow": "compound-engineering:ce-resolve-pr-feedback",
    "landWorkflow": "gstack land-and-deploy",
    "linearFacingLanguage": "ru",
    "skillInstructionLanguage": "en"
  }
}
```

`reviewFeedbackWorkflow` and `landWorkflow` are optional. Older lockfiles that do not include them remain valid. When absent, `linear-ship` keeps the previous behavior: it delegates PR creation, records the PR in Linear, and stops with a clear report instead of silently inventing a resolver or merge path.

## Updates

Consumer updates are explicit:

```bash
scripts/update.sh \
  --mode consumer \
  --target <path/to/consumer-repo> \
  --version v0.2.0 \
  --branch linear-workflow-v0.2.0
```

The update script rewrites generated wrappers and lockfile metadata. The consumer repo should review those changes through a normal PR.

## Checks

Self check verifies:

- generated wrappers exist for Codex and Claude Code;
- wrappers match the expected repo-relative self-mode content;
- no `.agents/linear-workflow.lock.json` exists.

Consumer check verifies:

- lockfile exists and has supported schema and adapter versions;
- pinned tag resolves to the pinned commit SHA;
- generated wrapper hashes match the lockfile;
- wrappers stay generated and thin;
- consumer skill dirs do not contain copied `references/` or `templates/`.

`linear-check` may report adapter status, but install, update, stale detection, and drift detection belong to these scripts.

## Breaking-Change Policy

Use SemVer tags for consumer releases.

- Patch: documentation, wrapper text, or validation changes that do not alter workflow behavior.
- Minor: new skills, new optional lockfile fields, new checks, or backward-compatible workflow additions.
- Major: removed skills, incompatible lockfile schema, required consumer config changes, or workflow changes that alter required Linear artifact semantics.

Before `v1.0.0`, breaking changes are allowed in minor releases only when the changelog and release notes call them out clearly. Consumers still update by PR, so every lockfile bump remains reviewable.
