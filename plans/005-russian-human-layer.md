# Plan 005: Add a Russian human layer above every machine block posted to Linear

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 889742b..HEAD -- skills/mono-preflight/SKILL.md skills/mono-ship/SKILL.md skills/mono-deploy/SKILL.md skills/mono-idea/SKILL.md skills/mono-implement/SKILL.md references/artifact-quality.md references/human-friendly-output.md scripts/validate-workflow.mjs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (coordinate with plan 003 if it also edits implement/deploy — different sections, merge carefully)
- **Category**: dx / human-ux
- **Planned at**: commit `889742b`, 2026-06-11

## Why this matters

The operator is a Russian-speaking product person. Their Linear Issue thread
today interleaves Russian human comments with all-English machine blocks: the
preflight certificate, the ship green certificate, and the deploy closeout
are posted verbatim as Linear comments ("Autoreview: clean; final command:
…; clean result: exit 0", "Ship: green", "Merged SHA: …"). The skills even
contradict themselves: each one requires "Keep Linear-facing comments in the
project config language; use Russian when no project config is present" while
simultaneously prescribing an English-only comment shape. The same English-only
problem affects mono-idea's mandated blocked message — the first skill a
user ever touches can dead-end in English jargon ("runtime/mode", "Linear
mutation"). This plan adds a 1–2 line Russian human lead above every machine
block, keeps the machine core byte-stable (next-stage skills recover
certificates from these comments by marker), and resolves the language-rule
contradiction explicitly.

## Current state

All excerpts verified at commit `889742b`.

- `skills/mono-preflight/SKILL.md:65` — the certificate is posted to Linear:
  `Record the full preflight certificate as a Linear comment or resource with the stable marker `mono-preflight certificate``.
  Lines 107-121 ("Human Linear comment/resource shape:") are byte-identical to
  the machine "Preflight certificate shape" at lines 77-89 — all-English
  key-value fields, no human language. Line 103 requires Russian comments.
  Line 105: `Do not summarize the certificate away in Linear.`
- `skills/mono-ship/SKILL.md:98-116` — "Green certificate shape": English
  block starting `mono-ship green certificate / Ship: green / …`. Recovery:
  `mono-deploy` reads it from Linear comments (skills/mono-deploy/SKILL.md:29).
- `skills/mono-deploy/SKILL.md:53-70` — "Deploy closeout shape": English
  ledger (`Deploy: <deployed|…> / Merged SHA: … / Learnings recorded: …`).
  Line 87 requires Russian Linear comments. The closeout is terminal — no
  downstream skill parses it.
- `skills/mono-idea/SKILL.md:89-96` — mandated verbatim English blocked
  message ("BLOCKED / INCOMPLETE - mono-idea cannot complete because… Exit
  Plan Mode or rerun mono-idea in execution/default mode…"). The repo's own
  blocked-shape contract (references/human-friendly-output.md:90-114) is
  Russian ("Работа не завершена. / Уже durable: / Следующий unblock:").
  `mono-check` greps for the literal marker `BLOCKED / INCOMPLETE`
  (skills/mono-check/SKILL.md:63), so that token must survive.
- `skills/mono-implement/SKILL.md:100-111` — the Russian implementation-start
  comment contains a self-defense line aimed at auditors, not the reader:
  `Источник правды: Linear package, не raw discovery chat и не local scratch docs.`
- `references/artifact-quality.md` — its Preflight Certificate and ship
  sections require the comment to START with the stable marker; this must be
  amended to permit the Russian lead above the marker.
- `references/human-friendly-output.md:5` claims to cover "Linear comments",
  and line 15 forbids starting with internal verdict labels — currently
  contradicted by the certificate-comment shapes.
- Validator pins (verified in `scripts/validate-workflow.mjs`): the preflight
  certificate field strings are pinned verbatim at lines 539-570 (e.g. the
  `Autoreview: <clean|…>; final command: …` line at 551); certificate
  recovery sentences at 507-516; `Requires `mono-ship green certificate``
  at 528. **Pinned strings must remain in the files — additions are safe,
  rewordings are not.**

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Full validation | `node scripts/validate-workflow.mjs` | exit 0, `…validation passed (12 skills checked).` |
| Artifact smoke | `node scripts/lint-mono-artifacts.mjs` | exit 0 |
| One-command verify (if plan 001 landed) | `node scripts/verify.mjs` | exit 0 |

## Scope

**In scope**:
- `skills/mono-preflight/SKILL.md`, `skills/mono-ship/SKILL.md`,
  `skills/mono-deploy/SKILL.md`, `skills/mono-idea/SKILL.md`,
  `skills/mono-implement/SKILL.md`
- `references/artifact-quality.md` (marker-start sentences only)
- `references/human-friendly-output.md` (one new subsection)
- `scripts/validate-workflow.mjs` (add pins for the new contract; never delete existing pins)
- `plans/README.md` (status row)

**Out of scope**:
- Output templates (`templates/*-output.md`) — plan 006 owns them.
- Certificate field names, marker lines, status tokens — byte-stable, never translated.
- `templates/issue.md`, `templates/prd.md`, `templates/tech-spec.md` — plan 009.

## Git workflow

- Branch: current worktree branch, or `advisor/005-russian-human-layer`.
- Commit style: `feat: add Russian human layer to Linear machine comments`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Define the dual-layer comment convention in the UX contract

In `references/human-friendly-output.md`, add a subsection
`## Machine Blocks In Linear Comments` stating:

- Certificates and closeouts posted to Linear are dual-audience: the next
  workflow stage recovers them by their stable English marker and field keys.
- Every such comment MUST open with 1-2 Russian sentences (project config
  language when set) stating the human outcome and the next step — e.g.
  `Ветка готова к PR: автоматическое ревью чистое, локальные проверки прошли. Дальше — mono-ship.` —
  followed by the unchanged machine block.
- The marker line, field names, and status tokens inside the machine block
  must never be translated, reworded, or summarized away.
- Exception note: the Russian-comments rule in each skill applies to the human
  lead; the machine core is exempt by design.

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 2: Apply the convention in preflight, ship, deploy

a. `skills/mono-preflight/SKILL.md`: in the "Human Linear comment/resource
   shape" block (lines 107-121), add two lines at the top of the block —
   `<1-2 предложения по-русски: итог и следующий шаг>` then a blank line —
   keeping everything from the marker line down byte-identical. Add a rule
   bullet: the Russian lead is required; the machine core below the marker is
   never translated.
b. `skills/mono-ship/SKILL.md`: same treatment for the "Green certificate
   shape" when recorded as a Linear comment (add the human-lead lines above
   `mono-ship green certificate` in the comment context; the in-chat shape
   is plan 006's concern).
c. `skills/mono-deploy/SKILL.md`: same for "Deploy closeout shape", plus
   require the FIRST Russian line to state the shipped product outcome (e.g.
   `Выкатили: <что получили пользователи>; проверено на <среда>.`) — the
   closeout is terminal and parsed by nothing, so the human layer leads.
d. `references/artifact-quality.md`: amend the "starts with the stable marker"
   sentences to "contains the stable marker line, preceded only by the short
   Russian human lead".

**Verify**: `node scripts/validate-workflow.mjs` → exit 0 (all pinned
certificate strings still present — your edits are additive).

### Step 3: Russify the mono-idea blocked message

In `skills/mono-idea/SKILL.md:89-96`, keep the first line exactly
`BLOCKED / INCOMPLETE - mono-idea cannot complete because creating/updating a Linear Project in Idea is mandatory, and this runtime/mode did not allow the Linear mutation.`
(mono-check greps the marker), and replace the remaining lines with the
contract's Russian blocked-shape: what is durable, the exact unblock step in
operator terms (`Выйди из Plan Mode (или перезапусти /mono-idea в обычном режиме) — я создам Project в статусе Idea.`),
and the no-artifacts boundary said once in Russian.

**Verify**: `grep -n "BLOCKED / INCOMPLETE - mono-idea" skills/mono-idea/SKILL.md` → 1 hit (marker intact).
**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 4: Trim auditor-speak from the implementation-start comment

In `skills/mono-implement/SKILL.md:100-111`, replace the line
`Источник правды: Linear package, не raw discovery chat и не local scratch docs.`
with a plain scope statement (e.g. `Делаю строго по утверждённому Issue; ничего сверх scope не добавляю.`).
Keep all other lines. Do not remove `Workflow реализации:` (harmless, one
line) — only the self-defense line goes.

**Verify**: `grep -c "Источник правды" skills/mono-implement/SKILL.md` → 0.
**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 5: Pin the new contract in the validator

In `scripts/validate-workflow.mjs` `validateAntiPatterns`, add required
substrings: for preflight — the Russian-lead placeholder line you added in
Step 2a; for deploy — the product-outcome lead requirement sentence; for
idea — the Russian unblock line from Step 3. Add to the docs check
(`validateDocsAndExamples`) the new human-friendly-output.md subsection title
`Machine Blocks In Linear Comments`.

**Verify**: `node --check scripts/validate-workflow.mjs` → exit 0.
**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 6: Full suite

**Verify**: `node scripts/lint-mono-artifacts.mjs` → exit 0 and
`node scripts/validate-workflow.mjs` → exit 0.

## Test plan

The validator pins added in Step 5 are the regression tests (repo convention).
Negative check: temporarily remove the Russian lead line from the preflight
comment shape, confirm validation fails naming that pin, restore, confirm
green.

## Done criteria

- [ ] Preflight, green-certificate, and deploy-closeout Linear comment shapes each open with a Russian human-lead placeholder above an unchanged machine block
- [ ] `grep -n "Machine Blocks In Linear Comments" references/human-friendly-output.md` → 1 hit
- [ ] mono-idea blocked message: English marker line + Russian body
- [ ] `grep -c "Источник правды" skills/mono-implement/SKILL.md` → 0
- [ ] `node scripts/validate-workflow.mjs` exits 0; `node scripts/lint-mono-artifacts.mjs` exits 0
- [ ] `git status --porcelain` shows changes only in the in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

- Any existing validator pin fails after your edit — restore the pinned string
  verbatim; if you cannot keep both the pin and the new layout, stop and report.
- You find a downstream skill that parses certificate comments positionally
  (expects the marker on line 1 and cannot tolerate a lead) — the audit found
  recovery is marker-based, but if reality differs, stop.
- You are tempted to translate any machine field name or status token.

## Maintenance notes

- Any future certificate (new stage) must follow the dual-layer convention —
  it now lives in human-friendly-output.md, the single place to check.
- Reviewer should scrutinize: byte-stability of the machine cores (diff should
  show only added lines inside the comment-shape blocks).
- Deferred: translating the in-chat ship/check templates — plan 006.
