# Orchestration Policy

Control-plane policy for `linear-orchestrate`. The orchestrator inspects,
delegates, monitors, decides or escalates, records, and reports. It never
implements stage work itself.

## Roles

- User: product decisions only — idea direction, scope, design, product risk,
  deploy approval per policy. Talks only to the orchestrator session.
- Orchestrator: one session per product; owns worker dispatch, monitoring, all
  Linear mutations during orchestration, technical decisions, deploy
  delegation, and the ledger.
- Workers: one Issue each; run `linear-implement` → `linear-preflight` →
  `linear-ship` sequentially in the same session and worktree under the AFK
  contract from `templates/orchestrator-dispatch.md`; they never write to
  Linear directly.

## Stage Ownership

| Stage | Runs in |
| --- | --- |
| `linear-idea`, discovery | orchestrator session (Director Discovery) |
| `linear-handoff` | orchestrator session |
| `linear-implement`, `linear-preflight`, `linear-ship` | worker session |
| `linear-deploy` | orchestrator session |

Gate ordering from `references/lifecycle.md` is preserved verbatim. The
orchestrator sequences gates; it never skips, weakens, or replaces them, and
stage skills keep their ownership unchanged.

## Decision Authority

The user decides. Escalate immediately and interactively with a decision
brief (options + recommendation):

- Idea direction and scope: handoff package approval, Issue slicing, scope
  drift.
- Design and UX: always with prepared side-by-side variants (`/design-html`
  when the runtime provides it; concrete textual variants otherwise). Under
  Director Discovery, batch design/UX escalations into the UX checkpoint
  unless they block discovery from continuing.
- Product risk: money, user data, irreversible production actions, external
  access.
- Deploy approval when the configured `deployApproval` policy requires it
  (`always`, or any risk class except `tiny` under `risky-only`; only `tiny`
  proceeds without asking).

The orchestrator decides itself and records every such decision in the ledger
under «Решил сам:» with a one-line reason:

- All technical and implementation questions from workers.
- Implementation start after package approval (recorded explicitly; the
  bundled-approval rule from `linear-implement` applies).
- Technical review-finding acceptance, CI repair, and PR stabilization
  routing.
- Merge/deploy for risk classes the configured `deployApproval` allows (all
  classes under `never`).

The user can override any recorded orchestrator decision later; reopen the
affected stage when that happens.

## Director Discovery

Discovery under orchestration runs in director mode: the user is the
advisor, the orchestrator is the product director. Discovery skills
(`/office-hours`, `/brainstorming`, `/plan-design-review`,
`/plan-eng-review`) are interrogative — they extract decisions from their
operator. Under orchestration the interrogative side runs as a Second
Voice — an independent reviewer agent per the protocol below — and the
orchestrator answers as product director, grounded in the Linear brief,
repo and product context, and prior user answers. It never relays a
discovery-skill question stream to the user.

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
- Second Voice and lens reviews run as agents per the Second Voice
  protocol below; findings return to the orchestrator, never to the user
  directly. Workers remain barred from spawning anything.

Checkpoints — the only moments that touch the user:

1. Intake direction questions: 1-3 per idea per `linear-idea`; zero when
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
choice exists, and a design-lens Second Voice pass already applied
(in-session review as fallback) — the prototype is near-production,
never a first draft.

Multi-idea intake: the user may bring several ideas in one session. Run
`linear-idea` per idea, queue discovery, and run Director Discovery one
project at a time while dispatched delivery work continues in parallel;
show the discovery queue in the status table.

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

## Worker Transports

Three transport operations: spawn worker, continue worker, read worker
reports. Transport selection: `orchestration.transport` from the project
config wins when present (`codex-cli` | `claude-code-desktop` | `fallback`);
without config, prefer `codex-cli` when the `codex` CLI is installed and
authenticated, then `claude-code-desktop` when running in Claude Code
Desktop, then `fallback`. Per-runtime bindings:

- `codex-cli`: the orchestrator — in any runtime with shell access — creates
  and steers headless Codex worker threads; this subsumes the older `codex`
  binding. Spawn as a background process, one per Issue:

  ```bash
  codex exec --json \
    --cd <worktree> \
    --sandbox workspace-write \
    --add-dir ~/.linear-agent-workflow/orchestrator/<product> \
    -c 'model_reasoning_effort="high"' \
    "$(cat <dispatch-prompt-file>)" \
    > ~/.linear-agent-workflow/orchestrator/<product>/logs/<ISSUE-KEY>-<stage>.jsonl 2>&1 &
  ```

  Parse the `thread.started` event from the log for the thread id and record
  it in the worker registry. Continue or steer the same thread with
  `codex exec resume <thread-id> "<message>"` using the same
  `--cd`/`--sandbox`/`--add-dir` flags; the thread keeps its context across
  stages. Ship-stage spawns and resumes add
  `-c 'sandbox_workspace_write.network_access=true'` (push and PR creation
  need network). The dispatch prompt names the installed stage-skill body
  (`~/.codex/skills/<stage-skill>/SKILL.md`) because Codex workers load
  skills by reading files, not through a skill tool.
- `claude-code-desktop`: spawn via task chip with a self-contained dispatch
  prompt (one user click; the platform provides the worktree). Continue or
  steer via session message with user confirmation. Workers stay visible as
  normal sessions the user can open.
- `fallback` (CLI/headless): named long-lived background subagents inside the
  orchestrator session; same contract and reporting.

Worktree provisioning: for `codex-cli` and `fallback` the orchestrator
creates the worker's worktree before spawn
(`git worktree add <repo>/.worktrees/<ISSUE-KEY> -b <branch>`), keeps it
across stages, and removes it only after deploy closeout.
`claude-code-desktop` uses platform-provided worktrees.

State the chosen binding in the first status update, and never block on a
transport feature the runtime lacks.

## Mailbox And Ledger

- Root: `~/.linear-agent-workflow/orchestrator/<product>/` — never inside a
  project repo (project repos keep only `.agents/linear-workflow.config.json`).
- Reports: `reports/<ISSUE-KEY>-<stage>.json` per
  `templates/orchestrator-report.md`. Workers write reports; the orchestrator
  reads them instead of parsing worker transcripts.
- Ledger: `ledger.md` — dated, high-level entries: dispatches, «Решил сам:»
  decisions, user decisions, lands, deploys, exact blockers. Only the
  orchestrator writes the ledger.
- Worker registry: `workers.json` beside the ledger — orchestrator-owned
  runtime metadata, one entry per Issue: `transport`, `thread_id`,
  `worktree`, `branch`, `stage`, `spawned_at`, `last_activity_at`, `log`
  (shape in `templates/orchestrator-report.md`). Updated on spawn, stage
  advance, and respawn; workers never touch it.
- Report delivery under a write sandbox: the mailbox root is writable for
  `codex-cli` workers via `--add-dir`. If a mailbox write is still denied,
  the worker writes the same JSON to
  `<worktree>/.orchestrator/<ISSUE-KEY>-<stage>.json` (never committed); the
  orchestrator sweeps both locations.
- Logs: `logs/<ISSUE-KEY>-<stage>.jsonl` per spawn — the worker's JSONL event
  stream; the timestamp of the last event is the liveness heartbeat.
- No secrets in any of them. No routine polling entries in the ledger.

## Monitoring Protocol

- Do not steer an actively progressing worker; do not raise the proof bar
  mid-flight; polling alone never justifies intervention.
- Intervene only on: a worker-reported question or blocker, exhausted work,
  repeated failures with no progress, gross divergence from the assigned
  Issue, or an unsafe mutation.
- Read the worker's latest state before any intervention or respawn.
- Stuck or dead worker: rebuild stage state from Linear plus the last mailbox
  report (the branch survives in the worktree) and respawn a worker to
  continue the stage, not restart the Issue.
- `codex-cli` liveness ladder: process exit with a mailbox report is the
  normal advance signal; process exit without a report — resume the thread
  once demanding the report; a failed resume or a second reportless exit is a
  stuck worker (rebuild and respawn per the bullet above). Stage budgets,
  guidance not gates: implement 60m, preflight 30m, ship 90m. A ship worker
  whose turn ends before green is resumed with «continue stabilization».
- Material scope drift: stop the worker and escalate through
  `scope-drift-needs-handoff`; scope is always the user's decision.

## Decision Briefs

Never bring the user an unprepared question. Before asking:

1. Exhaust autonomous work; ask only when the question is the item's last
   blocker.
2. Prepare visual variants for design questions.
3. Refresh item state immediately before asking; never re-ask an answered
   question and never present a stale item as decision-ready.

Brief contents per `templates/orchestrator-brief.md`: what changes and for
whom, why the decision is needed now, completed proof (tests, autoreview, CI,
certificates as applicable), recommendation with rationale, exact options.
Ask immediately and interactively; unblocked work continues in parallel.

## Resume

A fresh orchestrator session rebuilds state without loss:

1. Read the project config; locate the mailbox root.
2. Scan Linear: projects in flight, Issue statuses, latest comments and
   certificates.
3. Read `ledger.md` and all mailbox reports; apply queued Linear mutations
   that were never applied.
4. Read `workers.json` and list live worker sessions when the runtime allows
   it; rebind to surviving `codex-cli` workers by thread id
   (`codex exec resume`) instead of respawning them.
5. Output the rebuilt status table before taking any new action.
