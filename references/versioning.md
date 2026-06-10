# Versioning And Install Contract

This repository has one canonical workflow source, one local skill pack
contract, and one project config contract.

Canonical workflow truth lives in:

- `skills/linear-*/SKILL.md`
- `references/*`
- `templates/*`
- `scripts/install-local.mjs`
- `scripts/project-config.mjs`

## Local Skill Pack Contract

Use `scripts/install-local.mjs` for installs and updates:

```bash
node scripts/install-local.mjs --remove-stale
node scripts/install-local.mjs --check
```

The install writes local runtime files under `~/.codex/skills` by default:

- `linear-*/SKILL.md` as executable generated local skill bodies;
- `linear-*/AGENTS.md` beside each generated local skill;
- `linear-*/references/*` and `linear-*/templates/*` beside each generated local skill;
- `.linear-agent-workflow.lock.json` with upstream identity, version, commit, dirty flag, installed skill paths/hashes, and copied asset hashes.

Opening `~/.codex/skills/<name>/SKILL.md` must be enough for the agent runtime
to follow the skill. Project repos must not carry workflow execution logic.

## Local Lockfile

The local lockfile pins:

- upstream repository name;
- upstream version from `VERSION`;
- immutable 40-character upstream commit SHA;
- whether the upstream checkout was dirty when generated;
- install timestamp;
- skills root;
- generated local skill paths and hashes;
- copied `AGENTS.md`, `references/`, and `templates/` hashes.

Example shape:

```json
{
  "schemaVersion": 2,
  "upstreamRepo": "darkdepot/linear-agent-workflow",
  "upstreamVersion": "0.11.0",
  "upstreamCommit": "0123456789abcdef0123456789abcdef01234567",
  "upstreamDirty": false,
  "installedAt": "2026-06-10T00:00:00.000Z",
  "skillsRoot": "$HOME/.codex/skills",
  "assets": {
    "agents": "...",
    "references": [{ "path": "artifact-quality.md", "sha256": "..." }],
    "templates": [{ "path": "prd.md", "sha256": "..." }]
  },
  "installedSkills": [
    {
      "name": "linear-check",
      "path": "linear-check/SKILL.md",
      "sha256": "..."
    }
  ]
}
```

`installedAt` changes on every install. Treat `upstreamCommit`,
`upstreamVersion`, generated body hashes, and copied asset hashes as the
meaningful release metadata.

## Project Config Contract

Project-specific workflow choices live in `.agents/linear-workflow.config.json`.

Required fields:

- `projectName`: product/repo display name.
- `linearTeam`: Linear team name.
- `languages.linear`: Linear-facing Project, PRD, Tech Spec, Issue, and comment language.
- `languages.repo`: repo docs and code comments language.
- `artifactRoots`: array of narrow repo-relative or absolute artifact roots. Use `[]` when none exist.
- `workflows`: object with `implementation`, `ship`, `documentation`, `reviewFeedback`, and `deploy`.
- `prerequisites.autoreviewHelper`: must be `true`.

Workflow fields:

- `Implementation workflow`: starts and runs implementation from approved Linear Issue(s) when a project wants a fixed engine.
- `Ship workflow`: creates/syncs the branch or PR through the project repo's normal ship command.
- `Documentation workflow`: updates repo documentation after PR creation and before final PR green certification.
- `Review feedback workflow`: resolves actionable PR review feedback, such as Greptile comments.
- `Deploy workflow`: merges and verifies/deploys the PR after `linear-ship` records a green certificate.
- `Autoreview helper`: records the external `autoreview` skill/helper prerequisite required by `linear-preflight`.
- `Artifact roots`: names narrow local discovery/review artifact roots.

Use `null` for optional workflows that are not configured. When
`workflows.implementation` is `null`, `linear-implement` uses the documented
default selection table. When `workflows.documentation` is `null`,
`linear-ship` skips repo documentation sync and says so. When
`workflows.reviewFeedback` is `null`, `linear-ship` waits for checks/reviews
once and stops if actionable feedback appears. When `workflows.deploy` is
`null`, `linear-deploy` stops with a clear blocked report instead of inventing
a merge/deploy path.

`Autoreview helper` is required, not optional. When
`prerequisites.autoreviewHelper` is missing or not `true`, project config
checks fail. When the field is present but the helper is unavailable in the
agent runtime, `linear-preflight` stops `blocked` instead of replacing the
review gate.

Example Zeni project config:

```json
{
  "schemaVersion": 1,
  "projectName": "Zeni",
  "linearTeam": "Zeni",
  "languages": {
    "linear": "Russian",
    "repo": "English"
  },
  "artifactRoots": [],
  "workflows": {
    "implementation": "compound-engineering:ce-work",
    "ship": "gstack ship",
    "documentation": "gstack document-release",
    "reviewFeedback": "compound-engineering:ce-resolve-pr-feedback",
    "deploy": "gstack land-and-deploy"
  },
  "prerequisites": {
    "autoreviewHelper": true
  }
}
```

`Land workflow` is not a supported compatibility alias. Projects must use
`workflows.deploy`.

Every placeholder value in `.agents/linear-workflow.config.json` must be
resolved before the project config is ready.

## Updates

Workflow updates are local:

1. Update this upstream checkout to the desired version/commit.
2. Run `node scripts/install-local.mjs --remove-stale`.
3. Run `node scripts/install-local.mjs --check`.
4. Use `node scripts/project-config.mjs --repo /path/to/project --check` only to verify project-specific config and absence of legacy vendored workflow files.

Project migrations are config-only:

1. Start a normal branch in the project repo when the project repo needs a committed config cleanup.
2. Run `node scripts/project-config.mjs --repo /path/to/project --project-name <Name> --write --clean`.
3. Review the JSON config and removed legacy workflow files.
4. Run `node scripts/project-config.mjs --repo /path/to/project --check`.
5. Land the project PR.

## Checks

`node scripts/install-local.mjs --check` verifies:

- each expected local `~/.codex/skills/linear-*` skill exists;
- installed skill contents match the current upstream-generated body;
- copied `AGENTS.md`, `references/`, and `templates/` match the upstream checkout;
- `.linear-agent-workflow.lock.json` has matching paths and SHA-256 hashes.

`node scripts/project-config.mjs --repo /path/to/project --check` verifies:

- `.agents/linear-workflow.config.json` exists and is valid JSON;
- required fields are present and have the expected JSON shape;
- no unresolved `<...>` placeholders remain;
- `prerequisites.autoreviewHelper` is `true`;
- legacy generated workflow project files and updater CI are absent.

`linear-check` may report project config status, but local skill install,
update, stale detection, and project cleanup belong to `scripts/install-local.mjs`
and `scripts/project-config.mjs`.

## Release Policy

Use SemVer tags for workflow releases.

- Patch: documentation, generated text, or validation changes that do not alter workflow behavior or install/config contracts.
- Minor: new skills, new optional project config fields, new checks, or backward-compatible workflow additions.
- Major: removed skills, incompatible lockfile schema, required project config changes, or workflow changes that alter required Linear artifact semantics.

Before `v1.0.0`, breaking changes are allowed in minor releases only when the
changelog and release notes call them out clearly.
