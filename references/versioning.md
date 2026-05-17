# Versioning And Adapter Contract

This repository has one canonical workflow source and one consumer install contract.

Canonical workflow truth lives in:

- `skills/linear-*/SKILL.md`
- `references/*`
- `templates/*`
- `scripts/sync-consumer.mjs`

Generated consumer installs are reviewable local copies, not source-of-truth forks. They should not be edited by hand.

## Consumer Install Contract

Use `scripts/sync-consumer.mjs` for both installs and updates:

```bash
node scripts/sync-consumer.mjs --repo /path/to/consumer --consumer-name Zeni
node scripts/sync-consumer.mjs --repo /path/to/consumer --check
```

The install writes:

- `.agents/skills/linear-*/SKILL.md` as full executable generated skill bodies;
- `.agents/skills/linear-*/references/*` and `.agents/skills/linear-*/templates/*` beside each generated skill;
- `.claude/skills/linear-*/SKILL.md` as tiny discovery wrappers pointing at `.agents`;
- `.agents/linear-workflow.lock.json` with upstream identity, version, commit, paths, and hashes;
- `.agents/linear-workflow.config.md` as preserved consumer policy.

Consumer installs must not depend on an env var, sibling checkout, GitHub URL, or moving branch to execute the workflow. Opening the generated `.agents/skills/<name>/SKILL.md` in the consumer repo must be enough for the agent to follow the skill.

## Lockfile

The lockfile pins:

- upstream repository name;
- upstream version from `VERSION`;
- immutable 40-character upstream commit SHA;
- whether the upstream checkout was dirty when generated;
- install timestamp;
- consumer name;
- generated skill paths and hashes.

Example shape:

```json
{
  "schemaVersion": 1,
  "upstreamRepo": "darkdepot/linear-agent-workflow",
  "upstreamVersion": "0.3.0",
  "upstreamCommit": "0123456789abcdef0123456789abcdef01234567",
  "upstreamDirty": false,
  "installedAt": "2026-05-17T00:00:00.000Z",
  "consumerName": "Zeni",
  "installedSkills": [
    {
      "name": "linear-check",
      "agentsPath": ".agents/skills/linear-check/SKILL.md",
      "claudePath": ".claude/skills/linear-check/SKILL.md",
      "sha256": "..."
    }
  ]
}
```

`installedAt` changes on every sync. Consumers should review the generated diff and treat `upstreamCommit`, `upstreamVersion`, and `sha256` changes as the meaningful release metadata.

## Consumer Config

Consumer-specific workflow choices live in `.agents/linear-workflow.config.md`, not in generated skill bodies or lockfile metadata. The optional ship-phase fields are:

- `Ship workflow`: creates the branch/PR through the consumer repo's normal ship command.
- `Review feedback workflow`: resolves actionable PR review feedback, such as Greptile comments.
- `Land workflow`: merges and verifies/deploys the PR after the review loop is green.

Example Zeni policy:

```markdown
- Ship workflow: gstack ship
- Review feedback workflow: compound-engineering:ce-resolve-pr-feedback
- Land workflow: gstack land-and-deploy
```

`Review feedback workflow` and `Land workflow` are optional. When absent, `linear-ship` keeps backward-compatible behavior: it delegates PR creation, records the PR in Linear, and stops with a clear report instead of inventing a resolver or merge path.

## Updates

Consumer updates are explicit and reviewable:

1. Start a normal branch in the consumer repo.
2. Run `node scripts/sync-consumer.mjs --repo /path/to/consumer --consumer-name <Name>` from the desired upstream checkout.
3. Review generated `.agents`, `.claude`, and lockfile changes.
4. Run `node scripts/sync-consumer.mjs --repo /path/to/consumer --check`.
5. Land the consumer PR.

The sync script rewrites generated workflow files only. Consumer product code and `.agents/linear-workflow.config.md` are preserved.

## Checks

`node scripts/sync-consumer.mjs --repo /path/to/consumer --check` verifies:

- each expected `.agents/skills/linear-*` generated skill exists;
- YAML frontmatter remains first;
- generated upstream metadata is near the top;
- installed skill contents match the upstream-generated body for the pinned lockfile commit and dirty flag;
- installed skills are large enough to be executable;
- copied `references/` and `templates/` exist beside each generated skill;
- `.claude/skills/linear-*` wrappers match generated discovery wrappers;
- lockfile entries have matching paths and SHA-256 hashes;
- unmanaged `linear-*` skills or wrappers are reported;
- redirect-stub patterns are rejected.

`linear-check` may report adapter status, but install, update, stale detection, and drift detection belong to `scripts/sync-consumer.mjs`.

## Release Policy

Use SemVer tags for consumer releases.

- Patch: documentation, generated text, or validation changes that do not alter workflow behavior.
- Minor: new skills, new optional consumer config fields, new checks, or backward-compatible workflow additions.
- Major: removed skills, incompatible lockfile schema, required consumer config changes, or workflow changes that alter required Linear artifact semantics.

Before `v1.0.0`, breaking changes are allowed in minor releases only when the changelog and release notes call them out clearly. Consumers still update by PR, so every lockfile bump remains reviewable.
