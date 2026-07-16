# MONO-4 Pin Negative Tests (`validateRealBackendContractSampling`)

Date: 2026-07-11. Goal: prove the new MONO-4 pins in
`scripts/validate-workflow.mjs` actually catch regressions — each pin was
broken temporarily, shown to fail naming the pin, then restored (validator
green after every restore). MONO-1's `validateHeartbeatContract`, MONO-2's
`validateHonestLedgerContract`, and MONO-3's `validateLiveQaGateContract`
pins run in the same validator pass and stayed green throughout: every
break run reported exactly one failure line — the deliberately broken pin.

## Pins Under Test

`validateRealBackendContractSampling()` pins, all additive:

- `skills/mono-spec/SKILL.md`: the real-response requirement
  (`sample of real responses from the deployed instance`,
  `not just an endpoint list`), the blocker classification
  (`spec blocker, not an implementation surprise`), and the degradation
  rule (`contract-verification spike Issue goes first in the wave`).
- `references/artifact-quality.md`: the same requirement as a quality bar
  (`sample of real responses from the deployed instance`,
  `"Endpoint exists" is not contract verification`,
  `sampling date and deployed SHA/version`,
  `contract-verification spike Issue`).
- `templates/tech-spec.md`: the hint-line content (`домены enum`,
  `крайние записи`, `дата выборки и SHA/версия деплоя`) and the rule
  bullet (`sampled real responses from the deployed instance`,
  `An endpoint list alone does not verify the contract`,
  `contract-verification spike Issue that goes first in the wave`).

Structural pin (in `validateTemplateSections()`, the established
required-sections pattern): `### Реальные ответы бэкенда` added to the
`templates/tech-spec.md` required list, under `## Контракты и границы`.

## Protocol Runs

1. `sample of real responses from the deployed instance` replaced with
   `list of endpoints exposed by the deployed instance` in
   `skills/mono-spec/SKILL.md` →
   `- skills/mono-spec/SKILL.md missing "sample of real responses from
   the deployed instance"` (exit 1). Restored → green.
2. `contract-verification spike Issue goes first in the wave` replaced
   with `contract-verification spike Issue can go later in the wave` in
   `skills/mono-spec/SKILL.md` →
   `- skills/mono-spec/SKILL.md missing "contract-verification spike
   Issue goes first in the wave"` (exit 1). Restored → green.
3. `"Endpoint exists" is not contract verification` replaced with
   `"Endpoint exists" is sufficient contract verification` in
   `references/artifact-quality.md` →
   `- references/artifact-quality.md missing "\"Endpoint exists\" is not
   contract verification"` (exit 1). Restored → green.
4. `### Реальные ответы бэкенда` heading edited to `### Ответы бэкенда`
   in `templates/tech-spec.md` →
   `- templates/tech-spec.md missing ### Реальные ответы бэкенда`
   (exit 1, caught by `validateTemplateSections`). Restored → green.
5. `дата выборки и SHA/версия деплоя` truncated to `дата выборки` in the
   `templates/tech-spec.md` hint line →
   `- templates/tech-spec.md missing "дата выборки и SHA/версия деплоя"`
   (exit 1). Restored → green.

After the final restore: `node scripts/verify.mjs` green (9 checks),
including `node scripts/validate-workflow.mjs` with
`validateHeartbeatContract` (MONO-1), `validateHonestLedgerContract`
(MONO-2), `validateLiveQaGateContract` (MONO-3), and
`validateRealBackendContractSampling` (MONO-4) all passing.
