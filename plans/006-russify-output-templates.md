# Plan 006: Russify the output templates and trim chat telemetry

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 889742b..HEAD -- templates/check-output.md templates/ship-output.md templates/deploy-output.md templates/review-output.md references/human-friendly-output.md skills/mono-ship/SKILL.md skills/mono-check/SKILL.md scripts/validate-workflow.mjs`
> On any mismatch with the "Current state" excerpts, treat as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: 005 (soft — both edit `references/human-friendly-output.md`; land 005 first to avoid conflicts)
- **Category**: dx / human-ux
- **Planned at**: commit `889742b`, 2026-06-11

## Why this matters

The chat blocks the operator reads after each stage mix three label registers
in one screen: English status keywords (`PASS - Linear handoff ready`),
English section labels (`Meaning:`, `Notes:`, `Review status:`, `Next action:`),
and Russian section labels (`Проверено:`, `Что дальше:`). The most frequently
rendered block (check output — mono-check fires after almost every stage)
carries its one human-facing line in English engineer-speak ("not
deterministic proof"). The review report opens with a raw verdict token and
files decisions the operator owes under «Решения:», which reads as "decisions
already made". The ship block buries the decision under ~20 lines of
telemetry and ends with a raw `Next: <mono-deploy | needs-human | blocked>`
— the exact thing the repo's glossary says to "never leave raw". AGENTS.md:11-12
states "Linear-facing templates and output examples are written in Russian";
these templates half-violate it. This plan makes Russian the language of every
human-facing label while keeping machine tokens (PASS/FAIL/BLOCKED, verdict
enums, certificate fields) byte-stable.

## Current state

All excerpts verified at commit `889742b`.

- `templates/check-output.md:5-12` (PASS shape):

  ```text
  PASS - Linear <mode> ready
  Meaning: inspected required state and found no blocking drift; this is not deterministic proof.

  Проверено:
  Не проверено:
  Notes:
  ```

  BLOCKED shape (lines 16-26) has English `Missing: / Drift: / Risk: / Next action:`
  mixed with Russian `Проверено:`. `skills/mono-check/SKILL.md:45` keeps
  PASS/FAIL/BLOCKED "in the status line for machine readability, but add a
  one-line human meaning immediately after it" — the meaning line itself may
  be Russian. **No validator pins exist on check-output.md** (verified).

- `templates/review-output.md:6-11`:

  ```text
  Ревью Linear: <ready|advisory-ready|needs-fixes|blocked>
  Коротко: <human meaning…>
  Режим: <handoff|pre-ship|artifact|issue|delivery>
  Риск: <tiny|standard|deep|risky>
  Ревью-гейт: <required|advisory>
  ```

  and line 29 `Решения:` — for findings that need the OPERATOR's judgment;
  adjacent to `Предложенные исправления:` it misreads as "decisions made".
  Validator pins on this template (validate-workflow.mjs:204-211):
  `Ревью Linear: <ready|advisory-ready|needs-fixes|blocked>`,
  `Блокирующие замечания:`, `Предложенные исправления:`, `Решения:`,
  `К сведению:`, and the PASS/FAIL prohibition sentence. **`Решения:` is
  pinned — renaming it requires updating the pin in the same change.**
  Lines 9-11 (Режим/Риск/Ревью-гейт) are NOT pinned.

- `templates/ship-output.md` — default user-facing block (lines 5-43): outcome
  sentence first (good), then `Latest head SHA`, an 8-bullet `Review status:`
  block naming Greptile and merge state, `CI status:`, a `Green certificate:`
  block whose line 28 is `- Next: <mono-deploy | needs-human | blocked>.`,
  then Russian `Проверено/Не проверено/Что дальше`. Lines 45-64 already define
  an "Optional internal summary for logs or Linear comments". Line 75 mandates
  an English say-string: `For `green`, say "PR is ready for `mono-deploy`; it has not been merged or deployed by `mono-ship`."`.
  Validator pins on this template (validate-workflow.mjs:212-215 and 572-579):
  `Preflight: <ready/blocked/drift-candidate/needs-human/not run>`,
  `Bug/perf proof: …`, `mono-ship green certificate`, `Documentation workflow`,
  `Next: <mono-deploy | needs-human | blocked>` — pins are whole-file
  substring checks, so MOVING a pinned line into the internal-summary section
  of the same file keeps validation green.
- `templates/deploy-output.md:62-64` — English say-strings ("PR changed after
  review; run `mono-ship` again before deploy.").
- `references/human-friendly-output.md:17-37` — the status glossary translates
  verdicts into ENGLISH meanings; it has no entries for risk tiers
  (tiny/standard/deep/risky), gate kinds (required/advisory), or tooling
  vocabulary (Greptile, head SHA, merge state, CI checks, exit codes).
- `skills/mono-ship/SKILL.md:61-83` — "Required review status shape when a
  PR exists" duplicates the template's English-labeled block; lines 52, 48-51
  contain English say-strings.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Full validation | `node scripts/validate-workflow.mjs` | exit 0 |
| Artifact smoke | `node scripts/lint-mono-artifacts.mjs` | exit 0 |

## Scope

**In scope**:
- `templates/check-output.md`, `templates/ship-output.md`,
  `templates/deploy-output.md`, `templates/review-output.md`
- `references/human-friendly-output.md` (glossary extensions)
- `skills/mono-ship/SKILL.md` (review-status shape + say-strings),
  `skills/mono-check/SKILL.md` (only if it restates English labels)
- `scripts/validate-workflow.mjs` (update/add pins in tandem)
- `plans/README.md` (status row)

**Out of scope**:
- Certificate shapes posted to Linear (plan 005 owns those).
- `templates/prd.md`, `templates/tech-spec.md`, `templates/issue.md` (plan 009).
- Status tokens themselves: `PASS`, `FAIL`, `BLOCKED`, `green`, `ready`,
  `needs-human`, verdict enums — never translated, they are parse anchors.

## Git workflow

- Branch: current worktree branch, or `advisor/006-russify-output-templates`.
- Commit style: `feat: russify output templates and trim chat telemetry`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extend the glossary in human-friendly-output.md

Add two subsections:

a. `## Risk And Gate Glossary` — Russian renderings the agent must use in
   user-facing lines: `tiny` → «крошечный: правка в одну строку, ритуалы по
   минимуму», `standard` → «обычный», `deep` → «глубокий: затрагивает много
   поверхностей», `risky` → «рискованный: деньги/данные/прод»; `required` →
   «обязательное ревью», `advisory` → «совещательное: можно идти дальше,
   замечания на усмотрение».
b. `## Tooling Glossary` — `Greptile` → «внешний авто-ревьюер PR», `head SHA`
   → «точная версия кода, которую проверяли», `merge state` → «можно ли влить
   без конфликтов», `CI` → «автоматические проверки на сервере». Add the rule:
   helper command paths and exit codes belong only inside Linear machine
   blocks, never in chat finals.

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 2: check-output.md — full Russian human layer

Keep `PASS - Linear <mode> ready` / `BLOCKED - …` / `FAIL - …` first lines
verbatim (parse anchors; mono-check SKILL.md:45 mandates them). Replace the
English labels with Russian across all three shapes:
`Meaning:` → `Смысл: <по-русски, например: посмотрел нужные артефакты, блокеров не нашёл; ручную проверку это не заменяет>`,
`Notes:` → `Заметки:`, `Missing:` → `Чего не хватает:`, `Drift:` → `Расхождения:`,
`Risk:` → `Риск:`, `Next action:` → `Следующий unblock:` (matches the
contract's blocked-shape — one smallest action, NOT an options menu),
`Contract violation:` → `Нарушение контракта:`, `Evidence:` → `Доказательство:`,
`Required recovery:` → `Как починить:`.

**Verify**: `node scripts/validate-workflow.mjs` → exit 0 (no pins on this file).
**Verify**: `grep -cE "Meaning:|Notes:|Next action:" templates/check-output.md` → 0.

### Step 3: review-output.md — outcome first, decisions unambiguous

a. Swap lines 6-7: `Коротко: <…>` becomes line 1, `Ревью Linear: <ready|…>`
   line 2 (the pin is a substring check, order-independent).
b. Lines 9-11: render values translated with the canonical token in
   parentheses: `Риск: <крошечный (tiny)|обычный (standard)|глубокий (deep)|рискованный (risky)>`,
   `Ревью-гейт: <обязательное (required)|совещательное (advisory)>`,
   `Режим: <handoff|pre-ship|artifact|issue|delivery>` (mode can stay — it
   names workflow stages).
c. Rename `Решения:` → `Нужно твоё решение:` and require each item to state
   the question plus a recommendation. **Update the validator pin in the same
   change**: in `scripts/validate-workflow.mjs:204-211` replace the pinned
   string `"Решения:"` with `"Нужно твоё решение:"`.

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 4: ship-output.md — move telemetry to the internal summary, translate Next

a. Move from the default user-facing block into the "Optional internal
   summary": `Latest head SHA` line, the `Fixes applied`/`Merge state` bullets,
   and the `Green certificate:` bookkeeping pair — KEEPING the pinned strings
   (`mono-ship green certificate`, `Next: <mono-deploy | needs-human | blocked>`,
   `Preflight: <ready/…>`, `Documentation workflow`) present in the file
   (inside the internal summary is fine — pins are whole-file).
b. In the user block, replace the 8-bullet `Review status:` with a Russian
   `Статус ревью:` of 3-4 lines in plain language (who/what reviewed, found,
   fixed, unresolved count), `CI status:` → `Проверки CI:` one line, and close
   with `Проверено/Не проверено/Что дальше` as today. The user block must end
   with a translated next step (`Дальше: mono-deploy — рекомендую…`), never
   the raw enum.
c. Translate the say-strings at lines 73-79 into Russian equivalents (keep
   verdict tokens in backticks inside them).
d. Mirror the same trim in `skills/mono-ship/SKILL.md:61-83` (the inline
   "Required review status shape") and its say-strings at lines 46-52, keeping
   every validator-pinned sentence intact (check pins at
   validate-workflow.mjs:503-524 before editing; `Poll interval: 10 minutes`
   etc. live in ship-feedback-loop.md and are satisfied by either file).

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.
**Verify**: in the default user-facing block of `templates/ship-output.md`
(lines between "Default user-facing response:" and "Optional internal
summary"), `grep` finds no `head SHA`, no `Greptile`, no raw `Next: <mono-deploy`.

### Step 5: deploy-output.md — translate say-strings

Replace the English verdict-to-human say-strings (lines 59-64) with Russian
(e.g. for stale certificate: «PR изменился после ревью; прогони `mono-ship`
ещё раз перед деплоем.»). Keep all pinned strings
(`Ship certificate: <found/missing/stale>`, `Deploy workflow`,
`Learnings recorded`, `stale certificates` — pins at validate-workflow.mjs:216-221
and 581-584) present; the `stale certificates` pin may live in the Rules/Notes
line — confirm with grep after editing.

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.

### Step 6: Humanize the handoff intake summary (maintainer-approved decision)

The handoff chat final currently must include six snake_case intake fields.
The maintainer decided: the chat layer becomes one human sentence; the
structured record moves to Linear. Three files in tandem:

a. `skills/mono-handoff/SKILL.md` — replace the final-response bullet
   `- Artifact intake summary with `read`, `unavailable`, `stale_or_ignored`, `conflicts`, `decisions_carried_forward`, and `confidence_boundary`.`
   with
   `- Artifact intake, one Russian sentence: what fed the package, what was unavailable or conflicting, where confidence is low (e.g. «Читал: discovery-план и PRD; не нашёл: заметки office-hours; конфликтов нет»). The structured intake record (`read`, `unavailable`, `stale_or_ignored`, `conflicts`, `decisions_carried_forward`, `confidence_boundary`) is recorded in the package-approval Linear comment, not the chat final.`
   Keep the six backticked field names present in the skill (the validator
   pins each one) — the replacement sentence above retains them.
b. `references/artifact-intake.md` "Output Shape" — state that the structured
   block lands in the package-approval Linear comment / package notes, and the
   chat final carries the one-sentence Russian rendering.
c. `scripts/validate-workflow.mjs` — update the pinned sentence
   `"Artifact intake summary with `read`, `unavailable`, `stale_or_ignored`, `conflicts`, `decisions_carried_forward`, and `confidence_boundary`"`
   to match the new bullet's stable prefix (e.g. pin
   `"The structured intake record"` plus the per-field pins that already
   exist). Update the failure message accordingly.

**Verify**: `node scripts/validate-workflow.mjs` → exit 0.
**Verify**: `grep -c "decisions_carried_forward" skills/mono-handoff/SKILL.md` ≥ 1 (field names preserved for the Linear-comment requirement).

### Step 7: Full suite + language sweep

**Verify**: `node scripts/lint-mono-artifacts.mjs` → exit 0.
**Verify**: `node scripts/validate-workflow.mjs` → exit 0.
**Verify** (manual scan): each template's DEFAULT user-facing shape contains
no English section labels other than status tokens and pinned machine fields.

## Test plan

Validator pins updated/added in Steps 3-4 are the regression layer. Negative
check: revert the `Нужно твоё решение:` pin update only (leave the template
renamed), confirm `node scripts/validate-workflow.mjs` fails on the old
`Решения:` pin, then re-apply.

## Done criteria

- [ ] check-output.md: zero English section labels; PASS/FAIL/BLOCKED lines intact
- [ ] review-output.md: `Коротко:` first; `Нужно твоё решение:` present; tiers/gates translated with canonical tokens in parens
- [ ] ship-output.md user block: no head SHA / Greptile / raw Next enum; pinned strings still present in file
- [ ] human-friendly-output.md has Risk And Gate Glossary + Tooling Glossary
- [ ] `node scripts/validate-workflow.mjs` exits 0; `node scripts/lint-mono-artifacts.mjs` exits 0
- [ ] `git status --porcelain` only in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

- A validator pin cannot be satisfied without keeping an English label in the
  user-facing block — stop and report which pin.
- You find a skill that PARSES any of the labels you are translating (e.g.
  greps chat output for `Review status:`) — the audit found none, but verify
  with `grep -rn "Review status:" skills/ references/ scripts/` before Step 4;
  hits outside ship-output/ship-skill are a STOP.
- The diff starts touching certificate shapes posted to Linear — that's plan 005.

## Maintenance notes

- New templates must follow: Russian labels, English status tokens, telemetry
  in the internal summary. The glossары in human-friendly-output.md are now
  the single source for translations — extend there first.
- Reviewer should scrutinize: that no pinned substring disappeared from any
  file (run the validator, but also eyeball the moved lines).
- Deferred: per-skill say-string sweep outside ship/deploy/check/review
  (idea/handoff are already Russian-exemplar quality).
