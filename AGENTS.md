# AGENTS.md

## Mission

This repo defines reusable Linear workflow skills for AI coding agents.

The workflow helps agents move from raw idea to shipped PR while keeping Linear as the durable source of truth for Project, PRD, Tech Spec, and Issue.

## Language

- Skill instructions in this repo are written in English.
- Linear-facing templates and output examples are written in Russian.

## Source Of Truth

- Linear Project entity = shaped outcome plus lifecycle/status and relationships carried through Linear metadata, resources, comments, and the handoff package.
- Linear Project body = concise product brief only: what, why, target outcome, in scope, and out of scope.
- Linear PRD = WHAT: problem, operator, workflow, scenarios, requirements, acceptance.
- Linear Tech Spec = HOW: architecture, contracts, failure modes, validation.
- Linear Issue = one-PR execution contract with context snapshot.
- `linear-review` = report-only quality/risk review; no Linear mutations.
- GitHub = branch, PR, review, CI, deploy, and merge history only.
- `linear-handoff` = post-discovery bridge that persists Project, PRD, Tech Spec, and Issue slicing before implementation starts.
- `linear-implement` = Delivery Start and implementation execution from approved Linear Issue(s).
- `linear-preflight` = local branch readiness, targeted verification, mandatory `autoreview` clean gate, commit state, and preflight certificate.
- `linear-ship` = formal pre-ship review/check, PR lifecycle, repo documentation before final green, review feedback loop, and green certificate.
- `linear-deploy` = deploy workflow delegation, verified delivery evidence, post-ship check, Linear closeout, and durable learning capture.

## Skill Design Rules

- Keep `SKILL.md` descriptions as routing text, not the whole workflow.
- Keep atomic skills focused on one artifact.
- Keep wrappers focused on orchestration.
- Use `references/` and `templates/` through progressive disclosure.
- Do not copy long templates into every skill.
- Keep `linear-review` report-only and `linear-check` readiness-only.
- Apply accepted review fixes through `linear-handoff`, explicit atomic skills, or `linear-ship`.
- Keep `linear-handoff`, `linear-implement`, `linear-preflight`, `linear-ship`, and `linear-deploy` ownership separate; do not collapse them into a monolithic delivery skill.
- Do not make Project Updates a required gate.
- Record user review acceptance as a Linear comment.
- Consumer `.agents/skills/linear-*` installs must be full generated skill bodies, not redirect adapters.

## Validation

Run before finishing changes:

```bash
git diff --check
```
