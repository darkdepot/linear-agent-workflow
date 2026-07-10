# MONO-5 Pin Negative Tests (`validateGoalContractBinding`)

Date: 2026-07-11. Goal: prove the new MONO-5 pins in
`scripts/validate-workflow.mjs` actually catch regressions — each pin was
broken temporarily, shown to fail naming the pin, then restored (validator
green after every restore). MONO-1's `validateHeartbeatContract`, MONO-2's
`validateHonestLedgerContract`, MONO-3's `validateLiveQaGateContract`, and
MONO-4's `validateRealBackendContractSampling` pins run in the same
validator pass and stayed green throughout: every break run reported
exactly one failure line — the deliberately broken pin.

## Pins Under Test

`validateGoalContractBinding()` pins, all additive:

- `templates/orchestrator-dispatch.md`: the Goal Contract phrases
  (`the durable end-state`, `lifted verbatim from`,
  `each runnable as written`, `what must not change or break`,
  `judge your own "done"`, `guidance, not a gate`).
- `templates/orchestrator-report.md`: the verification-items semantics
  (`pass | deferred | not-run`,
  `optional in shape but mandatory in coverage`,
  `enumerate every «Как проверить» item`,
  `require a reason in `` `evidence` ``, `silently missing`,
  ``replaces the report `status` set``).
- `skills/linear-implement/SKILL.md` and
  `skills/linear-preflight/SKILL.md`: the stage exit report rule
  (`enumerates every «Как проверить» item`, `pass | deferred | not-run`,
  `verification_items`,
  `cannot claim completion while an item is silently missing`,
  `only with a recorded reason`).

Structural pins (in `validateTemplateSections()`, the established
required-sections pattern): `## Goal Contract` added to the
`templates/orchestrator-dispatch.md` required list (between `## Assignment`
and `## Engine`), and `"verification_items"` added to the
`templates/orchestrator-report.md` required list. The report's `status`
field set is untouched — `verification_items` is a separate additive field,
and the pre-existing status pins (`needs-decision`, `needs-human`,
`drift-candidate`) stayed green throughout.

## Protocol Runs

1. `## Goal Contract` heading edited to `## Goal Kontract` in
   `templates/orchestrator-dispatch.md` →
   `- templates/orchestrator-dispatch.md missing ## Goal Contract`
   (exit 1, caught by `validateTemplateSections`). Restored → green.
2. `each runnable as written` replaced with `each described in prose` in
   `templates/orchestrator-dispatch.md` →
   `- templates/orchestrator-dispatch.md missing "each runnable as
   written"` (exit 1). Restored → green.
3. `verification_items` renamed to `verified_items` (all occurrences) in
   `templates/orchestrator-report.md` →
   `- templates/orchestrator-report.md missing "verification_items"`
   (exit 1, caught by `validateTemplateSections`). Restored → green.
4. `pass | deferred | not-run` replaced with `pass | skipped | not-run`
   (all occurrences) in `templates/orchestrator-report.md` →
   `- templates/orchestrator-report.md missing "pass | deferred |
   not-run"` (exit 1). Restored → green.
5. `cannot claim completion while an item is silently missing` replaced
   with `may claim completion even if an item is missing` in
   `skills/linear-implement/SKILL.md` →
   `- skills/linear-implement/SKILL.md missing "cannot claim completion
   while an item is silently missing"` (exit 1). Restored → green.
6. `enumerates every «Как проверить» item` replaced with
   `summarizes the «Как проверить» items` in
   `skills/linear-preflight/SKILL.md` →
   `- skills/linear-preflight/SKILL.md missing "enumerates every «Как
   проверить» item"` (exit 1). Restored → green.

After the final restore: `node scripts/verify.mjs` green (9 checks),
including `node scripts/validate-workflow.mjs` with
`validateHeartbeatContract` (MONO-1), `validateHonestLedgerContract`
(MONO-2), `validateLiveQaGateContract` (MONO-3),
`validateRealBackendContractSampling` (MONO-4), and
`validateGoalContractBinding` (MONO-5) all passing.
