# Questioning Policy

Use questions to resolve product, workflow, scope, or risk choices that cannot be safely inferred from repo or Linear context.

Rules:

- Ask one question at a time.
- Prefer answer options with one recommended default when the choice is bounded.
- Frame questions in outcome terms, not implementation jargon.
- Do not ask about facts that can be discovered by reading repo, Linear, GitHub, or configured consumer policy.
- Do not ask permission for report-only checks.
- Do not ask the user to choose routine implementation details such as file layout, helper naming, or parser mechanics.

Question stages:

- `linear-idea`: ask 2-4 idea-shaping questions before creating or updating the Idea Project.
- `linear-handoff`: ask only for package approval, unresolved product decisions, or accepted review fixes.
- `linear-review`: ask nothing by default; return findings and options. If a required artifact is unavailable, return `blocked`.
- `linear-ship`: ask only when feedback requires product, UX, business, scope, or risk acceptance decisions.

Output:

- Keep questions concise.
- Include the recommendation and why it is the safest workflow choice.
- Accept custom user answers when predefined options do not fit.
