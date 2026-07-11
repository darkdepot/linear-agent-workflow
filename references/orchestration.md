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

Narrow control-plane exception: under an explicit owner mandate the
orchestrator may author operational and deploy-repair changes directly —
deploy scripts, infra config, docs address sweeps. Every such change is
always recorded in the ledger as a control-plane exception naming the
mandate; feature code never qualifies and always routes through workers.
Wave-1 precedent: deploy-repair ops PRs authored under the owner's explicit
«исправь» mandate and honestly ledgered.

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
  run an equivalent review pass over the same ground (product,
  engineering, and design lenses) through the Second Voice — a missing
  skill does not license in-session self-review while an agent binding
  exists — and record the substitution in the discovery notes.
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

Model selection is mandatory and cross-vendor: the Second Voice runs on
a different model family from the orchestrator. A fresh context on the
*same* model is not a second voice — it inherits the same training,
biases, and blind spots and collapses into self-review (an Opus
orchestrator interrogating an Opus reviewer learns nothing new). Pick the
strongest available cross-vendor model, both sides at high reasoning;
never block discovery on a missing one.

- Orchestrator on a Claude model (Fable, Opus, Sonnet, …) → Second Voice
  = `gpt-5.6-sol` at `model_reasoning_effort="high"`, a fresh `codex
  exec` thread continued with `codex exec resume`. The thread is a
  reviewer, not a worker: no worktree, no Issue, no registry entry. Note
  the live thread id and round count in the discovery notes so a resumed
  orchestrator rebinds or deliberately restarts the dialogue — and ends
  orphaned reviewer processes — instead of silently losing it.
- Orchestrator on GPT-5.6 (`sol`, `terra`, `luna`) → Second Voice =
  Claude Opus (latest) at high reasoning, spawned via the Claude
  transport — the Agent tool's `opus` model in Claude Code, or `claude -p
  --model opus` from a Codex runtime — and continued via session messages
  to the same agent.
- Fallback, only when the cross-vendor model is unreachable (no Codex
  auth, or no Claude access): run the lens review in-session (product,
  engineering, and design lenses) and record the substitution and its
  reason in the discovery notes.
  A same-model Second Voice is not an acceptable fallback; an in-session
  lens pass is.

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
    -c 'model="<pinned model>"' \
    -c 'model_reasoning_effort="high"' \
    "$(cat <dispatch-prompt-file>)" < /dev/null \
    > ~/.linear-agent-workflow/orchestrator/<product>/logs/<ISSUE-KEY>-<stage>-a1.jsonl 2>&1 &
  ```

  Spawn verification, mandatory for every spawn attempt:

  - The dispatch prompt is passed only as a file
    (`"$(cat <dispatch-prompt-file>)" < /dev/null`); inline prompts are
    forbidden. Quoting drift silently truncates inline prompts, and without
    `< /dev/null` a mis-parsed command drops the CLI into interactive stdin
    mode instead of failing.
  - `thread.started` must appear in the log within 60 seconds of spawn;
    otherwise kill the process and retry as the next attempt.
  - A first log line that is not JSON (does not start with `{`) is an
    immediate spawn failure — kill and retry; never wait out the timeout.
  - Recording "ok" or a live thread in the worker registry or ledger with an
    empty `thread_id` is forbidden; write the registry entry only after
    `thread.started` is parsed.
  - Log files are numbered from the first attempt
    (`logs/<ISSUE-KEY>-<stage>-a1.jsonl`, retries `-a2`, `-a3`, ...) so a
    retry never overwrites the failed attempt's evidence.
  - The worker model and reasoning effort are pinned explicitly in the spawn
    command (`-c 'model=...'`, `-c 'model_reasoning_effort=...'`); CLI
    defaults drift between versions (the wave-1 `model_switch` precedent),
    and a silently switched model voids the dispatch contract.

  Parse the `thread.started` event from the log for the thread id and record
  it in the worker registry, together with the background process pid (`$!`)
  so the heartbeat watcher can probe writer liveness. Continue or steer the same thread with
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
- Ledger format, mandatory:
  - One event per line, appended in write order; the timestamp is the
    actual moment of writing (ISO 8601 with timezone offset). Recording an
    event under the time it "should have happened" is forbidden. An event
    noticed late keeps its append position, carries the true write-time,
    and adds a `recorded-late` marker with the estimated event time
    (wave-1 precedent: a "07:50 respawned, thread live" entry written at
    11:43 hid a 4-hour idle gap from the final wave report).
  - Only observed facts: never record an action as done before observing
    its effect. A dispatch is recorded only after `thread.started` is
    parsed, a Linear mutation only after its read-back per Linear Write
    Verification — never on intent.
  - Corrections are new lines that reference the corrected entry; editing
    or rewriting existing lines is forbidden.
  - Any orchestrator idle or stall longer than 5 minutes — waiting on
    quota, on the user, or on its own scheduling — is a mandatory ledger
    entry with the cause. These entries feed «Простои и отклонения:» in
    status updates and the final wave report.
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
- Logs: `logs/<ISSUE-KEY>-<stage>-a<attempt>.jsonl` per spawn attempt,
  numbered from the first attempt (`-a1`) — the worker's JSONL event stream;
  the timestamp of the last event is the liveness heartbeat.
- No secrets in any of them. No routine polling entries in the ledger.

## Linear Write Verification

Verify-after-write, mandatory for every Linear mutation the orchestrator
applies: after the write, read back the mutated entity and confirm the
change actually applied — a success response alone is not confirmation.
Wave-1 precedent: `save_project` returned success while the project status
stayed unchanged (silent success-no-op). On a failed read-back, retry the
mutation once; if the read-back still shows the old state, record a ledger
failure entry naming both attempts and treat the mutation as pending —
never report it as applied.

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

## Heartbeat

The Monitoring Protocol defines when to intervene; the heartbeat is the
external pulse that notices dying workers without spending orchestrator
turns. `scripts/watch-workers.mjs` (this repo) is a zero-dependency,
read-only watcher over the orchestrator root: it reads `logs/`, `reports/`,
and `workers.json`, writes nothing, and emits one stable line per liveness
event to stdout —
`<ISO time> EVENT:<stall|dead|spawn-fail> <ISSUE-KEY> <detail>`.
The watcher observes the active registry (`workers.json`), not the
directory's history; retired Issues' logs are outside its scope.

- At wave start — before the first worker spawn — the orchestrator must
  start the watcher against the mailbox root:
  `node scripts/watch-workers.mjs --root ~/.linear-agent-workflow/orchestrator/<product>`.
  Run it through the runtime's monitor primitive (Claude Code: the Monitor
  tool with `persistent: true`); a runtime without one falls back to a
  background process plus a periodic wakeup that reads its stdout. Record
  the degraded binding in the ledger.
- Watcher events are Monitoring Protocol triggers: treat `stall`, `dead`,
  and `spawn-fail` lines exactly like a worker-reported blocker — read the
  worker's latest state first, then act. `spawn-fail` feeds the spawn
  verification kill+retry rule in Worker Transports.
- The stall threshold is at least 90 seconds (default 120); lower values
  misread normal turn gaps as stalls, and the watcher refuses them.
- Healing ladder, in order: nudge (resume the thread demanding a report) →
  respawn (rebuild stage state per the Monitoring Protocol) →
  session rotation (fresh thread and fresh attempt-numbered log). Alert the
  owner only when the ladder is exhausted (owner decision Q3); never page
  on the first stall.
- Every healing step and its result are mandatory ledger entries — a
  watcher event that triggered intervention is never routine polling.

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

Brief integrity — five rules bind every brief and UX checkpoint; the
user-facing shapes live in `templates/orchestrator-brief.md`
(«Целостность брифа»):

- Question IDs mirror board section IDs exactly. Multiple questions
  inside one section get section-scoped suffixes (1a, 1b).
  Cross-section renumbering is forbidden.
- Every option carries a self-identifying token rendered on both the
  board and the brief (e.g. «1a-КАРТОЧКА / 1a-МОДАЛКА»); an answer is
  valid without its number when the token or the verbatim option text
  identifies it.
- Echo-back: before acting on answers, the orchestrator posts a mapping
  table «вопрос → выбранный вариант (дословно)»; an answer whose text
  does not match the addressed question's option set is a numbering fault
  and requires a mandatory one-line re-confirm before any work on that
  item.
- An item routed to a checkpoint as contested is never closed by silence:
  no answer means asked again, not resolved. A fallback line never
  resolves a contested item.
- Any spec change after a package approval that alters user-visible
  behavior appears as an explicit «Изменилось после твоего одобрения:»
  delta list at the next owner touch, never only as a fait-accompli
  status line. When in doubt whether a change is user-visible, include
  it in the delta.

## Context Budget

Orchestrator session context usage is a first-class operational metric,
not an implementation detail. Wave-1 precedent: the session peaked at 92%
of a 1M-token window with no signal to the owner.

- Report current usage as «Контекст: ~N%» in every status update; a rough
  estimate is fine — the trend matters more than precision.
- At ≥70% usage, plan a clean handoff to a fresh orchestrator session via
  the Resume procedure at the next safe boundary — after the current
  monitoring pass or stage advance completes, never mid-dispatch.
- At ≥85% usage, the handoff becomes the immediate priority: finish only
  the atomic action in flight, bring the ledger up to date, and hand off.

## Cost Telemetry

Per-feature cost is a first-class operational metric, same as context
usage. Wave-1 precedent: a full production wave ran with zero cost
visibility — one Issue consumed 49M input tokens (97% cached), one PR
accumulated 59 review submissions, and none of it appeared in any report.
Model-tiering policy has no data without this telemetry.

Per-Issue collection, performed by the orchestrator:

- Worker tokens: read the LAST `turn.completed` event of each attempt log
  of the stage (`logs/<ISSUE-KEY>-<stage>-a<attempt>.jsonl`); each is
  cumulative for its own thread — record input, cached, and output as
  reported there, and sum ACROSS attempts (a respawn or rotation starts a
  fresh thread whose spend must not vanish). Never sum events within one
  log.
- Review cycles: the count of review submissions handled during the ship
  stage, taken from the ship-stage report and PR review history.
- Stage wall-clock: derived from the ledger's write-time entries for stage
  dispatch and stage close; honest write-time discipline (see Mailbox And
  Ledger) is what makes this derivable. For `recorded-late` entries, use
  the marker's estimated event time, not the late write-time.

Record the collected numbers per stage in the ledger at stage close; a
  missing number is recorded with the reason it could not be collected, on
the same stage-close entry or an adjacent line. Judgment note, stated
honestly: collection is manual agent work — reading logs, counting review
submissions, subtracting timestamps — not a pin-enforceable mechanism;
pins can anchor this policy text, not the collection itself.

Cost is telemetry, not a gate: no thresholds, no blocking, visibility
only. Never pause, steer, or fail a worker because of cost numbers, and
never let cost collection delay a stage advance; a missing number is
recorded as unavailable, never blocks, and never pages the user. Cost
data feeds status updates and the final wave report per
`templates/orchestrator-brief.md` («цена: …» per Issue, «Цена волны» for
the wave) — async-visible records for the owner, nothing more.

## Resume

A fresh orchestrator session rebuilds state without loss:

1. Read the project config; locate the mailbox root.
2. Scan Linear: projects in flight, Issue statuses, latest comments and
   certificates.
3. Read `ledger.md` and all mailbox reports; apply queued Linear mutations
   that were never applied.
4. Corroborate key ledger claims — dispatches, stage advances, deploys —
   against worker log and report timestamps. A ledger line with no
   supporting evidence is marked unverified and its state is re-derived
   from Linear plus logs instead of being trusted. This is a judgment rule
   for the resuming session, not a pin-enforceable check: it defines how
   much to trust the ledger, not a mechanical validation.
5. Read `workers.json` and list live worker sessions when the runtime allows
   it; rebind to surviving `codex-cli` workers by thread id
   (`codex exec resume`) instead of respawning them.
6. Output the rebuilt status table before taking any new action.

Forced mid-wave resume drill — a planned one-time operational act,
not a recurring gate: during the next wave the orchestrator deliberately
performs a clean handoff to a fresh session mid-wave, at a safe boundary
per Context Budget (after the current monitoring pass or stage advance
completes, never mid-dispatch), runs this Resume procedure for real, and
records every reconstruction discrepancy in the ledger — unverified
ledger claims, lost thread bindings, unapplied Linear mutations, report
gaps; "no discrepancies" is a valid result only after actively looking.
The drill result feeds the PRD wave-1 success criteria. Before scheduling the drill, check the ledger and PRD for a completed-drill record and skip if one exists — it is one-time, not per-wave. Rationale: the
wave-1 orchestrator session peaked at 92% of a 1M context window and a
forced mid-wave resume has never been tested.
