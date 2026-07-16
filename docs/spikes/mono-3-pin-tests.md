# MONO-3 Pin Negative Tests (`validateLiveQaGateContract`)

Date: 2026-07-11. Goal: prove the new MONO-3 pins in
`scripts/validate-workflow.mjs` actually catch regressions — each pin was
broken temporarily, shown to fail naming the pin, then restored (validator
green after every restore). MONO-1's `validateHeartbeatContract` and
MONO-2's `validateHonestLedgerContract` pins run in the same validator
pass and stayed green throughout.

## Pins Under Test

`validateLiveQaGateContract()` pins, all additive:

- `skills/mono-deploy/SKILL.md`: gate presence (`Live QA gate`), SHA
  precondition (`verify the deployed version matches the certified merged
  SHA`), functional smoke (`walk the PRD acceptance criteria of the
  shipped Issue and check the console for errors`), design acceptance
  (`prototype approved at the UX checkpoint`, `never your own taste`,
  `functional smoke alone suffices`), fix-forward defect handling
  (`immediate hotfix Issue out of queue`, `fix-forward`,
  `only after its own live pass is green`, `own live verification`),
  flake adjudication (`verify on clean state before calling something a
  defect`, `not a gate failure`), non-web mapping (`verify the delivered
  artifact live`, `counts as the live pass`), instrument/auth
  (`workflows.qa`, `qaAuth`), and skip discipline
  (`explicit recorded reason`).
- `references/lifecycle.md`: Deploy Required lines (SHA precondition,
  `live QA sweep on the deployed app for user-facing changes`,
  `only after its own live pass is green`,
  `immediate hotfix Issue out of queue`, `fix-forward`) and the Forbidden
  line (`failed or skipped live pass on a user-facing change and no
  explicit recorded skip reason`).
- `references/install.md`: `"qa"` in the example config,
  `` `workflows.qa` (optional) ``, `` `qaAuth` (optional) ``,
  `cookie-import`, `test-account`, `owner-session`,
  `involving the owner`.
- `skills/mono-orchestrate/SKILL.md`: `Live QA gate`,
  `workers have no browser`, `out of queue`, `control-plane exception`,
  `explicit owner mandate`, `Feature code NEVER`.
- `references/orchestration.md`: `control-plane exception`,
  `explicit owner mandate`, `deploy scripts, infra config, docs address
  sweeps`, `feature code never qualifies`.
- `templates/deploy-output.md`: `Live QA:` line in the deploy status
  block.

Functional config coverage (in `validateProjectConfigBehavior()`, the
`deployApproval` fixture pattern): a fixture repo config with
`workflows.qa: "gstack qa-only"` + `qaAuth: "cookie-import"` must pass
`project-config --check`; `qaAuth: "shared-password"` must fail naming
`qaAuth`; `workflows.qa: 42` must fail naming `workflows.qa`; removing
both optional fields must pass again (backward compatible: absent =
fine). These fixtures execute on every validator run.

## Protocol Runs

1. `Live QA gate` replaced with `Live smoke gate` in
   `skills/mono-deploy/SKILL.md`. Note: replacing only the section
   heading kept the validator green because the phrase also appears in
   the workflow steps — the pin asserts presence anywhere in the file, so
   the break must remove all occurrences (as a real gate removal would).
   All occurrences replaced →
   `- skills/mono-deploy/SKILL.md missing "Live QA gate"` (exit 1).
   Restored → green.
2. `verify the deployed version matches the certified merged SHA`
   replaced with `check the deployed version` in
   `references/lifecycle.md` →
   `- references/lifecycle.md missing "verify the deployed version
   matches the certified merged SHA"` (exit 1). Restored → green.
3. `immediate hotfix Issue out of queue` replaced with `prompt follow-up
   Issue in the queue` in `skills/mono-deploy/SKILL.md` →
   `- skills/mono-deploy/SKILL.md missing "immediate hotfix Issue out
   of queue"` (exit 1). Restored → green.
4. `"qa": null` replaced with `"quality": null` in the
   `references/install.md` example config →
   `- references/install.md missing "\"qa\""` (exit 1). Restored →
   green.
5. `control-plane exception` replaced with `ops exception` (all
   occurrences) in `references/orchestration.md` →
   `- references/orchestration.md missing "control-plane exception"`
   (exit 1). Restored → green.
6. Functional negative: the `qaAuth` validation block in
   `scripts/project-config.mjs` disabled (`if (false && "qaAuth" in
   config)`) →
   `- project-config --check invalid qaAuth fixture unexpectedly passed`
   (exit 1) — the fixture bites when the validation regresses. Restored
   → green.

After the final restore: `node scripts/verify.mjs` green (9 checks),
including `node scripts/validate-workflow.mjs` with
`validateHeartbeatContract` (MONO-1), `validateHonestLedgerContract`
(MONO-2), and `validateLiveQaGateContract` (MONO-3) all passing.
