# Changelog

All notable changes to Linear Agent Workflow are documented in this file.

This project follows Semantic Versioning. Breaking workflow or adapter contract changes require a major version bump after `v1.0.0`; before `v1.0.0`, they must be called out explicitly in release notes.

## [Unreleased]

- Reserve future install/update workflow changes for explicit versioned releases.

## [0.2.0] - 2026-05-17

### Added

- `linear-handoff` as the post-discovery bridge from review outputs into Project, PRD, Tech Spec, and Issue(s).
- Full-copy consumer sync through `scripts/sync-consumer.mjs`.
- Consumer install checks that reject stale generated skills, missing copied references/templates, unmanaged Linear skills, and redirect-stub patterns.
- `upstreamVersion` and full upstream commit metadata in `.agents/linear-workflow.lock.json`.

### Changed

- Consumer installs now generate executable `.agents/skills/linear-*` copies instead of thin workflow-source redirects.
- `.claude/skills/linear-*` is discovery-only and points to the generated `.agents` skill body.
- `linear-idea` and `linear-check` now route discovery plans through `linear-handoff` before implementation.

## [0.1.0] - 2026-05-17

### Added

- Two generated wrapper modes:
  - `self` mode for dogfooding this repository from its current checkout.
  - `consumer` mode for pinned, reviewable installs in repos like Zeni.
- Consumer lockfile contract at `.agents/linear-workflow.lock.json`.
- Install, update, check, and smoke-test scripts for wrapper generation and drift checks.
- Versioning reference for SemVer, lockfiles, wrapper hashes, and breaking-change policy.
