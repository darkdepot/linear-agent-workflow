# Zeni Dogfood Example

Zeni is the first consumer repo for this workflow.

Consumer policy:

- Zeni keeps its existing project-specific skills.
- Zeni should not copy the full reusable workflow into `.agents/skills`.
- Zeni may add thin wrappers or bootstrap instructions if needed for local discovery.
- Zeni's configured ship workflow is gstack `ship`.

Dogfood order:

1. Ship the reusable workflow MVP.
2. Add thin Zeni integration.
3. Run the current Linear Project through `linear-check delivery`, `linear-check issue`, and `linear-check pre-ship`.
4. Keep Project, PRD, Tech Spec, and Issue current in Linear.
