# AGENTS.md

## Mission

This repo defines reusable Linear workflow skills for AI coding agents.

The workflow helps agents move from raw idea to shipped PR while keeping Linear as the durable source of truth for Project, PRD, Tech Spec, and Issue.

## Language

- Skill instructions in this repo are written in English.
- Linear-facing templates and output examples are written in Russian.

## Source Of Truth

- Linear Project = shaped outcome, lifecycle status, active docs, and issue plan.
- Linear PRD = WHAT: problem, operator, workflow, scenarios, requirements, acceptance.
- Linear Tech Spec = HOW: architecture, contracts, failure modes, validation.
- Linear Issue = one-PR execution contract with context snapshot.
- GitHub = branch, PR, review, CI, and merge history only.

## Skill Design Rules

- Keep `SKILL.md` descriptions as routing text, not the whole workflow.
- Keep atomic skills focused on one artifact.
- Keep wrappers focused on orchestration.
- Use `references/` and `templates/` through progressive disclosure.
- Do not copy long templates into every skill.
- Do not make Project Updates a required gate.
- Record user review acceptance as a Linear comment.

## Validation

Run before finishing changes:

```bash
git diff --check
```
