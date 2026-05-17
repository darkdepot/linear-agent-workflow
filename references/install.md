# Install Guide

Install this workflow into a consumer repo as a reusable workflow, not as copied project truth.

## Recommended Consumer Setup

1. Make `skills/linear-*` available to the target agent runtime.
2. Keep `references/` and `templates/` available next to the skills.
3. Add a short consumer repo instruction:
   - Linear Project, PRD, Tech Spec, and Issue are source of truth.
   - GitHub is PR/review/CI/merge history only.
   - Use `linear-idea`, `linear-prd`, `linear-spec`, `linear-issue`, `linear-check`, and `linear-ship` for Linear-tracked work.
4. Configure the ship workflow used by `linear-ship`.

## Zeni Consumer Notes

- Zeni should keep its existing project-specific skills.
- Zeni should not copy the whole reusable workflow into `.agents/skills`.
- Zeni can add thin wrappers or bootstrap guidance if the agent runtime needs local discovery.
- Zeni ship workflow is gstack `ship`.
