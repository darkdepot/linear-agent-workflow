# MONO-7 Pin Negative Tests (`validateCostTelemetry`)

Date: 2026-07-11. Goal: prove the new MONO-7 pins in
`scripts/validate-workflow.mjs` actually catch regressions — each pin was
broken temporarily (file copies via `cp` backup/restore, never
`git checkout --`), shown to fail naming the pin, then restored
(validator green after every restore). MONO-1's
`validateHeartbeatContract`, MONO-2's `validateHonestLedgerContract`,
MONO-3's `validateLiveQaGateContract`, MONO-4's
`validateRealBackendContractSampling`, MONO-5's
`validateGoalContractBinding`, and MONO-6's `validateReviewLoopHygiene`
pins run in the same validator pass and stayed green throughout: every
break run reported exactly one failure line — the deliberately broken
pin.

## Pins Under Test

`validateCostTelemetry()` pins, all additive:

- `references/orchestration.md`, the `## Cost Telemetry` section:
  the heading itself; the collection anchors
  (`` LAST `turn.completed` event ``, `cumulative for the thread`,
  `Review cycles`, `ship-stage report`, `Stage wall-clock`,
  `ledger at stage close`); the honest judgment note
  (`not a pin-enforceable mechanism`); and the telemetry-not-a-gate rule
  (`Cost is telemetry, not a gate: no thresholds, no blocking, visibility
  only.`, `Never pause, steer, or fail a worker because of cost numbers`,
  `never let cost collection delay a stage advance`).
- `templates/orchestrator-brief.md`, the status cost tail and the wave
  cost block (`цена: ~N тыс. out-токенов, M циклов ревью`, `«цена: н/д»`,
  `## Цена волны (Wave Cost Summary)`, `Цена волны:`,
  `never blocking, never a gate`,
  `` Cost Telemetry in `references/orchestration.md` ``).
- `skills/linear-orchestrate/SKILL.md`, the final-response cost item
  (`Cost telemetry: the per-Issue cost tail in the status table`,
  `«Цена волны» block`, `Cost is telemetry, not a gate: it never blocks,
  pauses, or pages.`).

These pins anchor the policy text only: cost collection itself is manual
agent work (reading JSONL logs, counting review submissions, subtracting
ledger timestamps) and is stated as not pin-enforceable in the policy.
Cost stays telemetry — the pins bind the no-thresholds/no-blocking rule
so a future edit cannot silently turn cost into a gate. No existing pin
was weakened; the MONO-2 status-update pins on
`skills/linear-orchestrate/SKILL.md` («Простои и отклонения:»,
«Контекст: ~N%») and every other pinned string stayed byte-intact and
green throughout.

## Protocol Runs

Process note: the work was committed first (`feat: per-feature cost
telemetry in ledger and reports (MONO-7)`), then each break was applied
to a working copy backed up with `cp` and restored with `cp` — never
`git checkout --` — per the standing process rule.

1. `## Cost Telemetry` replaced with `## Cost Notes` in
   `references/orchestration.md` →
   `- references/orchestration.md missing "## Cost Telemetry"` (exit 1).
   Restored → green.
2. `Cost is telemetry, not a gate: no thresholds, no blocking, visibility
   only.` replaced with `Cost is a soft gate: pause workers above
   threshold.` →
   `- references/orchestration.md missing "Cost is telemetry, not a gate:
   no thresholds, no blocking, visibility\nonly."` (exit 1).
   Restored → green.
3. `` LAST `turn.completed` event `` replaced with
   `` first `turn.completed` event `` →
   `- references/orchestration.md missing "LAST \`turn.completed\`
   event"` (exit 1). Restored → green.
4. `## Цена волны (Wave Cost Summary)` replaced with
   `## Итоги (Wave Summary)` in `templates/orchestrator-brief.md` →
   `- templates/orchestrator-brief.md missing "## Цена волны (Wave Cost
   Summary)"` (exit 1). Restored → green.
5. `«цена: н/д»` replaced with `«цена: примерно»` →
   `- templates/orchestrator-brief.md missing "«цена: н/д»"` (exit 1).
   Restored → green.
6. `Cost is telemetry, not a gate: it never blocks, pauses, or pages.`
   replaced with `Cost is a budget gate: block workers that exceed it.`
   in `skills/linear-orchestrate/SKILL.md` →
   `- skills/linear-orchestrate/SKILL.md missing "Cost is telemetry,\n
   not a gate: it never blocks, pauses, or pages."` (exit 1).
   Restored → green.

Every break run reported exactly one failure line. After the final
restore: `node scripts/verify.mjs` green (9 checks), including
`node scripts/validate-workflow.mjs` with `validateHeartbeatContract`
(MONO-1), `validateHonestLedgerContract` (MONO-2),
`validateLiveQaGateContract` (MONO-3),
`validateRealBackendContractSampling` (MONO-4),
`validateGoalContractBinding` (MONO-5),
`validateReviewLoopHygiene` (MONO-6), and
`validateCostTelemetry` (MONO-7) all passing.
