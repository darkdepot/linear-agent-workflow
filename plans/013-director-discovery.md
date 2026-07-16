# Plan 013: Director Discovery — orchestrator answers discovery-skill questions itself; the user is touched only at checkpoints

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git log --oneline -1` should show `53d9772`
> or a descendant. Anchor every edit by content search, not line numbers.
> Treat only mismatches in the specific excerpts below as STOP conditions.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: 010, 011, 012 (all landed)
- **Category**: human-ux / direction
- **Planned at**: commit `53d9772`, 2026-07-09

## Why this matters

The maintainer (a product person) runs the workflow through
`mono-orchestrate` and wants a different discovery economy. Today the
orchestrate skill says discovery runs «live with the user», and the discovery
skills (`/office-hours`, `/brainstorming`, `/plan-design-review`,
`/plan-eng-review`) are interrogative: they extract decisions from their
operator question by question. Under orchestration that operator must be the
orchestrator, not the user. The maintainer's contract: «я как офис-хаурс, а
ты как директор» — the orchestrator answers discovery questions itself as
product director, makes the best grounded decision at every non-contested
fork, and touches the user only at a small fixed set of checkpoints, bringing
reviewed near-production prototypes instead of question streams. This plan
encodes that contract without weakening a single lifecycle gate: scope
boundaries, issue slicing, risk acceptance, and design remain the user's
property — the change is WHEN and HOW they are asked, never WHETHER.

## Shared design decisions

Every task below implements these; do not re-litigate them mid-execution.

1. **Checkpoint model.** Under orchestration the user is touched at exactly
   five moments: (1) intake direction questions — 1-3 per idea, zero allowed
   when the idea is clear; (2) the UX checkpoint — only for work with a
   user-facing surface: one brief with a reviewed near-production prototype
   and the few genuinely contested UX decisions; (3) package approval — the
   existing single brief, bundling the implementation-start option; (4)
   deploy approval per the configured `deployApproval` policy; (5) ad-hoc
   escalations that cannot wait — risk acceptance (money, user data,
   production irreversibility, external access) and material scope drift.
   Everything else the orchestrator decides and records under «Решил сам:».
2. **Director-mode protocol.** Discovery skills run in the orchestrator
   session with the orchestrator as respondent: it generates their questions
   and answers them in-session as product director — grounded in the Linear
   brief, repo and product context, and prior user answers. It never routes a
   discovery-skill question to the user unless the question is on the
   Always-ask list; contested items are collected and batched into the UX
   checkpoint or the package-approval brief instead of interrupting
   discovery, unless they block discovery from continuing.
3. **Runtime fallback.** When a named discovery skill is not available in the
   current runtime, run an equivalent internal review pass over the same
   ground (product, engineering, and design lenses) and record the
   substitution in the discovery notes — same convention as the
   `mono-implement`/`mono-ship` runtime-availability fallbacks.
4. **Prototype bar.** The UX checkpoint presents a prototype, not prose:
   prepared via `/design-html` when the runtime provides it (concrete textual
   variants otherwise), with realistic product content and correct states,
   already passed through an internal design-review pass and iterated to
   near-production quality. Side-by-side variants where a genuine choice
   exists. Never bring a first draft; never ask a visual question text-only.
5. **Internal review passes may parallelize.** Lens reviews (product, eng,
   design) may run as parallel subagents when the runtime provides them;
   findings return to the orchestrator, never to the user directly. This does
   not touch the worker no-sub-delegation rule — workers still never spawn
   anything.
6. **Multi-idea intake.** The user may bring several ideas in one session:
   run `mono-idea` intake per idea, queue discovery, and run Director
   Discovery one project at a time while dispatched delivery work continues
   in parallel. The status table shows the discovery queue.
7. **Ownership unchanged.** Scope boundaries, issue slicing, risk acceptance,
   and design stay the user's decisions, exercised at checkpoints with
   prepared variants. Package approval before durable writes and all
   lifecycle gates stay verbatim. The report status set in
   `templates/orchestrator-report.md` is untouched.
8. **Naming.** The mode is called **Director Discovery** everywhere
   (references, skill, lifecycle, README); the user-facing brief is
   «UX-чекпоинт» in Russian templates.

## Current state

Excerpts verified at commit `53d9772` (anchor by content).

- `references/orchestration.md` Stage Ownership row:
  `| \`mono-idea\`, discovery | orchestrator session, live with the user |`
  — no director mode; no checkpoint model anywhere in the file.
- `skills/mono-orchestrate/SKILL.md` workflow state 2:

  ```
  2. `intake-and-discovery`
     - Run `mono-idea` and discovery dialogue directly in this session, live
       with the user. Scope and design belong to the user.
  ```

- `references/questioning.md` `## Orchestrated Mode` covers only stage skills
  inside dispatched workers; discovery skills in the orchestrator session are
  uncovered, so their per-stage lines (e.g. `mono-idea`: ask 1-3) apply as
  if the user drove them interactively.
- `references/lifecycle.md` `## Orchestration` Required/Forbidden lists say
  nothing about who answers discovery questions.
- `templates/orchestrator-brief.md` has Decision Brief and Status shapes; no
  UX-checkpoint shape and no prototype bar.
- `README.md:27` orchestrate bullet ends at `escalates only product decisions
  (scope, design, risk).`; the flow diagram line reads
  `-> run idea/discovery/handoff with the user in-session`.
- Validator: `scripts/validate-workflow.mjs` pins the orchestrate contract in
  the block starting `const orchestrate = read("skills/mono-orchestrate/SKILL.md")`
  and asserts on questioning/lifecycle/README below it. The questioning pin
  `` `mono-orchestrate`: ask only for Always-ask escalations `` must keep
  matching after edits.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Full validation | `node scripts/validate-workflow.mjs` | exit 0, `…(13 skills checked).` |
| Artifact smoke | `node scripts/lint-mono-artifacts.mjs` | exit 0 |
| One-command verify | `node scripts/verify.mjs` | exit 0, `8 checks` |

## Scope

**In scope**:
- `references/orchestration.md`
- `skills/mono-orchestrate/SKILL.md`
- `references/questioning.md`
- `references/lifecycle.md`
- `templates/orchestrator-brief.md`
- `README.md`
- `scripts/validate-workflow.mjs` (additive pins)
- `plans/README.md` (status row)

**Out of scope**:
- `mono-idea`, `mono-handoff`, worker-side skills — their contracts
  already work under Director Discovery (mono-idea's 1-3 direction
  questions ARE checkpoint 1; handoff's package brief IS checkpoint 3).
- `templates/orchestrator-dispatch.md`, `templates/orchestrator-report.md` —
  worker plumbing is untouched.
- Vendoring or wrapping `/office-hours`, `/design-html`, or any gstack skill.
- VERSION / CHANGELOG (the operator releases separately).

## Git workflow

- Branch: current branch of the checkout you were dispatched into.
- Commit style: `feat: director discovery — checkpoint model and UX-checkpoint brief for mono-orchestrate`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: `references/orchestration.md` — Director Discovery section

a. In `## Stage Ownership`, replace the row
   `| \`mono-idea\`, discovery | orchestrator session, live with the user |`
   with
   `| \`mono-idea\`, discovery | orchestrator session (Director Discovery) |`
b. In `## Decision Authority`, in the Design and UX bullet, append after
   `concrete textual variants otherwise).`:
   ` Under Director Discovery, batch design/UX escalations into the UX
   checkpoint unless they block discovery from continuing.`
c. After the `## Decision Authority` section, add a new section:

   ```markdown
   ## Director Discovery

   Discovery under orchestration runs in director mode: the user is the
   advisor, the orchestrator is the product director. Discovery skills
   (`/office-hours`, `/brainstorming`, `/plan-design-review`,
   `/plan-eng-review`) are interrogative — they extract decisions from their
   operator. Under orchestration that operator is the orchestrator: it
   generates their questions and answers them in-session as product director,
   grounded in the Linear brief, repo and product context, and prior user
   answers. It never relays a discovery-skill question stream to the user.

   - Material product choices made this way are recorded under «Решил сам:»
     and surface in the package-approval brief, where overriding any of them
     is a valid answer.
   - Genuinely contested items (per the Always-ask list) are collected and
     batched into the UX checkpoint or the package-approval brief; interrupt
     discovery only when the item blocks it from continuing.
   - When a named discovery skill is not available in the current runtime,
     run an equivalent internal review pass over the same ground (product,
     engineering, and design lenses) and record the substitution in the
     discovery notes.
   - Internal review passes may run as parallel subagents when the runtime
     provides them; findings return to the orchestrator, never to the user
     directly. Workers remain barred from spawning anything.

   Checkpoints — the only moments that touch the user:

   1. Intake direction questions: 1-3 per idea per `mono-idea`; zero when
      the idea is already clear.
   2. UX checkpoint (user-facing surface only): one brief per
      `templates/orchestrator-brief.md` with a reviewed near-production
      prototype and the few contested UX decisions.
   3. Package approval: the existing single handoff brief, bundling the
      implementation-start option.
   4. Deploy approval per the configured `deployApproval` policy.
   5. Ad-hoc: risk acceptance and material scope drift — these never wait.

   Prototype bar for the UX checkpoint: prepared via `/design-html` when the
   runtime provides it (concrete textual variants otherwise), realistic
   product content, correct states, side-by-side variants where a genuine
   choice exists, and an internal design-review pass already applied — the
   prototype is near-production, never a first draft.

   Multi-idea intake: the user may bring several ideas in one session. Run
   `mono-idea` per idea, queue discovery, and run Director Discovery one
   project at a time while dispatched delivery work continues in parallel;
   show the discovery queue in the status table.
   ```

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 2: `skills/mono-orchestrate/SKILL.md` — stage 2 and rules

a. Replace workflow state 2 in full:

   ```markdown
   2. `intake-and-discovery`
      - Run `mono-idea` per idea in this session; with several ideas, queue
        them and run discovery one project at a time (Director Discovery in
        `references/orchestration.md`) while dispatched work continues.
      - Run the recommended discovery route and review skills in this session
        with the orchestrator as respondent: answer their questions yourself
        as product director, record material choices under «Решил сам:», and
        batch genuinely contested items into checkpoints instead of relaying
        question streams to the user.
      - For user-facing surface, prepare the UX checkpoint per
        `templates/orchestrator-brief.md`: a near-production prototype that
        already passed an internal design-review pass, plus the few contested
        UX decisions, one brief.
      - Scope boundaries, issue slicing, risk acceptance, and design stay the
        user's decisions — exercised at checkpoints with prepared variants,
        per the Always-ask list.
   ```

b. In `Rules:`, add after the «Never ask the user an unprepared question»
   bullet:

   ```markdown
   - Touch the user only at checkpoints: intake direction questions, the UX
     checkpoint, package approval, deploy approval per policy, and ad-hoc
     risk or scope-drift escalations; decide everything else and record it
     under «Решил сам:» (Director Discovery in `references/orchestration.md`).
   ```

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.
**Verify**: `grep -c "live with the user" skills/mono-orchestrate/SKILL.md` → 0.

### Step 3: `references/questioning.md` — Orchestrated Mode covers discovery

a. In the stage list, extend the `mono-orchestrate` line by appending
   before its final period:
   `; batch design/UX escalations into the UX checkpoint with a prepared
   prototype per Director Discovery in references/orchestration.md`
   (keep the existing pinned prefix of the line byte-identical).
b. In `## Orchestrated Mode`, add a final bullet:

   ```markdown
   - Discovery skills run in the orchestrator session with the orchestrator
     as respondent (Director Discovery): it answers their questions itself as
     product director, records material choices under «Решил сам:», and
     batches contested Always-ask items into the UX checkpoint or the
     package-approval brief instead of relaying question streams to the user.
   ```

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 4: `references/lifecycle.md` — Orchestration section

a. In `## Orchestration` Required, add:
   `- Discovery under orchestration follows Director Discovery
   (references/orchestration.md): the orchestrator answers discovery-skill
   questions itself and touches the user only at checkpoints — intake
   direction questions, the UX checkpoint with a reviewed prototype, package
   approval, deploy approval per policy, and ad-hoc risk or scope-drift
   escalations.`
b. In `## Orchestration` Forbidden, add:
   `- Relaying discovery-skill question streams to the user one by one, or
   presenting an unreviewed first-draft prototype at the UX checkpoint.`

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 5: `templates/orchestrator-brief.md` — UX-чекпоинт shape

After the `## Бриф решения (Decision Brief)` section (including its trailing
notes about package-approval briefs and design questions), add:

````markdown
## UX-чекпоинт (UX Checkpoint Brief)

```text
UX-чекпоинт: <проект> — прототип готов к твоему фидбэку

Что смотрим: <ссылка/файл прототипа — near-production, уже прошёл внутренний design review>
Контекст: <одно предложение — какую часть продукта это меняет>
Решил сам: <ключевые product/UX-решения внутри прототипа, по строке с причиной>

Нужно твоё решение:
1. <контестный UX-вопрос: вариант A — рекомендую, почему / вариант B>
2. <…или «только общий фидбэк по прототипу»>
```

The prototype must be near-production before the checkpoint: realistic
product content, correct states, side-by-side variants where a genuine choice
exists (`/design-html` when the runtime provides it), and an internal
design-review pass already applied. Never bring a first draft.
````

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.
**Verify**: `node scripts/lint-mono-artifacts.mjs` → exit 0.

### Step 6: `README.md` — director mode surfaced

a. In the `mono-orchestrate` bullet (line ~27), append before the final
   period:
   `; runs discovery in director mode — answers discovery-skill questions
   itself and brings the user reviewed prototypes at checkpoints`
b. In the orchestrate flow diagram, replace
   `-> run idea/discovery/handoff with the user in-session`
   with
   `-> run idea/discovery/handoff in-session (Director Discovery: checkpoints, not question streams)`

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 7: validator pins (`scripts/validate-workflow.mjs`)

All additive. In the orchestrate block (`const orchestrate = read(...)`), add
to the required-strings array:

- `"Director Discovery"`
- `"UX checkpoint"`
- `"Touch the user only at checkpoints"`

Below the block, next to the existing assertIncludes lines, add:

- `assertIncludes("references/orchestration.md", "## Director Discovery");`
- `assertIncludes("references/orchestration.md", "near-production");`
- `assertIncludes("references/orchestration.md", "never a first draft");`
- `assertIncludes("references/questioning.md", "Director Discovery");`
- `assertIncludes("references/lifecycle.md", "Director Discovery");`
- `assertIncludes("templates/orchestrator-brief.md", "UX-чекпоинт");`
- `assertIncludes("README.md", "director mode");`

**Verify**: `node --check scripts/validate-workflow.mjs` → exit 0.
**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 8: Full suite and index row

**Verify**: `node scripts/verify.mjs` → exit 0.
Update `plans/README.md`: add row
`| 013 | Director Discovery: orchestrator answers discovery itself, checkpoint model, UX-чекпоинт brief | P1 | M | 010, 011, 012 | DONE (<commit>) |`
(fill the commit after committing).

## Test plan

Validator pins from Step 7 are the regression tests. Negative check: remove
the `## Director Discovery` heading from `references/orchestration.md`,
confirm `node scripts/validate-workflow.mjs` fails naming the pin, restore,
re-run green.

## Done criteria

- [ ] `grep -n "## Director Discovery" references/orchestration.md` → 1 hit;
      the section contains the five checkpoints, the prototype bar, the
      runtime fallback, and the multi-idea queue
- [ ] `grep -c "live with the user" skills/mono-orchestrate/SKILL.md` → 0
- [ ] `grep -c "Director Discovery" skills/mono-orchestrate/SKILL.md` ≥ 2
- [ ] questioning.md Orchestrated Mode covers discovery skills; the pinned
      `mono-orchestrate` stage-line prefix is byte-identical
- [ ] lifecycle.md Orchestration has the Director Discovery Required and
      Forbidden lines
- [ ] orchestrator-brief.md has the «UX-чекпоинт» shape with the
      near-production bar
- [ ] README bullet and diagram updated
- [ ] `node scripts/verify.mjs` exits 0
- [ ] `git status --porcelain` shows changes only in in-scope files
- [ ] plans/README.md row added

## STOP conditions

- Any existing validator pin fails after your edits (especially the
  questioning pin `` `mono-orchestrate`: ask only for Always-ask
  escalations `` and the orchestrate contract pins) — restore and stop if the
  conflict is structural.
- You are tempted to weaken package approval, any lifecycle gate, or the
  Always-ask ownership of scope/slicing/risk/design. Director Discovery
  changes WHEN and HOW the user is asked, never WHETHER.
- You are tempted to change the report status set in
  `templates/orchestrator-report.md` or worker dispatch plumbing — out of
  scope.
- The current text of any anchored excerpt above does not match the repo —
  stop and report the mismatch.

## Maintenance notes

- The checkpoint list is the contract that keeps autonomy trustworthy. If a
  future change adds a sixth user-touching moment, it must be added to the
  list in orchestration.md, lifecycle.md, and the orchestrate skill together.
- Watch for «Решил сам» bloat in package briefs: more than ~8 discovery-level
  entries per package suggests the orchestrator is under-asking on genuinely
  contested points — tighten the Always-ask batching, not the ledger.
- Deferred: a dogfood pass measuring how many user touches a real project
  takes end-to-end; target is ≤5 per the checkpoint model.
