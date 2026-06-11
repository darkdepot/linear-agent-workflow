# Plan 010: Discovery autonomy — decide-and-surface by default, ask only on contested scope/slicing/risk, design stays visual and user-controlled

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 889742b..HEAD -- references/questioning.md skills/linear-handoff/SKILL.md skills/linear-idea/SKILL.md README.md scripts/validate-workflow.mjs`
> Plans 005-008 may have landed before this one — their diffs to these files
> are expected; locate anchors by content search, not line numbers. Treat only
> mismatches in the specific excerpts below as STOP conditions.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: 007 (both edit `references/questioning.md` and handoff approval UX; land 007 first)
- **Category**: human-ux / direction
- **Planned at**: commit `889742b`, 2026-06-11

## Why this matters

The maintainer (a product person operating the workflow through chat) asked
for a different question economy: during discovery and handoff the agent
should resolve more on its own and ask only in genuinely contested
situations. Specifically, the moments that MUST stay with the human are:
scope boundaries (what goes in, what gets cut), issue slicing (how many
PRs/stages), risk acceptance, and design/visual decisions — design choices
must be presented visually (via the `/design-html` skill, side-by-side
variants) rather than as text-only A/B questions, because the maintainer
controls design by looking, not by reading. Everything else the agent should
decide itself and surface transparently as a «Решил сам» ledger in the
package approval screen, where overriding is one reply away. This converts
question-fatigue into reviewable autonomy without losing user control where
it matters.

## Current state

Excerpts verified at commit `889742b` (line numbers may shift after plans
005-008; anchor by content).

- `references/questioning.md:1-13` — the policy already forbids asking about
  discoverable facts and implementation details, but has no decide-and-surface
  rule, no explicit always-ask list for scope/slicing, and no rule for visual
  design decisions:

  ```
  Use questions to resolve product, workflow, scope, or risk choices that cannot be safely inferred from repo or Linear context.

  Rules:

  - Ask one question at a time.
  - Prefer answer options with one recommended default when the choice is bounded.
  ...
  - Do not ask the user to choose routine implementation details such as file layout, helper naming, or parser mechanics.
  ```

  (Plan 007 adds a `linear-deploy` stage line — keep it.)

- `skills/linear-handoff/SKILL.md:66-78` — "Draft package approval UX" lists
  required package-map elements (mutation boundary, Project brief shape, PRD
  decisions, Tech Spec decisions, Issue slicing, review gate, decision
  options). There is no «Решил сам» ledger element. Line 160 requires
  surfacing "Remaining assumptions, if any" — adjacent but not the same: a
  ledger of decisions TAKEN, with reasons, is what makes autonomy auditable.
- `skills/linear-handoff/SKILL.md:80-111` — the draft package example
  («Готов handoff draft…») shows Project/PRD/Tech Spec/Issue/Review
  gate/Validation blocks and the «Что делаем?» options.
- `skills/linear-idea/SKILL.md:21-32` — workflow step 3:
  `Ask 2-4 high-leverage AskQuestion-style questions.` No
  prefer-assumptions-over-questions rule.
- `README.md:178-194` — "Principles" bullet list (additive edits are safe;
  validator pins only `Review/check split` and `Delivery ladder` among these).
- Validator: `validateDocsAndExamples` in `scripts/validate-workflow.mjs` —
  plan 007 adds a `references/questioning.md` entry; extend it. Handoff pins
  live in `validateAntiPatterns` (search for `linear-handoff must`); all
  additive.
- The `/design-html` skill is a runtime-provided gstack skill (like
  `autoreview` in preflight) — the workflow references it by name and degrades
  gracefully when absent; this repo does not vendor it.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Full validation | `node scripts/validate-workflow.mjs` | exit 0, `…(12 skills checked).` |
| Artifact smoke | `node scripts/lint-linear-artifacts.mjs` | exit 0 |
| One-command verify (if plan 001 landed) | `node scripts/verify.mjs` | exit 0 |

## Scope

**In scope**:
- `references/questioning.md`
- `skills/linear-handoff/SKILL.md`
- `skills/linear-idea/SKILL.md`
- `README.md` (one additive Principles bullet)
- `scripts/validate-workflow.mjs` (additive pins)
- `plans/README.md` (status row — skip if reviewer maintains the index)

**Out of scope**:
- `skills/linear-implement/SKILL.md` — its question boundary ("Keep product
  discovery closed…") is already correct.
- `skills/linear-review/SKILL.md`, `linear-check` — report-only, never ask.
- Templates and certificates (plans 005/006/008 own them).
- Vendoring or wrapping `/design-html` itself.

## Git workflow

- Branch: current branch of the checkout you were dispatched into.
- Commit style: `feat: add discovery autonomy defaults and design-control rule`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the Autonomy Defaults section to questioning.md

After the existing `Rules:` block (keep every existing rule), add:

```markdown
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
```

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 2: «Решил сам» ledger in the handoff package approval

In `skills/linear-handoff/SKILL.md`:

a. In "Draft package approval UX" required elements, add after the PRD/Tech
   Spec items:
   `- «Решил сам:» — non-contested product choices the agent took itself, each with a one-line reason; overriding any of them is a valid approval answer.`
b. In the draft package example, insert a short block before `Review gate`:

   ```text
   Решил сам:
   - Skeleton повторяет структуру, но не копирует каждую кнопку — иначе шум.
   - Logs-страницы получают табличный skeleton, как у таблиц, а не спиннер.
   Если что-то из этого не так - скажи, поправлю до записи в Linear.
   ```

c. In "Rules:", add:
   `- Resolve non-contested product micro-choices yourself and surface them under «Решил сам:»; ask only per the Always-ask list in references/questioning.md (scope boundaries, issue slicing, risk acceptance, design decisions).`
   and
   `- Design and visual decisions follow references/questioning.md: prepare /design-html variants when available; the user controls design.`

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 3: Prefer assumptions over questions in linear-idea

In `skills/linear-idea/SKILL.md`, replace workflow step 3
(`Ask 2-4 high-leverage AskQuestion-style questions.`) with:
`3. Ask 1-3 high-leverage AskQuestion-style questions — only those that shape direction: outcome, boundary, or audience. Resolve everything else yourself and record it as explicit assumptions in the strengthened brief, so the user corrects by reading, not by interrogation.`
Keep step 4 (options + recommended + reason) unchanged.

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.
**Verify**: `grep -c "Ask 2-4" skills/linear-idea/SKILL.md` → 0.

### Step 4: README principle + validator pins

a. `README.md` "Principles": add one bullet:
   `- Autonomy with transparency: agents resolve non-contested choices themselves and surface them as «Решил сам»; scope boundaries, issue slicing, risk acceptance, and design decisions stay with the user, and design choices are presented visually.`
b. `scripts/validate-workflow.mjs`:
   - `validateAntiPatterns`, handoff block: add required strings
     `"«Решил сам:»"` and `"Always-ask list"`.
   - `validateDocsAndExamples`: extend the `references/questioning.md` entry
     (created by plan 007; if absent, create it) with `"## Autonomy Defaults"`
     and `"/design-html"`; extend the `README.md` entry with
     `"Autonomy with transparency"`.

**Verify**: `node --check scripts/validate-workflow.mjs` → exit 0.
**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 5: Full suite

**Verify**: `node scripts/lint-linear-artifacts.mjs` → exit 0;
`node scripts/validate-workflow.mjs` → exit 0; if plan 001 landed:
`node scripts/verify.mjs` → exit 0.

## Test plan

Validator pins from Step 4 are the regression tests. Negative check: remove
the «Решил сам:» element from the approval UX list, confirm
`node scripts/validate-workflow.mjs` fails naming the pin, restore, re-run
green.

## Done criteria

- [ ] `grep -n "## Autonomy Defaults" references/questioning.md` → 1 hit; the section contains the four always-ask bullets and the `/design-html` rule
- [ ] `grep -c "Решил сам" skills/linear-handoff/SKILL.md` ≥ 3 (UX element, example block, rule)
- [ ] linear-idea step 3 prefers assumptions; `grep -c "Ask 2-4" skills/linear-idea/SKILL.md` → 0
- [ ] README has the autonomy principle bullet
- [ ] `node scripts/validate-workflow.mjs` exits 0; `node scripts/lint-linear-artifacts.mjs` exits 0
- [ ] `git status --porcelain` shows changes only in in-scope files
- [ ] plans/README.md row updated (or reviewer maintains index)

## STOP conditions

- Plan 007 did not land and questioning.md lacks its deploy line — proceed
  (create the validateDocsAndExamples entry yourself) but note it in NOTES.
- Any existing validator or lint pin fails after your edits (e.g. the
  lint-pinned handoff strings `Do not rely on lint scripts…`,
  `Run a content-shape review on the package`) — restore, and if conflict is
  structural, stop.
- You are tempted to weaken the package-approval gate itself (the user still
  approves the package before durable writes — autonomy changes WHAT is asked,
  never WHETHER the package approval happens).

## Maintenance notes

- The «Решил сам» ledger is the trust mechanism that makes wider autonomy
  safe — if future skills gain decision power, they must surface decisions the
  same way. Watch for ledger bloat: more than ~5 entries per package means the
  agent is under-asking on genuinely contested points.
- Reviewer should scrutinize: the always-ask list wording — scope/slicing/risk/
  design must remain unambiguous user property; nothing in the new text may
  imply the agent can decide design silently.
- Deferred: an analogous autonomy pass for `linear-ship` review-feedback
  decisions (which findings to accept without asking) — needs dogfood data
  first.
