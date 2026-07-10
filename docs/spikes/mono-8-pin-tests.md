# MONO-8 Pin Negative Tests (`validateBriefIntegrity`)

Date: 2026-07-11. Goal: prove the new MONO-8 pins in
`scripts/validate-workflow.mjs` actually catch regressions — each pin
was broken temporarily (file copies via `cp` backup/restore, never
`git checkout --`), shown to fail naming the pin, then restored
(byte-identical restore confirmed with `cmp`, validator green after
every restore). MONO-1's `validateHeartbeatContract`, MONO-2's
`validateHonestLedgerContract`, MONO-3's `validateLiveQaGateContract`,
MONO-4's `validateRealBackendContractSampling`, MONO-5's
`validateGoalContractBinding`, MONO-6's `validateReviewLoopHygiene`,
and MONO-7's `validateCostTelemetry` pins run in the same validator
pass and stayed green throughout: every break run reported exactly one
failure line — the deliberately broken pin.

## Pins Under Test

`validateBriefIntegrity()` pins, all additive, over
`templates/orchestrator-brief.md` (the «Целостность брифа (Brief
Integrity)» section and its shapes) and `references/orchestration.md`
(the Decision Briefs brief-integrity prose):

- Board-aligned IDs / suffix rule: `mirror board section IDs exactly`,
  `section-scoped suffixes`, `(1a, 1b)`,
  `Cross-section renumbering is forbidden`.
- Self-identifying option tokens: `1a-КАРТОЧКА / 1a-МОДАЛКА`,
  `valid without its number`.
- Echo-back mapping: `вопрос → выбранный вариант (дословно)`,
  `numbering fault`, `one-line re-confirm`.
- No closure by silence: `never closed by silence`,
  `no answer means asked again, not resolved`.
- Post-approval delta: `Изменилось после твоего одобрения:`.
- Section heading (brief only):
  `## Целостность брифа (Brief Integrity)`.

The pins anchor the contract prose and the user-facing shapes on both
files. Decoding a specific owner answer against a specific board stays
judgment work — pins bind the rules, not the decoding. No existing pin
was weakened; every string pinned by MONO-2/5/7 on
`templates/orchestrator-brief.md` and by MONO-1/2/3/7 on
`references/orchestration.md` stayed byte-intact and green throughout.

## Protocol Runs

Process note: both files were backed up with `cp` before any break;
every break was applied with an in-place `perl` substitution and
reverted by `cp` from the backup — never `git checkout --` — per the
standing process rule. After each restore, `cmp` confirmed the file was
byte-identical to its backup and the validator ran green.

1. `section-scoped suffixes` → `renumbered sequentially` in
   `templates/orchestrator-brief.md` →
   `- templates/orchestrator-brief.md missing "section-scoped
   suffixes"` (exit 1). Restored → green.
2. `Cross-section renumbering is forbidden` → `Cross-section
   renumbering is allowed` in `references/orchestration.md` →
   `- references/orchestration.md missing "Cross-section renumbering is
   forbidden"` (exit 1). Restored → green.
3. `1a-КАРТОЧКА / 1a-МОДАЛКА` → `вариант A / вариант B` in
   `templates/orchestrator-brief.md` →
   `- templates/orchestrator-brief.md missing "1a-КАРТОЧКА /
   1a-МОДАЛКА"` (exit 1). Restored → green.
4. `вопрос → выбранный вариант (дословно)` → `вопрос → номер варианта`
   in `references/orchestration.md` →
   `- references/orchestration.md missing "вопрос → выбранный вариант
   (дословно)"` (exit 1). Restored → green.
5. Same replacement in `templates/orchestrator-brief.md` (hits both the
   rule bullet and the echo-back shape header) →
   `- templates/orchestrator-brief.md missing "вопрос → выбранный
   вариант (дословно)"` (exit 1). Restored → green.
6. `never closed by silence` → `auto-closed after a timeout` in
   `templates/orchestrator-brief.md` →
   `- templates/orchestrator-brief.md missing "never closed by
   silence"` (exit 1). Restored → green.
7. Same replacement in `references/orchestration.md` →
   `- references/orchestration.md missing "never closed by silence"`
   (exit 1). Restored → green.
8. `Изменилось после твоего одобрения:` → `Обновления по спеке:` in
   `templates/orchestrator-brief.md` (hits both the rule bullet and the
   delta shape) →
   `- templates/orchestrator-brief.md missing "Изменилось после твоего
   одобрения:"` (exit 1). Restored → green.
9. Same replacement in `references/orchestration.md` →
   `- references/orchestration.md missing "Изменилось после твоего
   одобрения:"` (exit 1). Restored → green.

Tooling note: break attempts through `perl -CSD` silently failed to
apply for the Cyrillic pins (pattern bytes vs decoded file chars); the
run harness detects a no-op break with `cmp` and aborts instead of
reporting a false pass. The Cyrillic runs above were re-executed with
byte-level `perl` substitution and applied for real.

Every break run reported exactly one failure line. After the final
restore: `node scripts/verify.mjs` green (9 checks), including
`node scripts/validate-workflow.mjs` with `validateHeartbeatContract`
(MONO-1), `validateHonestLedgerContract` (MONO-2),
`validateLiveQaGateContract` (MONO-3),
`validateRealBackendContractSampling` (MONO-4),
`validateGoalContractBinding` (MONO-5),
`validateReviewLoopHygiene` (MONO-6), `validateCostTelemetry` (MONO-7),
and `validateBriefIntegrity` (MONO-8) all passing.
