# Plan 014: Second Voice — discovery interrogation runs as an independent reviewer agent; the orchestrator answers, disagreements route to the user

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git log --oneline -1` should show `e5ec260`
> or a descendant. Anchor every edit by content search, not line numbers.
> Treat only mismatches in the specific excerpts below as STOP conditions.

## Status

- **Priority**: P1
- **Effort**: S-M
- **Risk**: MED
- **Depends on**: 013 (landed: 9a81e8c, e5ec260)
- **Category**: human-ux / direction
- **Planned at**: commit `e5ec260`, 2026-07-09

## Why this matters

Plan 013 made the orchestrator the respondent for discovery skills — but as
written, it also generates the questions itself. A self-interview is an echo
chamber: the same context that formed the product position also decides which
challenges it faces, so it cannot surface its own blind spots. The maintainer
asked for a real second opinion: an independent reviewer agent (the strongest
available model — Opus-class in Claude Code) runs the interrogative side of
`/office-hours`, `/plan-eng-review`, and `/plan-design-review`, while the
orchestrator answers as product director. Two voices produce a dialectic; the
disagreements that survive it are exactly the items worth the user's time.
This plan encodes that protocol — Second Voice — without touching any
lifecycle gate, checkpoint, or worker rule from plans 011-013.

## Shared design decisions

Every task below implements these; do not re-litigate them mid-execution.

1. **Second Voice = independent reviewer agent.** Fresh context: it gets the
   product brief, Linear links, repo read access, and the named discovery
   skill's question framework — none of the orchestrator's reasoning. It
   plays interviewer for idea shaping and critic for eng/design reviews; the
   orchestrator answers as product director.
2. **Bindings ladder**, mirroring Worker Transports style: Claude Code —
   subagent on the strongest reviewer model distinct from the orchestrator's
   own session (Opus-class; the Agent tool's `opus` model), dialogue
   continued via session messages to the same agent; Codex CLI runtimes — a
   fresh `codex exec` thread with `model_reasoning_effort="high"`, continued
   with `codex exec resume`, no worktree and no Issue (reviewer, not worker);
   fallback — in-session lens review with the substitution recorded in
   discovery notes. Never block discovery on a missing binding.
3. **Dialogue protocol**: rounds of ask → answer → challenge, capped at 3
   rounds per skill (guidance, not a gate); the Second Voice must close with
   a structured verdict: strengths, top risks, contested items,
   recommendation.
4. **Disagreement routing**: after the round cap, unresolved disagreements
   that are Always-ask class become user-checkpoint items (batched per the
   checkpoint model); everything else the orchestrator decides, recording
   both positions under «Решил сам:».
5. **Prototype pass**: the design-lens Second Voice reviews the prototype
   before the UX checkpoint; the user only sees a prototype that survived
   that pass (in-session review remains the fallback).
6. **Boundaries**: the Second Voice never talks to the user, never writes
   Linear, and never dispatches or steers workers; it is discovery work, not
   stage work. Workers remain barred from spawning anything.
7. **Dispatch shape lives in `references/orchestration.md`**, not a new
   template file: role + named skill, brief + links, repo read access, the
   instruction to deliver questions/challenges as its final message and never
   through user-question tools (there is no user on its side), and the
   required closing verdict shape.
8. **Naming**: **Second Voice** everywhere in English repo prose. No Russian
   template changes — the mechanism is internal and invisible to the user
   except through better briefs.

## Current state

Excerpts verified at commit `e5ec260` (anchor by content).

- `references/orchestration.md` `## Director Discovery` intro contains:
  `Under orchestration that operator is the orchestrator: it`
  `generates their questions and answers them in-session as product director,`
  and a bullet
  `- Internal review passes may run as parallel subagents when the runtime`
  `  provides them; findings return to the orchestrator, never to the user`
  `  directly. Workers remain barred from spawning anything.`
  The section ends with the Multi-idea intake paragraph, followed by
  `## Worker Transports`. The Prototype bar paragraph contains
  `an internal design-review pass already applied`.
- `skills/mono-orchestrate/SKILL.md` state 2 contains the bullet
  `- Run the recommended discovery route and review skills in this session`
  `  with the orchestrator as respondent: answer their questions yourself`
  and the UX-checkpoint bullet with
  `already passed an internal design-review pass`.
- `references/questioning.md` `## Orchestrated Mode` last bullet begins
  `- Discovery skills run in the orchestrator session with the orchestrator`
  `  as respondent (Director Discovery): it answers their questions itself as`.
- `references/lifecycle.md` `## Orchestration` Required contains
  `the orchestrator answers discovery-skill`
  `questions itself and touches the user only at checkpoints`.
- `README.md` orchestrate bullet ends
  `; runs discovery in director mode — answers discovery-skill questions`
  `itself and brings the user reviewed prototypes at checkpoints.`
  and the diagram line reads
  `-> run idea/discovery/handoff in-session (Director Discovery: checkpoints, not question streams)`.
- Validator pins from plan 013 that MUST keep passing: orchestrate contract
  strings `"Director Discovery"`, `"UX checkpoint"`,
  `"Touch the user only at checkpoints"`; assertIncludes for
  `## Director Discovery`, `near-production`, `never a first draft`
  (orchestration.md), `Director Discovery` (questioning.md, lifecycle.md),
  `UX-чекпоинт` (orchestrator-brief.md), `director mode` (README.md).

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
- `README.md`
- `scripts/validate-workflow.mjs` (additive pins)
- `plans/README.md` (status row)

**Out of scope**:
- Templates (`orchestrator-brief.md`, `orchestrator-dispatch.md`,
  `orchestrator-report.md`) — no user-facing or worker-facing shape changes.
- Worker transports, registry, monitoring protocol — untouched.
- `mono-idea`, `mono-handoff`, worker-side skills.
- Vendoring any gstack skill. VERSION / CHANGELOG.

## Git workflow

- Branch: current branch of the checkout you were dispatched into.
- Commit style: `feat: second voice — independent reviewer agent interrogates discovery, orchestrator answers`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: `references/orchestration.md` — Second Voice protocol

a. In the `## Director Discovery` intro, replace the sentence
   `Under orchestration that operator is the orchestrator: it generates
   their questions and answers them in-session as product director, grounded
   in the Linear brief, repo and product context, and prior user answers.`
   with
   `Under orchestration the interrogative side runs as a Second Voice — an
   independent reviewer agent per the protocol below — and the orchestrator
   answers as product director, grounded in the Linear brief, repo and
   product context, and prior user answers.`
b. Replace the bullet
   `- Internal review passes may run as parallel subagents when the runtime
   provides them; findings return to the orchestrator, never to the user
   directly. Workers remain barred from spawning anything.`
   with
   `- Second Voice and lens reviews run as agents per the Second Voice
   protocol below; findings return to the orchestrator, never to the user
   directly. Workers remain barred from spawning anything.`
c. In the Prototype bar paragraph, replace
   `an internal design-review pass already applied`
   with
   `a design-lens Second Voice pass already applied (in-session review as
   fallback)`
   keeping the rest of the paragraph — including `near-production` and
   `never a first draft` — intact.
d. At the end of `## Director Discovery` (after the Multi-idea intake
   paragraph, before `## Worker Transports`), add:

   ```markdown
   ### Second Voice

   A self-interview is an echo chamber. The interrogative side of discovery
   is delegated to a Second Voice: an independent reviewer agent in a fresh
   context that gets the product brief, Linear links, repo read access, and
   the named discovery skill's question framework — none of the
   orchestrator's reasoning. It plays interviewer for idea shaping
   (`/office-hours`, `/brainstorming`) and critic for reviews
   (`/plan-eng-review`, `/plan-design-review`); the orchestrator answers as
   product director.

   Bindings — pick the strongest available; never block discovery on a
   missing one:

   - Claude Code: spawn a subagent on the strongest reviewer model distinct
     from the orchestrator's own session (Opus-class; the Agent tool's
     `opus` model) and continue the dialogue via session messages to the
     same agent.
   - Codex CLI runtimes: a fresh `codex exec` thread with
     `model_reasoning_effort="high"`, continued with `codex exec resume`.
     The thread is a reviewer, not a worker: no worktree, no Issue, no
     registry entry.
   - Fallback: run the lens review in-session (product, engineering, and
     design lenses) and record the substitution in the discovery notes.

   Dispatch shape per skill run: the reviewer role and the named skill; the
   product brief and Linear links; repo read access; the instruction to
   deliver questions and challenges as its final message — never through
   user-question tools, there is no user on its side; and the required
   closing verdict: strengths, top risks, contested items, recommendation.

   Dialogue protocol: rounds of ask → answer → challenge, capped at 3
   rounds per skill (guidance, not a gate). After the cap, unresolved
   disagreements that are Always-ask class go to the user as checkpoint
   items; the rest the orchestrator decides, recording both positions under
   «Решил сам:».

   Boundaries: the Second Voice never talks to the user, never writes
   Linear, and never dispatches or steers workers; it is discovery work,
   not stage work.
   ```

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.
**Verify**: `grep -c "generates their questions and answers them in-session" references/orchestration.md` → 0.

### Step 2: `skills/mono-orchestrate/SKILL.md` — stage 2 and rules

a. Replace the state-2 bullet
   `- Run the recommended discovery route and review skills in this session
   with the orchestrator as respondent: answer their questions yourself as
   product director, record material choices under «Решил сам:», and batch
   genuinely contested items into checkpoints instead of relaying question
   streams to the user.`
   with
   `- Run the recommended discovery route and review skills through the
   Second Voice protocol (`references/orchestration.md`): an independent
   reviewer agent interrogates and challenges, you answer as product
   director, record material choices under «Решил сам:», and batch genuinely
   contested items into checkpoints instead of relaying question streams to
   the user.`
b. In the UX-checkpoint bullet of state 2, replace
   `already passed an internal design-review pass`
   with
   `already passed a design-lens Second Voice review (in-session pass as
   fallback)`.
c. In `Rules:`, add directly after the «Touch the user only at checkpoints»
   bullet:
   `- Second Voice reviewers are discovery agents, not workers: they never
   talk to the user, never write Linear, and never dispatch or steer
   workers.`

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.
**Verify**: `grep -c "Second Voice" skills/mono-orchestrate/SKILL.md` ≥ 3.

### Step 3: `references/questioning.md` — Orchestrated Mode bullet

Replace the last bullet of `## Orchestrated Mode`
(`- Discovery skills run in the orchestrator session with the orchestrator
as respondent (Director Discovery): it answers their questions itself as
product director, records material choices under «Решил сам:», and batches
contested Always-ask items into the UX checkpoint or the package-approval
brief instead of relaying question streams to the user.`)
with:

```markdown
- Discovery skills run in the orchestrator session with the orchestrator
  as respondent (Director Discovery): a Second Voice reviewer agent
  generates the questions and challenges when the runtime provides one, the
  orchestrator answers as product director, records material choices under
  «Решил сам:», and batches contested Always-ask items into the UX
  checkpoint or the package-approval brief instead of relaying question
  streams to the user. Disagreements that survive the Second Voice round
  cap go to the user only when they are Always-ask class.
```

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 4: `references/lifecycle.md` — Orchestration Required line

In the `## Orchestration` Required list, replace
`the orchestrator answers discovery-skill questions itself and touches the
user only at checkpoints`
with
`the orchestrator answers discovery-skill questions itself — a Second Voice
reviewer generates them when the runtime provides one — and touches the user
only at checkpoints`
keeping the rest of that bullet intact.

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 5: `README.md` — surface the second voice

a. In the orchestrate bullet, replace
   `; runs discovery in director mode — answers discovery-skill questions
   itself and brings the user reviewed prototypes at checkpoints.`
   with
   `; runs discovery in director mode — a Second Voice reviewer agent
   interrogates, the orchestrator answers, and the user gets reviewed
   prototypes at checkpoints.`
b. In the flow diagram, replace
   `-> run idea/discovery/handoff in-session (Director Discovery: checkpoints, not question streams)`
   with
   `-> run idea/discovery/handoff in-session (Director Discovery + Second Voice: checkpoints, not question streams)`

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 6: validator pins (`scripts/validate-workflow.mjs`)

All additive. In the orchestrate required-strings array, add:

- `"Second Voice"`

Next to the existing assertIncludes lines, add:

- `assertIncludes("references/orchestration.md", "### Second Voice");`
- `assertIncludes("references/orchestration.md", "never talks to the user, never writes");`
- `assertIncludes("references/questioning.md", "Second Voice");`
- `assertIncludes("references/lifecycle.md", "Second Voice");`
- `assertIncludes("README.md", "Second Voice");`

**Verify**: `node --check scripts/validate-workflow.mjs` → exit 0.
**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 7: Full suite and index row

**Verify**: `node scripts/verify.mjs` → exit 0.
Update `plans/README.md`: add row
`| 014 | Second Voice: independent reviewer agent interrogates discovery, orchestrator answers, disagreements route to checkpoints | P1 | S-M | 013 | DONE (<commit>) |`
(fill the commit after committing).

## Test plan

Validator pins from Step 6 are the regression tests. Negative check: break
the `### Second Voice` heading in `references/orchestration.md`, confirm
`node scripts/validate-workflow.mjs` fails naming the pin, restore, re-run
green.

## Done criteria

- [ ] `grep -n "### Second Voice" references/orchestration.md` → 1 hit; the
      subsection contains the bindings ladder (Claude Code opus, codex-cli,
      in-session fallback), the dispatch shape, the 3-round protocol with
      disagreement routing, and the boundaries line
- [ ] `grep -c "generates their questions and answers them in-session" references/orchestration.md` → 0
- [ ] `grep -c "Second Voice" skills/mono-orchestrate/SKILL.md` ≥ 3
- [ ] questioning.md Orchestrated Mode bullet names the Second Voice and the
      round-cap routing; pinned strings `Director Discovery` and
      `` `mono-orchestrate`: ask only for Always-ask escalations `` intact
- [ ] lifecycle.md Required line names the Second Voice; `Director
      Discovery` pin intact
- [ ] README bullet and diagram updated; `director mode` pin intact
- [ ] `node scripts/verify.mjs` exits 0
- [ ] `git status --porcelain` shows changes only in in-scope files
- [ ] plans/README.md row added

## STOP conditions

- Any existing validator pin fails after your edits — especially every plan
  013 pin listed in Current state — restore and stop if the conflict is
  structural.
- You are tempted to weaken the checkpoint model, package approval, any
  lifecycle gate, or the Always-ask ownership. Second Voice changes who asks
  the discovery questions, never who decides or when the user is touched.
- You are tempted to give the Second Voice worker powers (worktree, Issue,
  registry entry, Linear writes) or add it to `workers.json` — it is a
  reviewer, out of the worker plumbing entirely.
- The current text of any anchored excerpt above does not match the repo —
  stop and report the mismatch.

## Maintenance notes

- The Second Voice's value is its independence: if a future change starts
  feeding it the orchestrator's reasoning or lets the orchestrator draft its
  questions, the echo chamber is back — review any such change against this
  plan's Why.
- Round cap 3 is guidance from zero dogfood data; tune it after the first
  real projects. If most skills converge in 1 round, the cap is invisible;
  if none converge in 3, the briefs are too thin.
- Deferred: letting the Second Voice also challenge the handoff package
  before checkpoint 3 (package approval) — decide after measuring how often
  package briefs get user corrections.
