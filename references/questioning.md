# Questioning Policy

Use questions to resolve product, workflow, scope, or risk choices that cannot be safely inferred from repo or Linear context.

Rules:

- Ask one question at a time.
- Prefer answer options with one recommended default when the choice is bounded.
- Frame questions in outcome terms, not implementation jargon.
- Do not ask about facts that can be discovered by reading repo, Linear, GitHub, or configured project policy.
- Do not ask permission for report-only checks.
- Do not ask the user to choose routine implementation details such as file layout, helper naming, or parser mechanics.

## Autonomy Defaults

The agent owns every answer it can ground in repo, Linear, GitHub, config, or
discovery context. Asking the user is the exception, not the rhythm.

Resolve without asking:

- Anything discoverable from repo, Linear, GitHub, or project config.
- Implementation details: file layout, naming, libraries, patterns, refactoring scope.
- Document structure, risk classification, review-gate routing, and workflow mechanics.
- Product micro-choices with one clearly safest option: decide, record, move on.

Decide-and-surface instead of pre-asking:

- When a non-contested product choice has a clearly better option, take it and
  record it in the draft package under «Решил сам:» with a one-line reason.
  The user overrides it at package approval; do not interrupt discovery to ask.

Always ask (one at a time, options + recommendation):

- Scope boundaries when genuinely contestable: what goes in, what gets cut.
- Issue slicing when the work plausibly exceeds one PR: propose the split and
  stage count with a reason, and ask before fixing it in the package.
- Risk acceptance: money, user data, production irreversibility, external access.
- Design and visual decisions: the user controls design. Never decide visual
  questions silently, and never ask them text-only when the difference is
  visual. Prepare side-by-side variants through the `/design-html` skill when
  the runtime provides it, open the mockup, then ask with a recommendation.
  When the runtime lacks `/design-html`, describe each variant concretely
  (layout, hierarchy, states) before asking.

Question stages (worker note: under `linear-orchestrate` dispatch, the
`## Orchestrated Mode` section below overrides every per-stage line — route
questions to the orchestrator mailbox, never to the user):

- `linear-idea`: ask 1-3 direction-shaping questions (outcome, boundary, audience) before creating or updating the Idea Project; resolve the rest as explicit assumptions in the brief.
- `linear-handoff`: ask only for package approval, unresolved product decisions, or accepted review fixes.
- `linear-review`: ask nothing by default; return findings and options. If a required artifact is unavailable, return `blocked`.
- `linear-implement`: ask only for implementation-start approval or a blocker involving product, UX, business, external access, dirty worktree, or risk acceptance.
- `linear-orchestrate`: ask only for Always-ask escalations (scope, design/UX, product risk, deploy approval per the configured policy); answer worker technical questions autonomously and record them under «Решил сам:»; batch design/UX escalations into the UX checkpoint with a prepared prototype per Director Discovery in references/orchestration.md.
- `linear-preflight`: ask only when local readiness cannot proceed because of dirty-worktree ownership, material drift, missing verification access, or commit/branch risk.
- `linear-ship`: ask only when feedback requires product, UX, business, scope, or risk acceptance decisions.
- `linear-deploy`: ask only for deploy approval per the configured deploy-approval policy, or a delivery-policy/risk-acceptance decision.

Output:

- Keep questions concise.
- Include the recommendation and why it is the safest workflow choice.
- Accept custom user answers when predefined options do not fit.

## Orchestrated Mode

When a stage skill runs inside a worker dispatched by `linear-orchestrate`:

- The worker never asks the user. Every question becomes a mailbox report
  with the worker's own recommendation (`needs-decision`).
- The orchestrator answers technical questions itself and records them under
  «Решил сам:» in the ledger.
- Always-ask questions still reach the user — through the orchestrator,
  immediately and interactively, as a prepared decision brief. The Always-ask
  list above is unchanged; only the routing changes.
- Discovery skills run in the orchestrator session with the orchestrator
  as respondent (Director Discovery): it answers their questions itself as
  product director, records material choices under «Решил сам:», and
  batches contested Always-ask items into the UX checkpoint or the
  package-approval brief instead of relaying question streams to the user.
