# Install Guide

Install this workflow as a local skill pack. Project repos must not contain
workflow skill bodies, generated wrappers, workflow lockfiles, local workflow
checkers, or updater CI.

## Source Of Truth

Canonical workflow truth stays in `linear-agent-workflow`:

- `skills/linear-*/SKILL.md`
- `references/*`
- `templates/*`
- `scripts/install-local.mjs`
- `scripts/project-config.mjs`

Project-specific policy lives in `.agents/linear-workflow.config.json`.

## Local Skill Pack

Run the installer from this upstream checkout:

```bash
node scripts/install-local.mjs --remove-stale
```

The command writes:

- `~/.codex/skills/linear-*/SKILL.md`
- `~/.codex/skills/linear-*/AGENTS.md`
- `~/.codex/skills/linear-*/references/*`
- `~/.codex/skills/linear-*/templates/*`
- `~/.codex/skills/.linear-agent-workflow.lock.json`

Use an alternate skills root only for tests or runtimes that do not read
`~/.codex/skills`:

```bash
node scripts/install-local.mjs --skills-root /path/to/skills --remove-stale
```

Check the local install without writing:

```bash
node scripts/install-local.mjs --check
```

`linear-preflight` has one external runtime prerequisite: the agent runtime
must have the `autoreview` skill/helper installed, for example
`~/.codex/skills/autoreview/scripts/autoreview`. This workflow does not vendor `autoreview`; preflight must exit `blocked` when the helper is unavailable.

## Project Config

Create, migrate, or check a project config from this upstream checkout:

```bash
node scripts/project-config.mjs --repo /path/to/project --project-name Zeni --write --clean
node scripts/project-config.mjs --repo /path/to/project --check
node scripts/project-config.mjs --repo /path/to/project --clean --check
```

The project config is JSON:

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
  },
  "deployApproval": "always"
}
```

Use `null` for optional workflows that are not configured. Use an empty
`artifactRoots` array when no narrow local discovery/review artifact roots
exist.

`--clean` removes legacy generated project installs:

- `.agents/skills/linear-*`
- `.claude/skills/linear-*`
- `.agents/linear-workflow-check.mjs`
- `.agents/linear-workflow.lock.json`
- `.agents/linear-workflow.config.md`
- `.github/workflows/update-linear-workflow.yml`
- `.github/workflows/update-linear-agent-workflow.yml`

## Project Policy

Keep project-specific policy in `.agents/linear-workflow.config.json`,
`AGENTS.md`, or supporting repo docs.

The JSON config should record:

- `projectName`: product/repo display name.
- `linearTeam`: Linear team name.
- `languages.linear`: Linear-facing Project, PRD, Tech Spec, Issue, and comment language.
- `languages.repo`: repo docs and code comments language.
- `artifactRoots`: narrow repo-relative or absolute discovery/review artifact roots.
- `workflows.implementation`: implementation workflow for `linear-implement`, or `null`.
- `workflows.ship`: ship workflow for `linear-ship`, or `null` only when ship is intentionally unconfigured.
- `workflows.documentation`: documentation workflow for `linear-ship`, or `null`.
- `workflows.reviewFeedback`: review feedback workflow for `linear-ship`, or `null`.
- `workflows.deploy`: deploy workflow for `linear-deploy`, or `null`.
- `prerequisites.autoreviewHelper`: must be `true`; `linear-preflight` blocks if the helper is unavailable.
- `deployApproval` (optional): deploy approval policy — `"always"` (default), `"risky-only"` (approval required for `standard`, `deep`, and `risky` risk classes; only `tiny` proceeds without asking), or `"never"`.

## Checks

Validate the upstream workflow contract:

```bash
node scripts/validate-workflow.mjs
```

Verify the local skill pack:

```bash
node scripts/install-local.mjs --check
```

Verify a project repo:

```bash
node scripts/project-config.mjs --repo /path/to/project --check
```

The project check fails when:

- `.agents/linear-workflow.config.json` is missing or invalid JSON;
- required config fields are missing;
- any value still contains an unresolved `<...>` placeholder;
- `prerequisites.autoreviewHelper` is not `true`;
- legacy generated workflow project files or updater CI are present.

## Anti-Patterns

- Do not install Linear workflow skills into a project repo.
- Do not create `.claude/skills/linear-*` wrappers in a project repo.
- Do not keep `.agents/linear-workflow-check.mjs` or `.agents/linear-workflow.lock.json` in a project repo.
- Do not keep `.github/workflows/update-linear-workflow.yml` in a project repo.
- Do not keep `.github/workflows/update-linear-agent-workflow.yml` in a project repo.
- Do not hand-edit local generated skills under `~/.codex/skills/linear-*`; edit this upstream repo and rerun `scripts/install-local.mjs`.
- Do not let `linear-review` mutate Linear artifacts; accepted fixes belong to `linear-handoff`, explicit atomic skills, or `linear-ship`.
- Do not let `linear-handoff` move the Project to Delivery; Delivery Start belongs to `linear-implement`.
- Do not let `linear-preflight` run pre-ship review/check or create/land the final PR by default; those belong to `linear-ship`.
- Do not let `linear-ship` merge, deploy, run post-ship checks, close Linear as shipped, or record deploy learnings; those belong to `linear-deploy`.
- Do not keep `Land workflow`; use `workflows.deploy`.
- Do not make Project Updates a required gate; record user review acceptance as a Linear comment.
