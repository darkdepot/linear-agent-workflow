# Zeni Dogfood Example

Zeni is the first consumer repo for this workflow.

Project policy:

- Zeni keeps its existing project-specific skills.
- Zeni keeps only `.agents/linear-workflow.config.json` for this workflow.
- Zeni must not vendor `.agents/skills/linear-*`, `.claude/skills/linear-*`, workflow lockfiles, local checkers, or updater CI for this workflow.
- Use the local skill pack installed from this upstream repo through `scripts/install-local.mjs`.
- Zeni stores project policy in `.agents/linear-workflow.config.json` and repo docs.
- Zeni's configured implementation workflow is Compound `ce-work`.
- Zeni's configured ship workflow is gstack `ship`.
- Zeni's configured documentation workflow is gstack `document-release`.
- Zeni's configured review feedback workflow is Compound `ce-resolve-pr-feedback`.
- Zeni's configured deploy workflow is gstack `land-and-deploy`.

Dogfood order:

1. Ship the reusable workflow MVP.
2. Install/update the local skill pack from this upstream repo.
3. Write or migrate Zeni's `.agents/linear-workflow.config.json` and clean legacy project installs.
4. Use `linear-idea` for raw idea intake.
5. Use discovery/review skills in Plan Mode when helpful.
6. Use `linear-handoff` before implementation.
7. Use `linear-review` as a risk-based gate before Issue creation or pre-ship when required.
8. Create approved execution Issue(s) through handoff.
9. Use `linear-implement` to start Delivery and implement from the approved Issue(s).
10. Use `linear-preflight` to prepare the local branch and produce a certificate.
11. Use `linear-ship` for pre-ship review/check, PR creation, repo docs, review loop, and green certificate.
12. Use `linear-deploy` for Deploy workflow, post-ship check, Linear closeout, and durable learnings.
13. Keep Project, PRD, Tech Spec, and Issue current in Linear.

## Correct Raw Idea Intake

Input:

```text
Improve Settings > Agent by splitting Identity & phase, Voice & guardrails, and Context into separate saveable blocks. Improve Goals design and think through Yield target binding.
```

Expected behavior:

1. `linear-idea` inspects only minimal context.
2. It asks 2-4 idea-shaping questions with recommended options.
3. It creates or updates a Linear Project in `Idea`.
4. Final output includes:
   - Project link.
   - Strengthened brief.
   - Next step: `/office-hours` or `/brainstorming`.
   - Reason for the recommendation.
   - Statement that no PRD, Tech Spec, Issue, plan, ExecPlan, or code was created.

No implementation plan is produced.

## Correct Discovery To Handoff

Expected behavior:

1. User runs `/office-hours` or `/brainstorming` in Plan Mode.
2. User optionally runs `/plan-design-review` and `/plan-eng-review`.
3. When a discovery/review implementation plan appears, user runs `/linear-handoff` instead of `linear-prd -> linear-spec -> linear-issue` or direct implementation.
4. `linear-handoff` produces a handoff exit-plan if still in Plan Mode.
5. `linear-handoff` performs artifact intake, previews the package for approval before durable writes, and after approval updates Project, PRD, and Tech Spec in Linear and creates Issue(s).
6. `linear-handoff` runs or reports the required/advisory `linear-review handoff` gate before Issue creation.
7. Accepted review fixes are applied by `linear-handoff`, not by `linear-review`.
8. PRD and Tech Spec creation keeps the Project in Discovery or an equivalent pre-delivery state.
9. If the user explicitly approves implementation start, `linear-handoff` routes to `linear-implement`.
10. The Project moves to Delivery only through `linear-implement` after approved execution Issue(s) exist, delivery readiness is checked, and implementation-start approval is explicit.

## Correct Project Body Shape

Expected Project description sections:

```markdown
# Что

# Зачем

# Образ результата

# Что входит

# Что не входит
```

The Project body is a product brief, not a workflow dashboard. It should not include active doc lists, active issue lists, lifecycle bookkeeping, or agent-only workflow mechanics.

## Correct Issue Links

Expected Issue relationship shape:

- Body contains Linear chips/entity mentions for the Project, PRD, and Tech Spec.
- PRD and Tech Spec are added as Linear resources/links when the connector supports it.
- PRD and Tech Spec are not attached as Issue documents.
- Raw PRD or Tech Spec URLs are avoided when chips can represent the documents.

## Risk-Based Review Gate Examples

### Correct Risky Handoff Review

Input:

```text
Settings > Agent will change identity, phase, voice guardrails, and context behavior across multiple saveable blocks.
```

Expected behavior:

1. `linear-handoff` classifies the package as `deep` or `risky`.
2. Project, PRD, and Tech Spec are updated first.
3. `linear-review handoff` reports `needs-fixes` if actors, flows, requirement trace, validation, or rollout are weak.
4. User accepts or rejects proposed fixes.
5. `linear-handoff` applies accepted artifact fixes and records acceptance as a Linear comment.
6. `linear-check handoff` and `linear-check issue` run or are reported before implementation can start.
7. `linear-implement` verifies implementation-start approval, moves the Project to Delivery after prerequisites are explicit, then runs or reports `linear-check delivery`.

### Correct Implement To Preflight To Ship

Input:

```text
Implement the approved Issue from the current Linear package.
```

Expected behavior:

1. `linear-implement` fetches fresh Linear Project, PRD, Tech Spec, Issue, approval, review, and check state.
2. It starts from approved Issue(s), not raw discovery artifacts or local review plans.
3. It selects the configured/default implementation engine, implements the approved one-PR slice, and exits as `implemented-needs-preflight` when local implementation is complete.
4. `linear-preflight` inspects branch/worktree/diff, runs targeted verification and mandatory `autoreview` until it reports clean, commits when safe/configured, and emits a preflight certificate.
5. `linear-ship` consumes the preflight certificate, owns formal `linear-review pre-ship`, owns `linear-check pre-ship`, delegates PR creation to the configured Ship workflow, runs repo docs before final green when configured, stabilizes review/CI, and emits a `linear-ship green certificate`.
6. `linear-deploy` consumes the green certificate, verifies the current PR head SHA still matches, runs the configured Deploy workflow, runs/reports `linear-check post-ship`, closes Linear, and records durable learnings.

### Correct Tiny Advisory Review

Input:

```text
Rename one static empty-state sentence in a low-risk settings panel.
```

Expected behavior:

1. Scope is classified as `tiny`.
2. PRD-lite or no-spec exception is allowed only with the reason recorded.
3. `linear-review` is advisory and may be skipped.
4. `linear-check` can pass only when the advisory review-gate record is present in Project or Issue context.

### Anti-Example: Required Review Skipped

FAIL:

1. Handoff creates a standard Project, PRD, Tech Spec, and Issue package.
2. No `linear-review handoff` report or advisory exception is recorded.
3. Agent creates Issues and starts implementation.

Why this fails:

- Standard, deep, risky, or materially rewritten packages require the review gate.
- `linear-check handoff` should report FAIL.

### Anti-Example: Review Mutates Linear

FAIL:

1. `linear-review` finds weak acceptance examples.
2. `linear-review` edits the PRD directly.
3. Handoff proceeds without recording accepted fixes.

Why this fails:

- `linear-review` is report-only.
- Accepted fixes must be applied by `linear-handoff`, an explicit atomic skill, or `linear-ship`.

## Anti-Example: Vendored Project Install

FAIL:

```markdown
.agents/skills/linear-idea/SKILL.md
.claude/skills/linear-idea/SKILL.md
.agents/linear-workflow-check.mjs
.agents/linear-workflow.lock.json
.github/workflows/update-linear-workflow.yml
```

Why this fails:

- Project repos should not contain workflow skill bodies, discovery wrappers, workflow lockfiles, local checkers, or updater CI.
- The local skill pack is updated from the upstream repo, while project repos keep only `.agents/linear-workflow.config.json`.
- `linear-check project-config` should report this install as FAIL.

## Anti-Example: Direct Discovery Plan Approval

FAIL:

1. `/office-hours`, `/brainstorming`, or `/plan-eng-review` produces an implementation plan.
2. User approves the plan directly.
3. Agent starts code implementation without `linear-handoff`.

Why this fails:

- Discovery artifacts are inputs, not Linear source of truth.
- Project, PRD, Tech Spec, and Issue(s) were not updated before implementation.
- Implementation did not start from approved Linear Issue(s).

## Anti-Example: Delivery Too Early

FAIL:

1. PRD is created.
2. Tech Spec is created.
3. Project is moved to Delivery from `linear-handoff` or an atomic artifact skill.
4. No approved execution Issue exists, or no implementation-start approval is recorded.

Why this fails:

- PRD and Tech Spec belong to Discovery or Handoff.
- Delivery requires approved execution Issue(s) and explicit implementation-start approval.
- Delivery Start belongs to `linear-implement`.
- `linear-check delivery` must report FAIL.

## Anti-Example: Preflight Owns Ship

FAIL:

1. `linear-preflight` sees local tests pass.
2. It claims `linear-review pre-ship` and `linear-check pre-ship` passed.
3. It creates or lands the final PR without `linear-ship`.

Why this fails:

- `linear-preflight` owns local branch readiness only.
- Formal pre-ship review/check and PR lifecycle remain in `linear-ship`.
- Local tests do not imply PR review, CI, deploy, production smoke, or Linear closeout.

## Anti-Example: Ship Owns Deploy

FAIL:

1. `linear-ship` gets review and CI green.
2. It merges/deploys through the configured Deploy workflow.
3. It moves Linear to `Done` and records release learnings.

Why this fails:

- `linear-ship` stops at a `linear-ship green certificate`.
- Deploy workflow, post-ship check, Linear closeout, and learnings belong to `linear-deploy`.
- Repo documentation belongs before the green certificate so doc commits are reviewed before deploy.

## Anti-Example: Workflow Language In Linear Artifacts

FAIL:

1. Project body includes sections such as `Принципы workflow`, `Lifecycle`, `Документы`, `План задач`, or `Текущий статус`.
2. Tech Spec includes sections such as `Skill contracts` or `linear-check design`.

Why this fails:

- Linear artifacts must be product and implementation truth, not visible workflow instructions.
- Skills and examples should prevent this by construction; `scripts/lint-linear-artifacts.mjs` is only a lightweight smoke guard for this known regression class.

## Anti-Example: Dogfood Failure

FAIL:

1. User invokes `linear-idea` with a raw product improvement idea.
2. Agent performs deep code discovery.
3. Agent asks reasonable questions.
4. Agent writes an implementation plan.
5. Agent starts "Plan implementation".
6. No Linear Project is created.
7. No `/office-hours` or `/brainstorming` recommendation is made.

Why this fails:

- `linear-idea` did not complete its mandatory Project creation/update.
- Idea intake crossed into planning and delivery.
- `linear-check idea` must report FAIL.
