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
- `.agents/linear-workflow-check.mjs` as a self-contained read-only consumer install checker;
- `.agents/linear-workflow.lock.json` with upstream identity, version, commit, generated skill paths/hashes, wrapper hashes, copied asset hashes, and checker hash;
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
- generated skill paths and hashes;
- generated Claude wrapper paths and hashes;
- generated checker path and hash;
- copied `references/` and `templates/` file paths and hashes.

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
  "checkerPath": ".agents/linear-workflow-check.mjs",
  "checkerSha256": "...",
  "copiedAssets": {
    "references": [{ "path": "artifact-quality.md", "sha256": "..." }],
    "templates": [{ "path": "prd.md", "sha256": "..." }]
  },
  "installedSkills": [
    {
      "name": "linear-check",
      "agentsPath": ".agents/skills/linear-check/SKILL.md",
      "claudePath": ".claude/skills/linear-check/SKILL.md",
      "sha256": "...",
      "wrapperSha256": "..."
    }
  ]
}
```

`installedAt` changes on every sync. Consumers should review the generated diff and treat `upstreamCommit`, `upstreamVersion`, generated body hashes, copied asset hashes, and checker hash changes as the meaningful release metadata.

## Consumer Config

Consumer-specific workflow choices live in `.agents/linear-workflow.config.md`, not in generated skill bodies or lockfile metadata.

Required workflow field:

- `Ship workflow`: creates the branch/PR through the consumer repo's normal ship command.
- `Autoreview helper`: records the external `autoreview` skill/helper prerequisite required by `linear-preflight`.

Optional fields:

- `Artifact roots`: narrow repo-relative or explicit absolute paths for local discovery/review artifacts. Use `None` when no scoped roots exist.
- `Implementation workflow`: starts and runs implementation from approved Linear Issue(s) when a consumer wants a fixed engine.
- `Documentation workflow`: updates repo documentation after PR creation and before final PR green certification.
- `Review feedback workflow`: resolves actionable PR review feedback, such as Greptile comments.
- `Deploy workflow`: merges and verifies/deploys the PR after `linear-ship` records a green certificate.

Example Zeni policy:

```markdown
- Artifact roots: None
- Autoreview helper: Required installed `autoreview` skill/helper in the agent runtime, or explicit consumer helper at `.agents/skills/autoreview/scripts/autoreview`; `linear-preflight` blocks if unavailable.
- Implementation workflow: compound-engineering:ce-work
- Ship workflow: gstack ship
- Documentation workflow: gstack document-release
- Review feedback workflow: compound-engineering:ce-resolve-pr-feedback
- Deploy workflow: gstack land-and-deploy
```

`Artifact roots`, `Implementation workflow`, `Documentation workflow`, `Review feedback workflow`, and `Deploy workflow` are optional. When `Artifact roots` is absent, artifact intake reports scoped local roots as unavailable instead of scanning broadly. When `Implementation workflow` is absent, `linear-implement` keeps backward-compatible behavior and uses the documented default selection table. When Documentation workflow is absent or `None`, `linear-ship` skips repo documentation sync and says so. When Review feedback workflow is absent or `None`, `linear-ship` waits for checks/reviews once and stops if actionable feedback appears. When Deploy workflow is absent or `None`, `linear-deploy` stops with a clear blocked report instead of inventing a merge/deploy path. When `Autoreview helper` is absent or the helper is unavailable in the agent runtime, `linear-preflight` stops `blocked` instead of replacing the review gate.

`Land workflow` is not a supported compatibility alias. Consumers must rename it to `Deploy workflow` in the same update that installs `linear-deploy`.

Every placeholder value in `.agents/linear-workflow.config.md` must be resolved
before the consumer install is ready. For optional workflows, write an explicit
workflow name or `None`; do not leave `<optional ...>` placeholders in place.

## Updates

Consumer updates are explicit and reviewable:

1. Start a normal branch in the consumer repo.
2. Run `node scripts/sync-consumer.mjs --repo /path/to/consumer --consumer-name <Name>` from the desired upstream checkout.
3. Review generated `.agents`, `.claude`, and lockfile changes.
4. Run `node scripts/sync-consumer.mjs --repo /path/to/consumer --check`.
5. In the consumer repo, run `node .agents/linear-workflow-check.mjs`.
6. Land the consumer PR.

The sync script rewrites generated workflow files only. Consumer product code and `.agents/linear-workflow.config.md` are preserved.

## Checks

`node scripts/sync-consumer.mjs --repo /path/to/consumer --check` verifies:

- each expected `.agents/skills/linear-*` generated skill exists;
- YAML frontmatter remains first;
- generated upstream metadata is near the top;
- installed skill contents match the upstream-generated body for the pinned lockfile commit and dirty flag;
- installed skills are large enough to be executable;
- copied `references/` and `templates/` match the upstream checkout beside each generated skill;
- `.claude/skills/linear-*` wrappers match generated discovery wrappers;
- `.agents/linear-workflow-check.mjs` matches the generated checker body;
- `.agents/linear-workflow.config.md` exists and contains no unresolved `<...>` placeholders;
- lockfile entries have matching paths and SHA-256 hashes for skills, wrappers, copied assets, and checker;
- unmanaged `linear-*` skills or wrappers are reported;
- redirect-stub patterns are rejected.

`node .agents/linear-workflow-check.mjs` verifies the same generated install contract from inside a consumer repo without needing the upstream checkout. It cannot compare to a newer upstream checkout, but it can prove the installed files still match the lockfile.

`linear-check` may report adapter status, but install, update, stale detection, and drift detection belong to `scripts/sync-consumer.mjs` and the generated local checker.

## Release Policy

Use SemVer tags for consumer releases.

- Patch: documentation, generated text, or validation changes that do not alter workflow behavior.
- Minor: new skills, new optional consumer config fields, new checks, or backward-compatible workflow additions.
- Major: removed skills, incompatible lockfile schema, required consumer config changes, or workflow changes that alter required Linear artifact semantics.

Before `v1.0.0`, breaking changes are allowed in minor releases only when the changelog and release notes call them out clearly. Consumers still update by PR, so every lockfile bump remains reviewable.
