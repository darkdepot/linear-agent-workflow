---
name: linear-project
description: Use when creating or updating a Linear Project as the source of truth for a coding-agent workflow.
---

# Linear Project

Create or update the Linear Project overview as a concise product brief.

Read first:

1. `AGENTS.md`
2. `references/artifact-rules.md`
3. `references/readiness-gates.md`
4. `references/lifecycle.md`
5. `templates/project.md`

Rules:

- Keep Project body in the consumer config language; use Russian when no consumer config is present.
- Keep Project overview-level; do not inline the PRD or Tech Spec.
- Keep Project body to five product-brief concerns: what, why, target outcome, in scope, and out of scope. Default Russian headings are `Что`, `Зачем`, `Образ результата`, `Что входит`, and `Что не входит`.
- Do not include active docs, active issues, status bookkeeping, lifecycle notes, or workflow mechanics in the Project body.
- Use Linear metadata, resources, comments, and the handoff package for document and issue relationships.
- Keep active Project documents to PRD and Tech Spec for this MVP.
- Keep active Project plan to one Issue by default.
- Record the current review-gate state in Linear comments, metadata, or the handoff package: risk, required/advisory/skipped, verdict, evidence or comment link, inspected artifacts, finding disposition, owner workflow, and next step.
- Do not include PR chips before a real PR exists.
- Do not leave obsolete/closed PR chips or raw PR URLs in durable body.

Status policy:

- Idea: strengthened brief only; no PRD, Tech Spec, or Issue.
- Discovery: Project plus discovery outputs; durable PRD/Tech Spec may exist and are normally created by `linear-handoff`.
- Handoff readiness: Project remains in Discovery or an equivalent configured pre-delivery status while PRD, Tech Spec, and proposed or approved Issue slicing are current. Record readiness in comments or check output, not in the Project body.
- Delivery: Project plus PRD plus Tech Spec or explicit no-spec exception plus approved execution Issue(s), and implementation is ready to begin from those Issue(s).
- Ship: Issue and PR state are synced by `linear-ship`, not by Project Updates.

Before finishing:

- Run or report `linear-check <mode>` for the transition you are supporting.
