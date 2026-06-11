# Plan 009: Linear document papercuts — PRD overlap, calque headings, ID slugs, AFK gloss

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 889742b..HEAD -- templates/prd.md templates/tech-spec.md templates/issue.md skills/linear-prd/SKILL.md scripts/validate-workflow.mjs scripts/lint-linear-artifacts.mjs examples/`
> On any mismatch with the "Current state" excerpts, treat as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: human-ux / docs
- **Planned at**: commit `889742b`, 2026-06-11

## Why this matters

The Linear documents the operator reads and confirms have four verified
papercuts:

1. The PRD skeleton has THREE sections describing the same person (`## Акторы`,
   `## Целевой оператор`, `## Оператор и контекст`). Git history shows this is
   accretion, not design: v0.4.0 replaced «Целевой оператор» with «Оператор и
   контекст», then v0.7.0 re-added «Целевой оператор» plus «Акторы» without
   removing the old one. An agent rendering the default skeleton makes the
   operator read «кто пользователь» three times before reaching requirements.
2. Some headings are word-for-word English transplants («Намерение проверки
   поведения») rather than Russian a product person would write.
3. Coverage cross-references are bare IDs («Покрывает R1, R2», «Поддерживает
   R1-R7») — Linear renders no anchors, so the human verifying "ничего из
   моих требований не потерялось" must scroll between documents holding codes
   in memory. Most will skip the check.
4. «Готовность агента: AFK» is an untranslated acronym at the exact line that
   answers the operator's main question — "это ещё требует меня?".

## Current state

All excerpts verified at commit `889742b`.

- `templates/prd.md:8-39` — 16 default sections including `## Акторы` (10),
  `## Целевой оператор` (12), `## Оператор и контекст` (16),
  `## Намерение проверки поведения` (28). Line 44: "skip sections that add no
  value" — a weak counterweight to an explicit default list.
- `templates/prd.md:50` — acceptance-example format:
  `` `AE1. Покрывает R1, R2. Дано ..., когда ..., тогда ...` `` — the same
  sentence is duplicated in `skills/linear-prd/SKILL.md:34` (keep in sync).
- `templates/tech-spec.md:22,26` — `## Системное влияние`, `## Режимы отказа`.
- `templates/issue.md:53` — `` `Готовность агента` must say `AFK` or `HITL`. ``
- `examples/profile-workbench-regression.md:127` —
  `Поддерживает R1-R7 из PRD: Agent profile settings cleanup.` (the repo's own
  exemplar shows the bare-ID form).
- **Validator pins** (verified in `scripts/validate-workflow.mjs`):
  - PRD template pins at lines 169-179 include `## Акторы`,
    `## Текущий процесс`, `## Требования`, `## Примеры приемки`,
    `## Намерение проверки поведения`, etc. `## Целевой оператор` and
    `## Оператор и контекст` are NOT pinned.
  - Tech Spec pins at lines 180-188 include `## Системное влияние`,
    `## Режимы отказа`.
  - Issue pins at 189-202 include `# Готовность агента`.
  - **Renaming any pinned heading requires updating the pin in the same
    change.**
- **Lint pins** (`scripts/lint-linear-artifacts.mjs`): linear-prd must include
  `actor -> capability -> benefit` (line 64); the example file must include
  `Поддерживает R1, R2, R3.` (line 109) — touching the example means keeping
  that exact string or updating the lint in tandem; prefer not touching the
  example.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Full validation | `node scripts/validate-workflow.mjs` | exit 0 |
| Artifact smoke | `node scripts/lint-linear-artifacts.mjs` | exit 0 |

## Scope

**In scope**:
- `templates/prd.md`, `templates/tech-spec.md`, `templates/issue.md`
- `skills/linear-prd/SKILL.md` (the duplicated AE sentence + section list refs)
- `scripts/validate-workflow.mjs` (pin updates in tandem with renames)
- `plans/README.md` (status row)

**Out of scope**:
- `examples/*.md` — the lint pins exact sentences there; the examples remain
  valid (slugs are additive guidance, old examples are still conformant).
- Restructuring the Issue into human/agent tiers — audited and judged
  by-design (the Issue is the agent's execution contract; the operator's
  approval surface is the handoff package map).
- `templates/project.md` — already clean.

## Git workflow

- Branch: current worktree branch, or `advisor/009-linear-docs-papercuts`.
- Commit style: `feat: humanize PRD/spec/issue templates`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Merge the PRD operator sections

In `templates/prd.md`, remove `## Целевой оператор` and `## Оператор и
контекст` from the default skeleton, keeping `## Акторы` (it is
validator-pinned and anchors the A1/A2 ID system). Add a rule line: actor
entries carry the operator's context inline (`A1. <кто> — <контекст/боль>`);
multi-operator products list one line per actor. Net: 16 → 14 sections.

**Verify**: `node scripts/validate-workflow.mjs` → exit 0 (removed headings
were not pinned).
**Verify**: `grep -c "## Целевой оператор\|## Оператор и контекст" templates/prd.md` → 0.

### Step 2: Rename calque headings (with validator pins, in tandem)

Renames (template + the validator pin + any skill that references the heading
by name):

| Old (pinned) | New |
|---|---|
| `## Намерение проверки поведения` (prd.md:28; pin at validate-workflow.mjs:174) | `## Что должна доказать проверка` |
| `## Системное влияние` (tech-spec.md:22; pin ~:184) | `## Влияние на остальную систему` |
| `## Режимы отказа` (tech-spec.md:26; pin ~:185) | `## Что может сломаться и как защищаемся` |

Search for other references before renaming:
`grep -rn "Намерение проверки поведения\|Системное влияние\|Режимы отказа" skills/ references/ templates/ scripts/` —
update every hit in the same change (known: `templates/prd.md:51` rule text;
`skills/linear-prd/SKILL.md` and `references/artifact-quality.md` may
reference them; `scripts/lint-linear-artifacts.mjs` does NOT pin these).

**Verify**: `node scripts/validate-workflow.mjs` → exit 0 with updated pins.
**Verify**: the grep above returns hits only with the NEW names.

### Step 3: ID slugs for human-readable coverage

In `templates/prd.md`, change the AE rule (line 50) to require a short Russian
slug at definition and reference sites:
`` `AE1 (безопасное сохранение). Покрывает R1 (частичное сохранение), R2. Дано ..., когда ..., тогда ...` `` —
bare IDs stay the canonical machine key; the slug is additive. Update the
duplicated sentence in `skills/linear-prd/SKILL.md:34` identically. In
`templates/tech-spec.md:40` extend the rule: design choices reference
requirements as `R2 (частичное сохранение)` on first mention per section.
Keep `actor -> capability -> benefit` (lint-pinned) intact in linear-prd.

**Verify**: `node scripts/lint-linear-artifacts.mjs` → exit 0.
**Verify**: `node scripts/validate-workflow.mjs` → exit 0 — note the validator
pins the OLD AE sentence? Check: `grep -n "Дано" scripts/validate-workflow.mjs scripts/lint-linear-artifacts.mjs` —
at `889742b` the AE sentence is NOT pinned in either script (only the example
file's `AE1. Покрывает R1, R2, R3.` is lint-pinned, and the example is out of
scope). If a pin appears due to drift, update it in tandem.

### Step 4: AFK/HITL gloss in the Issue template

In `templates/issue.md:53`, extend the rule: the rendered value must carry a
Russian gloss — `AFK (агент справится без тебя)` /
`HITL (нужно твоё участие: <что именно>)` — keeping the bare tokens first
(linear-check parses the literals `AFK`/`HITL`).

**Verify**: `node scripts/validate-workflow.mjs` → exit 0 (pin `# Готовность агента` untouched; lint pins `` `AFK` ``/`` `HITL` `` in linear-issue/SKILL.md untouched).

### Step 5: Full suite

**Verify**: `node scripts/validate-workflow.mjs` → exit 0;
`node scripts/lint-linear-artifacts.mjs` → exit 0. If plan 001 landed:
`node scripts/verify.mjs` → exit 0.

## Test plan

Pin updates in Step 2 are themselves the regression tests. Negative check:
after Step 2, `grep -rn "## Системное влияние" templates/` → 0 hits; the
validator passes only because its pin was updated — verify by temporarily
reverting the pin and confirming failure, then restore.

## Done criteria

- [ ] PRD skeleton has 14 sections; one actor/operator section
- [ ] Three calque headings renamed everywhere, validator pins updated, no stale references (grep clean)
- [ ] AE/R slug rule present in prd template + linear-prd skill (identical sentences)
- [ ] Issue template requires the AFK/HITL Russian gloss with bare tokens intact
- [ ] `node scripts/validate-workflow.mjs` exits 0; `node scripts/lint-linear-artifacts.mjs` exits 0
- [ ] `git status --porcelain` only in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

- A heading you are renaming turns out to be pinned in
  `scripts/lint-linear-artifacts.mjs` (it should not be at `889742b`) — stop,
  the lint guards a known regression and must not be weakened casually.
- `examples/profile-workbench-regression.md` fails the lint after your changes
  — you touched an out-of-scope file; revert it.
- Existing Linear documents in real projects use the old headings and
  linear-check starts flagging them — linear-check judges "shape by semantics
  before exact heading spelling" (lint-pinned sentence), so renames are safe;
  if you find a check that does exact-match headings, stop and report.

## Maintenance notes

- The old headings may still exist in real Linear docs created before this
  change; linear-check's semantics-first rule tolerates them. New documents
  get the new headings.
- Reviewer should scrutinize: pin updates are complete (validator green is the
  proof) and the AE sentence is byte-identical in template and skill.
- Deferred: trimming the PRD default skeleton further (e.g. dropping
  `## Текущий процесс` for tiny scopes) — the PRD-lite rule already covers it.
