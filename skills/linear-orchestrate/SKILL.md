---
name: linear-orchestrate
description: Use when running a long-lived product orchestrator session that drives Linear projects and Issues through the workflow with delegated worker sessions.
---

# Linear Orchestrate

Use this skill to run the control plane for one product: drive Linear
projects and Issues through the existing workflow skills with delegated
workers, answer technical questions autonomously, and escalate only product
decisions to the user.

`linear-orchestrate` never does stage work itself. It inspects, delegates,
monitors, decides or escalates, records, and reports. Stage ownership is
unchanged: `linear-implement` owns Delivery Start, `linear-preflight` owns
local readiness, `linear-ship` owns the PR lifecycle, `linear-deploy` owns
merge/deploy and closeout.

Read first:

1. `AGENTS.md`
2. `references/orchestration.md`
3. `references/lifecycle.md`
4. `references/questioning.md`
5. `references/readiness-gates.md`
6. `references/human-friendly-output.md`
7. `templates/orchestrator-dispatch.md`
8. `templates/orchestrator-brief.md`
9. `templates/orchestrator-report.md`

When to use:

- The user starts or resumes an orchestrator session for a product («веди
  проекты», "orchestrate", "resume orchestration").
- Several Issues or projects must move in parallel without the user
  dispatching stages by hand.
- A previous orchestrator session ended and durable state must be rebuilt.

Do not use:

- For doing stage work directly; route it through workers or run the
  orchestrator-owned stages per the Stage Ownership table in
  `references/orchestration.md`.
- As a worker or subagent; workers must not orchestrate.
- When the user wants to drive a single Issue interactively; plain stage
  skills serve that better.

Inputs to gather:

- Project config `.agents/linear-workflow.config.json`: product name,
  configured workflows, `deployApproval`, and the optional `orchestration`
  block (`orchestration.transport`, `orchestration.maxParallelWorkers`).
- Fresh Linear state: projects in flight, Issue statuses, latest comments and
  certificates.
- Orchestrator state on disk under
  `~/.linear-agent-workflow/orchestrator/<product>/`: ledger, mailbox
  reports, and the `workers.json` worker registry.
- Runtime transport binding per `references/orchestration.md` Worker
  Transports (config override first, then runtime detection).
- Live worker sessions via the runtime session list when available.

Workflow states:

1. `resume`
   - Rebuild the full picture from Linear + ledger + mailbox + worker
     registry + live session list before any action (Resume procedure in
     `references/orchestration.md`).
   - Rebind to surviving `codex-cli` workers by thread id instead of
     respawning them.
   - Apply queued Linear mutations from worker reports that were never
     applied.
   - Output the rebuilt status table before taking new actions.
2. `intake-and-discovery`
   - Run `linear-idea` per idea in this session; with several ideas, queue
     them and run discovery one project at a time (Director Discovery in
     `references/orchestration.md`) while dispatched work continues.
   - Run the recommended discovery route and review skills through the
     Second Voice protocol (`references/orchestration.md`): an independent
     reviewer agent interrogates and challenges, you answer as product
     director, record material choices under «Решил сам:», and batch
     genuinely contested items into checkpoints instead of relaying
     question streams to the user.
   - For user-facing surface, prepare the UX checkpoint per
     `templates/orchestrator-brief.md`: a near-production prototype that
     already passed a design-lens Second Voice review (in-session pass as
     fallback), plus the few contested UX decisions, one brief.
   - Scope boundaries, issue slicing, risk acceptance, and design stay the
     user's decisions — exercised at checkpoints with prepared variants,
     per the Always-ask list.
3. `handoff`
   - Run `linear-handoff` in this session. Bring the user one
     package-approval decision brief per `templates/orchestrator-brief.md`.
   - After package approval, implementation start is the orchestrator's own
     decision; record it explicitly (the bundled-approval rule from
     `linear-implement` applies).
4. `dispatch`
   - One Issue per worker. Spawn through the runtime transport with
     `templates/orchestrator-dispatch.md`: full context snapshot, AFK
     contract, engine block, mailbox path, authorization. Include the
     no-sub-delegation rule in every dispatch prompt.
   - For `codex-cli` and `fallback` transports, create the worker's worktree
     before spawn per `references/orchestration.md` Worker Transports.
   - Record every spawn in `workers.json` (transport, thread id, worktree,
     branch, stage); update it on stage advance and respawn.
   - Cap concurrent workers at `orchestration.maxParallelWorkers` (default 3);
     queue the rest.
   - Respect Issue dependencies; queue dependents until their blockers
     report done.
   - Name workers `<ISSUE-KEY>: <stage>`.
5. `monitor`
   - Poll the mailbox cheaply; read reports; advance the same worker session
     to the next stage (`linear-implement` → `linear-preflight` →
     `linear-ship`). For `codex-cli` workers advance the same thread with
     `codex exec resume` and treat process exit plus report as the normal
     advance signal (liveness ladder in `references/orchestration.md`).
   - Follow the Monitoring Protocol in `references/orchestration.md`. Do not steer an actively progressing worker.
   - Route non-green reports (`blocked`, `needs-human`, `drift-candidate`,
     `needs-decision`, `scope-drift-needs-handoff`) to `decide-or-escalate`
     instead of advancing.
   - On `timed-out`: treat as a stuck worker; rebuild stage state from Linear
     and the last mailbox report and respawn per the Monitoring Protocol.
6. `decide-or-escalate`
   - Technical questions: decide, record in the ledger under «Решил сам:»
     with a one-line reason, answer the worker.
   - Always-ask questions (scope, design/UX, product risk, deploy approval
     per policy): escalate immediately and interactively with a decision
     brief. Design questions require prepared visual variants first.
7. `deploy-and-closeout`
   - When a worker reports `green` (linear-ship green certificate), run
     `linear-deploy` from this session per the configured Deploy workflow
     and `deployApproval` policy.
   - Record ledger entries; verify Linear closeout happened per stage skill
     contracts.

Rules:

- This skill is a control plane: never implement, edit code, fix CI, or rewrite PRs
  in this session; delegate that to workers. Discovery artifacts (prototypes,
  mockups, review notes) are discovery work, not stage work, and stay
  orchestrator-owned.
- Single Linear writer: all Linear mutations during orchestration happen in
  this session; workers never write to Linear and queue every stage-required
  mutation in their reports.
- Never skip or weaken lifecycle gates; the orchestrator sequences gates, it
  does not replace them.
- Never ask the user an unprepared question; exhaust autonomous work first
  and refresh item state immediately before asking (Decision Briefs policy).
- Touch the user only at checkpoints: intake direction questions, the UX
  checkpoint, package approval, deploy approval per policy, and ad-hoc
  risk or scope-drift escalations; decide everything else and record it
  under «Решил сам:» (Director Discovery in `references/orchestration.md`).
- Second Voice reviewers are discovery agents, not workers: they never
  talk to the user, never write Linear, and never dispatch or steer
  workers.
- Workers must not spawn sub-workers or manage other sessions; the
  no-sub-delegation rule goes into every dispatch prompt.
- One Issue per worker; the worker keeps its session and worktree across
  stages to preserve context.
- On material drift, stop the worker and escalate:
  `scope-drift-needs-handoff` routes through `linear-handoff` with the user.
- A stuck or dead worker is respawned from Linear plus the last mailbox
  report; continue the stage, do not restart the Issue.
- Keep the ledger free of secrets and routine polling entries.
- Keep user-facing output in the project config language (Russian by
  default); ledger and mailbox stay English except the fixed «Решил сам:»
  term.

Session verdicts:

- `active`: work in flight; status updates continue.
- `needs-human`: an Always-ask decision blocks all remaining progress;
  waiting on the user.
- `blocked`: orchestration cannot continue (Linear, config, or worker state
  unrecoverable); exact blocker reported.
- `idle`: every active Issue is deployed and closed; awaiting new work.

Final response (status update) must include, per
`templates/orchestrator-brief.md`:

- Status table: each active Issue with stage and one-line state.
- «Решил сам:» — decisions taken since the last update, one line each with
  the reason.
- «Нужно от тебя:» — decision briefs, or «нет».
- Workers: spawned/advanced/respawned since the last update.
- Linear: mutations applied and certificates recorded.
