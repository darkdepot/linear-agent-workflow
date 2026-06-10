# Changelog

All notable changes to Linear Agent Workflow are documented in this file.

This project follows Semantic Versioning. Breaking workflow or adapter contract changes require a major version bump after `v1.0.0`; before `v1.0.0`, they must be called out explicitly in release notes.

## [Unreleased]

## [0.11.0] - 2026-06-10

### Added

- Add `scripts/install-local.mjs` for installing/updating the workflow as a local `~/.codex/skills/linear-*` skill pack.
- Add `scripts/project-config.mjs` for creating, migrating, checking, and cleaning project-level `.agents/linear-workflow.config.json`.

### Changed

- Pre-v1.0 packaging contract change: project repos must no longer vendor generated `linear-*` skills, wrappers, lockfiles, local checkers, or updater CI.
- Replace generated project install validation with local skill-pack validation plus project JSON config validation.

### Removed

- Remove `scripts/sync-consumer.mjs` and the generated full-copy project install contract.

## [0.10.0] - 2026-05-29

### Changed

- Pre-v1.0 workflow behavior change: make `linear-preflight` use the installed `autoreview` helper as a mandatory clean gate instead of the previous bounded Compound `ce-code-review` loop.
- Record `Autoreview helper` as an explicit consumer prerequisite; generated workflow installs do not vendor the external `autoreview` helper and preflight blocks when it is unavailable.

## [0.9.0] - 2026-05-23

### Added

- Add `linear-deploy` as the post-ship owner for Deploy workflow delegation, verified delivery evidence, post-ship check, Linear closeout, and durable learning capture.
- Add `templates/deploy-output.md` and a durable `linear-ship green certificate` contract for handoff from ship to deploy.
- Add optional consumer config field `Documentation workflow`, defaulting Zeni to `gstack document-release`.

### Changed

- Pre-v1.0 workflow behavior change: hard-rename `Land workflow` to `Deploy workflow`; no compatibility alias is supported.
- Move repo documentation sync into `linear-ship` before final green review stabilization so doc commits are reviewed before deploy.
- Split `linear-ship` and `linear-deploy`: `linear-ship` now stops at a deploy-ready green certificate, while `linear-deploy` owns merge/deploy, post-ship check, Linear closeout, and learning capture.
- Strengthen `linear-preflight` with a bounded pre-PR `ce-code-review` loop and residual finding reporting.

## [0.8.0] - 2026-05-23

### Added

- Add `linear-implement` as the Delivery Start owner that verifies implementation-start approval, moves Projects to Delivery, runs or reports `linear-check delivery`, selects an implementation engine, and exits to preflight.
- Add `linear-preflight` as the local branch readiness owner for worktree/diff inspection, targeted verification, self-review, commit state, and a preflight certificate consumed by `linear-ship`.
- Add `references/artifact-intake.md` for scoped discovery/review artifact intake with source precedence, freshness/conflict rules, and required confidence-boundary fields.
- Add optional consumer config field `Implementation workflow`, with backward-compatible default selection when absent.

### Changed

- Make the lifecycle explicit: `linear-idea -> discovery/reviews -> linear-handoff -> approved Issue(s) -> linear-implement -> linear-preflight -> linear-ship`.
- Update `linear-handoff` to run artifact intake before package synthesis and route explicit start-now approval to `linear-implement` instead of owning Delivery Start.
- Clarify that `linear-ship` consumes preflight output when present and remains sole owner of formal pre-ship review/check, PR creation/stabilization, review feedback, merge/deploy delegation, and Linear closeout.
- Extend consumer sync and workflow validation to include the Delivery Bridge Trio skills and copied references/templates.

## [0.7.0] - 2026-05-19

### Added

- Add an execution quality reference for PRD coverage, durable Issue writing, AFK/HITL readiness, bug/perf feedback-loop proof, tracer-bullet implementation guidance, and deep/risky architecture review.

### Changed

- Strengthen PRD and Issue contracts with actor/capability/benefit coverage, behavior-validation intent, agent readiness, dependencies, key contracts, and bug/perf current-vs-desired reproduction shape.
- Make consumer install checks fail while `.agents/linear-workflow.config.md` still contains unresolved `<...>` placeholders.

## [0.6.0] - 2026-05-18

### Changed

- Make `linear-idea`, `linear-handoff`, `linear-review`, `linear-check`, and `linear-ship` user-facing responses outcome-first and more human: product-first idea intake, artifact-map handoff summaries, human review/check meanings, explicit next-step options, and review/CI status that explains whether a PR is actually ready to land.
- Add a shared human-friendly output contract with status translation, checked/not-checked confidence boundaries, consequence-aware decision prompts, fresh-agent handoff guidance, and blocked/timed-out response shape.

## [0.5.0] - 2026-05-18

### Added

- Add `linear-review` as a report-only quality and risk review gate for Project, PRD, Tech Spec, Issue, and pre-ship packages.
- Add shared questioning, artifact-quality, readiness-gate, and review-rubric references plus a review output template.
- Add workflow validation through `scripts/validate-workflow.mjs`.
- Add generated consumer-local `.agents/linear-workflow-check.mjs` plus copied asset and wrapper hashes in the install lockfile.

### Changed

- Strengthen PRD, Tech Spec, and Issue templates with review-gate fields, traceable IDs, richer acceptance, implementation units, failure modes, validation, and rollback expectations while preserving product-brief Project bodies.
- Update `linear-handoff`, `linear-check`, and `linear-ship` around the risk-based review gate while keeping `linear-check` as readiness-only.
- Make consumer install checks compare copied `references/` and `templates/` against upstream instead of checking only sentinel files.
- Make workflow validation exercise consumer-sync behavior with fixtures for edited, missing, extra, and redirect-stub generated files.
- Keep Linear-facing template headings in Russian while preserving repo skill instructions in English.

## [0.4.0] - 2026-05-17

### Changed

- Pre-v1.0 workflow behavior change: make `linear-handoff` the primary post-discovery route and reposition atomic PRD/Spec/Issue skills as internal/advanced helpers.
- Keep Projects in Discovery through PRD and Tech Spec creation; Delivery now requires approved execution Issue(s).
- Define package approval, implementation-start approval, and delivery checks so handoff cannot silently become implementation.
- Replace Project and Tech Spec templates that leaked workflow mechanics into Linear-facing artifacts.
- Strengthen PRD/Tech Spec/Issue skill contracts with WHAT/HOW/execution separation, PRD requirement IDs, acceptance examples, and content-shape checks.
- Reserve future install/update workflow changes for explicit versioned releases.

### Added

- Add a lightweight regression smoke script and a Profile Workbench example for the first Zeni dogfood failure mode.

### Fixed

- Artifact smoke failures now use portable ESM path resolution and de-duplicated unreadable-file diagnostics.

## [0.3.0] - 2026-05-17

### Added

- Extend `linear-ship` into a full Ship-phase orchestrator around configured PR creation, review feedback, merge/deploy, and Linear closeout workflows.
- Add optional consumer config fields for review feedback and merge/deploy workflows.
- Add ship feedback-loop reference and ship output template.

## [0.2.0] - 2026-05-17

### Added

- `linear-handoff` as the post-discovery bridge from review outputs into Project, PRD, Tech Spec, and Issue(s).
- Full-copy consumer sync through `scripts/sync-consumer.mjs`.
- Consumer install checks that reject stale generated skills, missing copied references/templates, unmanaged Linear skills, and redirect-stub patterns.
- Consumer sync now removes orphaned generated `linear-*` skill and wrapper directories before writing the current upstream set.
- Consumer template-copy checks now require both `project.md` and `check-output.md` sentinels.
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
