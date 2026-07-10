# MONO-2 Pin Negative Tests (`validateHonestLedgerContract`)

Date: 2026-07-11. Goal: prove the new MONO-2 pins in
`scripts/validate-workflow.mjs` actually catch regressions — each pin was
broken temporarily, shown to fail naming the pin, then restored (validator
green after every restore). MONO-1's `validateHeartbeatContract` pins run
in the same validator pass and stayed green throughout.

## Pins Under Test

`validateHonestLedgerContract()` pins, all additive:

- `references/orchestration.md`: ledger format rules (`One event per
  line`, `actual moment of writing`, `` `recorded-late` ``, `Corrections
  are new lines`, `longer than 5 minutes`), Linear Write Verification
  (`## Linear Write Verification`, `read back the mutated entity`,
  `a success response alone is not confirmation`, `silent success-no-op`),
  Resume corroboration (`marked unverified`), Context Budget
  (`## Context Budget`, `«Контекст: ~N%»`, `70%`, `85%`,
  `never mid-dispatch`).
- `templates/orchestrator-brief.md`: `Простои и отклонения:`,
  `Контекст: ~N%`, `not blocking notifications`.
- `skills/linear-orchestrate/SKILL.md`: `«Простои и отклонения:»`,
  `«Контекст: ~N%»`.

## Protocol Runs

1. `Простои и отклонения:` replaced with `Простои:` (all occurrences) in
   `templates/orchestrator-brief.md` →
   `- templates/orchestrator-brief.md missing Простои и отклонения:`
   (exit 1). Restored → green.
2. `` `recorded-late` `` replaced with `` `late-note` `` in
   `references/orchestration.md` →
   ``- references/orchestration.md missing "`recorded-late`"`` (exit 1).
   Restored → green.
3. `## Context Budget` heading edited to `## Context Watch` in
   `references/orchestration.md` →
   `- references/orchestration.md missing "## Context Budget"` (exit 1).
   Restored → green.

After the final restore: `node scripts/verify.mjs` green (9 checks),
including `node scripts/validate-workflow.mjs` with both
`validateHeartbeatContract` (MONO-1) and `validateHonestLedgerContract`
(MONO-2) passing.
