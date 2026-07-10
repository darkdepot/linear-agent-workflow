# MONO-9 Pin Negative Tests (`validateOpsLessons`)

Date: 2026-07-11. Goal: prove the new MONO-9 pins in
`scripts/validate-workflow.mjs` actually catch regressions — each pin
was broken temporarily (file copies via `cp` backup/restore, never
`git checkout --`; edits committed before any break run), shown to fail
naming the pin, then restored (byte-identical restore confirmed, validator
green after every restore). MONO-1's `validateHeartbeatContract`,
MONO-2's `validateHonestLedgerContract`, MONO-3's
`validateLiveQaGateContract`, MONO-4's
`validateRealBackendContractSampling`, MONO-5's
`validateGoalContractBinding`, MONO-6's `validateReviewLoopHygiene`,
MONO-7's `validateCostTelemetry`, and MONO-8's `validateBriefIntegrity`
pins run in the same validator pass and stayed green throughout: every
break run reported exactly one failure line — the deliberately broken
pin.

## Pins Under Test

`validateOpsLessons()` pins, all additive, over three operational
lessons:

- Install-source SHA blocker (`skills/linear-deploy/SKILL.md` and
  `references/install.md`, both files): `the installing checkout's HEAD
  must equal the expected merge SHA`, `git rev-parse HEAD`,
  `a DEPLOY BLOCKER, not a warning`,
  `verify SHA → install → `--check``. Precedent: the MONO-3 deploy
  incident — a foreign commit on local main made `git pull --ff-only`
  fail with swallowed output and the pack briefly installed from the
  wrong source, caught only via a version anomaly.
- gh-only PR state after interruption (`skills/linear-ship/SKILL.md`):
  `exclusively via `gh` commands against the exact head SHA`,
  `never from thread memory`,
  `state assumed from memory is treated as unverified`. Precedent:
  HD-46 — a ship turn died on a provider capacity error after push +
  PR creation; PR state had to be reconciled via gh.
- Forced mid-wave resume drill (`references/orchestration.md`, Resume
  section): `Forced mid-wave resume drill`,
  `a planned one-time operational act`, `not a recurring gate`,
  `records every reconstruction discrepancy in the ledger`,
  `feeds the PRD wave-1 success criteria`. Precedent: the wave-1
  orchestrator session peaked at 92% of a 1M context window and a
  forced mid-wave resume has never been tested.

The pins anchor the contract prose. Resolving a bad checkout,
reconciling a PR via gh after a crash, and executing the drill itself
stay judgment and operational work — pins bind the rules, not the
execution. No existing pin was weakened; every string pinned by
MONO-3 on `skills/linear-deploy/SKILL.md` and `references/install.md`,
by MONO-6 on `skills/linear-ship/SKILL.md`, and by MONO-1/2/3/7/8 on
`references/orchestration.md` stayed byte-intact and green throughout.

## Protocol Runs

Process note: the MONO-9 edits were committed before any break run;
each file under test was backed up with `cp` before its break, every
break was applied as a byte-level `python3` replacement (never
`perl`/`sed` — MONO-8 recorded `perl -CSD` silently no-opping on
non-ASCII pins), and reverted by `cp` from the backup — never
`git checkout --`. The harness aborts on a no-op break (pattern absent
or file unchanged after the edit) instead of reporting a false pass.
After each restore, a byte-identity check confirmed the file matched
its backup and the validator ran green.

1. `the installing checkout's HEAD must equal the expected merge SHA` →
   `...should roughly match the merge SHA` in
   `skills/linear-deploy/SKILL.md` →
   `- skills/linear-deploy/SKILL.md missing "the installing checkout's
   HEAD must equal the expected merge SHA"` (exit 1). Restored → green.
2. Same replacement in `references/install.md` →
   `- references/install.md missing "the installing checkout's HEAD
   must equal the expected merge SHA"` (exit 1). Restored → green.
3. `is a DEPLOY BLOCKER, not a warning` → `is a warning worth
   investigating` in `skills/linear-deploy/SKILL.md` →
   `- skills/linear-deploy/SKILL.md missing "a DEPLOY BLOCKER, not a
   warning"` (exit 1). Restored → green.
4. Same replacement in `references/install.md` →
   `- references/install.md missing "a DEPLOY BLOCKER, not a warning"`
   (exit 1). Restored → green.
5. `(verify SHA → install → `--check`)` → `(install → `--check`)` in
   `references/install.md` (non-ASCII arrows; byte-level edit) →
   `- references/install.md missing "verify SHA → install → `--check`"`
   (exit 1). Restored → green.
6. `(verify SHA → install → `--check`)` → `(install first, check
   after)` in `skills/linear-deploy/SKILL.md` →
   `- skills/linear-deploy/SKILL.md missing "verify SHA → install →
   `--check`"` (exit 1). Restored → green.
7. `exclusively via `gh` commands against the exact head SHA` → `from
   the session transcript where convenient` in
   `skills/linear-ship/SKILL.md` →
   `- skills/linear-ship/SKILL.md missing "exclusively via `gh`
   commands against the exact head SHA"` (exit 1). Restored → green.
8. `never from thread memory` → `or from thread memory` in
   `skills/linear-ship/SKILL.md` →
   `- skills/linear-ship/SKILL.md missing "never from thread memory"`
   (exit 1). Restored → green.
9. `state assumed from memory is treated as unverified` → `state
   assumed from memory may be trusted` in
   `skills/linear-ship/SKILL.md` →
   `- skills/linear-ship/SKILL.md missing "state assumed from memory is
   treated as unverified"` (exit 1). Restored → green.
10. `Forced mid-wave resume drill` → `Optional resume rehearsal` in
    `references/orchestration.md` →
    `- references/orchestration.md missing "Forced mid-wave resume
    drill"` (exit 1). Restored → green.
11. `a planned one-time operational act` → `a recurring ceremony each
    wave` in `references/orchestration.md` →
    `- references/orchestration.md missing "a planned one-time
    operational act"` (exit 1). Restored → green.
12. `not a recurring gate` → `and a standing gate` in
    `references/orchestration.md` →
    `- references/orchestration.md missing "not a recurring gate"`
    (exit 1). Restored → green.
13. `records every reconstruction discrepancy in the ledger` → `notes
    reconstruction issues informally` in `references/orchestration.md` →
    `- references/orchestration.md missing "records every
    reconstruction discrepancy in the ledger"` (exit 1). Restored →
    green.
14. `feeds the PRD wave-1 success criteria` → `is kept for private
    reference` in `references/orchestration.md` →
    `- references/orchestration.md missing "feeds the PRD wave-1
    success criteria"` (exit 1). Restored → green.

The `git rev-parse HEAD` pin was not break-tested separately: both
files carry it inside the prose already covered by runs 1-2 and 5-6,
and breaking those lines exercises the same regression surface.

Every break run reported exactly one failure line. After the final
restore: `node scripts/verify.mjs` green (9 checks), including
`node scripts/validate-workflow.mjs` with `validateHeartbeatContract`
(MONO-1), `validateHonestLedgerContract` (MONO-2),
`validateLiveQaGateContract` (MONO-3),
`validateRealBackendContractSampling` (MONO-4),
`validateGoalContractBinding` (MONO-5), `validateReviewLoopHygiene`
(MONO-6), `validateCostTelemetry` (MONO-7), `validateBriefIntegrity`
(MONO-8), and `validateOpsLessons` (MONO-9) all passing.
