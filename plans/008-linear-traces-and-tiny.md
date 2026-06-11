# Plan 008: Leave human traces in Linear on every stop, and give tiny work a tiny output

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 889742b..HEAD -- skills/ references/readiness-gates.md references/human-friendly-output.md scripts/validate-workflow.mjs`
> On any mismatch with the "Current state" excerpts, treat as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: 005 (the dual-layer comment convention it defines is reused here)
- **Category**: human-ux
- **Planned at**: commit `889742b`, 2026-06-11

## Why this matters

Three journey-level gaps confirmed by the audit:

1. **Stops leave no Linear trace.** Only happy paths post comments: implement
   posts «Начал реализацию…» but its EXIT (blocked / needs-human /
   scope-drift) lands only in chat, which evaporates with the session. Ship
   records a certificate only when green. An operator returning in a week and
   opening only Linear cannot see that the workflow is waiting ON THEM — the
   states where the human is the blocker are precisely the invisible ones.
2. **Tiny work gets full ceremony.** The `tiny` risk class only relaxes the
   review gate and document size (PRD-lite/no-spec); the output pipeline is
   scope-invariant — a one-line rename still produces ~5 Linear comments and
   full-size chat blocks at every stage, teaching the operator to bypass the
   workflow for exactly the changes it should make effortless
   (readiness-gates.md:3 promises the opposite: "without turning every small
   change into ceremony").
3. **Boundary repetition fatigue.** The Проверено/Не проверено block repeats
   near-verbatim ~10 times per cycle across chat finals; by deploy time the
   operator has stopped reading it — exactly when "Не проверено: прод" must
   be seen. A delta rule fixes the fatigue without losing the calibration.

## Current state

All excerpts verified at commit `889742b`.

- `skills/linear-implement/SKILL.md:59` — `Record a human Linear comment that
  implementation started.` Lines 65-67 (`exit` state) record outcomes in the
  final response only; no Linear comment is required on exit. Exit statuses
  (lines 80-85): `implemented-needs-preflight`, `blocked`,
  `scope-drift-needs-handoff`, `needs-human`.
- `skills/linear-preflight/SKILL.md:88` — certificate `Next:` can be
  `needs-human`, but no field names the decision owed; non-ready certificates
  are posted (line 65) yet carry no «what I owe» line a human can read
  (plan 005 adds the Russian lead; this plan adds the decision field).
- `skills/linear-ship/SKILL.md:41` — a certificate is recorded only `when the
  review loop is green`. `references/ship-feedback-loop.md` requires posting
  "the exact question" on needs-human (line ~126) — ship already partially
  complies; implement/preflight/idea have no such rule.
- `skills/linear-idea/SKILL.md:57` — the `/office-hours` vs `/brainstorming`
  recommendation exists only in the chat final; the Idea Project gets no
  comment naming the chosen discovery route.
- `references/readiness-gates.md:3` — "without turning every small change into
  ceremony"; line 47 defines the `tiny` class. Grep confirms `tiny` relaxes
  only review/document gates, never output volume.
- `references/human-friendly-output.md:39-53` — mandates the Проверено/Не
  проверено boundary per stage final; no carry-forward/delta rule exists.
- Validator: certificate shapes pinned at `scripts/validate-workflow.mjs:539-570`
  (preflight) — **additive fields are safe, renames are not**. The tiny
  profile must be additive guidance, not a rewording of pinned shapes.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Full validation | `node scripts/validate-workflow.mjs` | exit 0 |
| Artifact smoke | `node scripts/lint-linear-artifacts.mjs` | exit 0 |

## Scope

**In scope**:
- `skills/linear-implement/SKILL.md`, `skills/linear-preflight/SKILL.md`,
  `skills/linear-ship/SKILL.md`, `skills/linear-deploy/SKILL.md`,
  `skills/linear-idea/SKILL.md`
- `references/readiness-gates.md` (tiny output profile),
  `references/human-friendly-output.md` (exit-comment shape + delta rule)
- `scripts/validate-workflow.mjs` (new pins)
- `plans/README.md` (status row)

**Out of scope**:
- Templates (plans 005/006 own them).
- Merging certificates or changing their field sets beyond ADDING the
  `Decision needed` field (see STOP conditions).
- A standing "Статус работы" dashboard comment — considered and deferred (see
  Maintenance notes).

## Git workflow

- Branch: current worktree branch, or `advisor/008-linear-traces-and-tiny`.
- Commit style: `feat: add Linear exit traces and tiny output profile`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Define the exit-comment rule in the UX contract

In `references/human-friendly-output.md`, add `## Linear Exit Comments`:
whenever a stage ends in a non-ready terminal status (blocked, needs-human,
scope-drift, timed-out), the skill must post a short Russian Linear comment
on the Issue (Project during Idea) in the blocked-shape spirit: one line of
what is durable, one line of where it stopped, one line «Нужно от тебя: <точное
решение или unblock>». Happy-path terminals keep their existing
comments/certificates; this rule covers the silent failure paths.

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 2: Apply the exit-comment rule per skill

a. `skills/linear-implement/SKILL.md`: in the `exit` state, require the
   Russian Linear exit comment for `blocked`, `needs-human`, and
   `scope-drift-needs-handoff` (for `implemented-needs-preflight` the next
   stage takes over — no extra comment).
b. `skills/linear-preflight/SKILL.md`: add an ADDITIVE certificate field
   `Decision needed: <none | точное решение по-русски>` to both certificate
   shape blocks (machine core stays English-keyed; the value is Russian), and
   require it to be non-`none` whenever the certificate is `needs-human`.
c. `skills/linear-ship/SKILL.md`: require the exit comment for
   `needs-human`/`blocked`/`timed-out` ship endings (ship-feedback-loop already
   posts the exact question for review feedback — reference that rule instead
   of duplicating it, and extend it to the other two statuses).
d. `skills/linear-idea/SKILL.md`: require the final Project comment to include
   the chosen discovery recommendation (`/office-hours` или `/brainstorming` +
   one-line reason), so the route survives the chat session.

**Verify**: `node scripts/validate-workflow.mjs` → exit 0 (the preflight
field addition is additive; pinned lines 539-570 untouched).

### Step 3: Tiny output profile

In `references/readiness-gates.md`, add `## Tiny Output Profile`: when risk
class is `tiny` — chat finals shrink to outcome sentence + link + Что дальше
(boundary only as delta, see Step 4); the implementation-start comment and
the preflight certificate may be combined into ONE Linear comment (certificate
marker preserved verbatim inside it); ship and deploy keep their certificates
(machine recovery) but drop all optional narrative around them. Reference the
profile from implement/preflight/ship/deploy skills with one line each:
`For `tiny` work, follow the Tiny Output Profile in references/readiness-gates.md.`

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 4: Boundary delta rule

In `references/human-friendly-output.md` "Checked / Not Checked" section, add:
in chat finals after the first stage, state the boundary as a DELTA when it
did not change («Граница не изменилась с preflight; добавилось: deploy
verification passed»); the full boundary always stays inside the durable
Linear certificates. The full form is still required whenever the boundary
materially changed or the stage is ship/deploy.

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 5: Pin and full suite

Add validator pins: implement — exit-comment requirement sentence;
preflight — `Decision needed:`; readiness-gates — `Tiny Output Profile`;
human-friendly-output — `Linear Exit Comments`.

**Verify**: `node --check scripts/validate-workflow.mjs` → exit 0.
**Verify**: `node scripts/validate-workflow.mjs` → exit 0.
**Verify**: `node scripts/lint-linear-artifacts.mjs` → exit 0.

## Test plan

Validator pins (Step 5). Negative check: remove the `Decision needed:` line
from one preflight shape block, confirm validation fails, restore.

## Done criteria

- [ ] `grep -n "Linear Exit Comments" references/human-friendly-output.md` → 1 hit
- [ ] implement/ship require Russian exit comments for non-ready terminals; idea persists the discovery route
- [ ] both preflight certificate blocks contain `Decision needed:`
- [ ] `grep -n "Tiny Output Profile" references/readiness-gates.md skills/linear-implement/SKILL.md skills/linear-preflight/SKILL.md skills/linear-ship/SKILL.md skills/linear-deploy/SKILL.md` → 5 hits
- [ ] `node scripts/validate-workflow.mjs` exits 0; `node scripts/lint-linear-artifacts.mjs` exits 0
- [ ] `git status --porcelain` only in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

- Adding `Decision needed:` to the certificate breaks any pinned string —
  it must be a NEW line, not a modification of an existing one; if the pins
  conflict, stop.
- The tiny profile's combined start+certificate comment would break
  linear-ship's marker-based certificate recovery — the marker line must
  remain intact inside the combined comment; if you cannot guarantee that,
  keep the comments separate and report.
- You start wanting to change exit STATUS tokens — out of scope.

## Maintenance notes

- Considered and deferred: a standing agent-maintained «Статус работы» comment
  on the Project refreshed at each transition (audit finding F7). The
  verifier downgraded it: Linear's native Project/Issue statuses plus the new
  exit comments cover most of the need, and a refreshed snapshot goes stale
  the moment a stage runs without updating it. Revisit if the operator still
  reports losing track after this plan lands.
- Reviewer should scrutinize: that exit comments are required only for
  terminal statuses, not intermediate states (comment spam would recreate the
  fatigue this plan fights).
- The delta rule depends on agents knowing the previous boundary — it is
  recoverable from the last certificate in Linear; the rule should say so.
