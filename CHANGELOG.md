# Changelog

All notable changes to Linear Agent Workflow are documented in this file.

This project follows Semantic Versioning. Breaking workflow or adapter contract changes require a major version bump after `v1.0.0`; before `v1.0.0`, they must be called out explicitly in release notes.

## [Unreleased]

- Reserve future install/update workflow changes for explicit versioned releases.

## [0.1.0] - 2026-05-17

### Added

- Two generated wrapper modes:
  - `self` mode for dogfooding this repository from its current checkout.
  - `consumer` mode for pinned, reviewable installs in repos like Zeni.
- Consumer lockfile contract at `.agents/linear-workflow.lock.json`.
- Install, update, check, and smoke-test scripts for wrapper generation and drift checks.
- Versioning reference for SemVer, lockfiles, wrapper hashes, and breaking-change policy.
