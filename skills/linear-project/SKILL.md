---
name: linear-project
description: Use when creating or updating a Linear Project as the source of truth for a coding-agent workflow.
---

# Linear Project

Create or update the Linear Project overview, lifecycle, status, and active artifact map.

Read first:

1. `AGENTS.md`
2. `references/artifact-rules.md`
3. `references/lifecycle.md`
4. `templates/project.md`

Rules:

- Keep Project body in Russian.
- Keep Project overview-level; do not inline the PRD or Tech Spec.
- Use Linear chips for documents and issues.
- Keep active Project documents to PRD and Tech Spec for this MVP.
- Keep active Project plan to one Issue by default.
- Do not include PR chips before a real PR exists.
- Do not leave obsolete/closed PR chips or raw PR URLs in durable body.

Status policy:

- Idea: strengthened brief only; no PRD, Tech Spec, or Issue.
- Discovery: Project plus PRD or PRD-lite.
- Delivery: Project plus PRD plus Tech Spec or explicit no-spec exception.
- Ship: Issue and PR state are synced by `linear-ship`, not by Project Updates.

Before finishing:

- Run or report `linear-check <mode>` for the transition you are supporting.
