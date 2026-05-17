---
name: linear-spec
description: Use when creating or updating a Linear Tech Spec before delivery or issue creation.
---

# Linear Spec

Create or update the Tech Spec as implementation truth: HOW the approved PRD will be built.

This is an atomic helper. The normal post-discovery user-facing workflow is `linear-handoff`, which may use this skill as one step.

Read first:

1. `AGENTS.md`
2. `references/artifact-rules.md`
3. `templates/tech-spec.md`

Rules:

- Write Linear Tech Spec content in the consumer config language; use Russian when no consumer config is present.
- Tech Spec defines HOW, not product discovery.
- Use Project and PRD as the source documents.
- If engineering review exists, convert it into a durable Tech Spec.
- If engineering review does not exist, run a lightweight engineering pass and create a lightweight spec.
- Use explicit no-spec exception only for truly simple, low-risk work.
- Do not use no-spec exception for risky, cross-cutting, data, auth, release, or multi-surface work.
- Do not write historical repair language.
- Do not create PRs.
- Do not start implementation.

Before finishing:

- Run or report `linear-check delivery`.
