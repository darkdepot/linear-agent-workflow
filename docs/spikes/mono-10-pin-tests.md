# MONO-10 Pin Negative Tests (autoreview routing amendments)

Date: 2026-07-11. Goal: prove the MONO-10 pins in
`scripts/validate-workflow.mjs` actually catch regressions — each pin
was broken temporarily (file copies via `cp` backup/restore, never
`git checkout --`; edits committed before any break run), shown to fail
naming the pin, then restored (byte-identical restore confirmed,
validator green after every restore). MONO-1's
`validateHeartbeatContract`, MONO-2's `validateHonestLedgerContract`,
MONO-3's `validateLiveQaGateContract`, MONO-4's
`validateRealBackendContractSampling`, MONO-5's
`validateGoalContractBinding`, MONO-6's `validateReviewLoopHygiene`,
MONO-7's `validateCostTelemetry`, MONO-8's `validateBriefIntegrity`,
and MONO-9's `validateOpsLessons` pins run in the same validator pass
and stayed green throughout: every break run reported exactly one
failure line — the deliberately broken pin.

## Pins Under Test

MONO-10 extends the existing `references/autoreview-routing.md` pin list
inside the required-texts map (no new validator function). One pin is
intentionally updated, the rest are additive:

- Updated deep-row pin: `` `deep` | `gpt-5.6-sol` | `medium` `` →
  `` `deep` | `gpt-5.6-sol` | `high` `` — the only route change in this
  release, and a strengthening one (aligns the canonical table with the
  tiering research). No other route pin changed; `tiny`, `standard`,
  `risky`, and `risky`-with-escalation rows stayed byte-intact.
- Reviewer-vs-producer principle:
  `at least as capable as the code's producer`.
- PROVISIONAL marking of the `standard` route:
  `PROVISIONAL pending live-QA validation of the`,
  `hermes-dashboard waves`.
- Re-tier trigger:
  `if live QA surfaces defects that Luna-reviewed code shipped`,
  `` `standard` re-tiers to `gpt-5.6-sol` / `medium` ``.
- Same-model limitation at `risky` and its compensations:
  `` `gpt-5.6-sol` (same-model review) ``, `no-test-edits rule`,
  `cross-vendor review whenever the worker`.

The pins anchor the routing contract prose. Deciding when the
hermes-dashboard live-QA evidence is sufficient, and executing the
re-tier itself, stay judgment work — pins bind the rules, not the
decision. No existing pin was weakened: only the deep row moved, and it
moved upward.

## Protocol Runs

Process note: the MONO-10 edits were committed before any break run;
the file under test was backed up with `cp` before each break, every
break was applied as a byte-level `python3` replacement (never
`perl`/`sed` — MONO-8 recorded `perl -CSD` silently no-opping on
non-ASCII pins), and reverted by `cp` from the backup — never
`git checkout --`. The harness aborts on a no-op break (pattern absent
or file unchanged after the edit) instead of reporting a false pass.
After each restore, a byte-identity check confirmed the file matched
its backup and the validator ran green.

1. `| `deep` | `gpt-5.6-sol` | `high` |` (table row) →
   `| `deep` | `gpt-5.6-sol` | `medium` |` →
   `- references/autoreview-routing.md missing "`deep` | `gpt-5.6-sol`
   | `high`"` (exit 1). Exactly one failure — proving the old
   `medium` deep-row pin was removed, not left behind as a duplicate.
   Restored → green.
2. `PROVISIONAL pending live-QA validation of the` → `an accepted
   permanent route regardless of` →
   `- references/autoreview-routing.md missing "PROVISIONAL pending
   live-QA validation of the"` (exit 1). Restored → green.
3. `if live QA surfaces defects that Luna-reviewed code shipped` →
   `should live QA ever look unconvincing in some general way` →
   `- references/autoreview-routing.md missing "if live QA surfaces
   defects that Luna-reviewed code shipped"` (exit 1). Restored →
   green.
4. `` `standard` re-tiers to `gpt-5.6-sol` / `medium` `` →
   `` `standard` may be revisited at leisure `` →
   `- references/autoreview-routing.md missing "`standard` re-tiers to
   `gpt-5.6-sol` / `medium`"` (exit 1). Restored → green.
5. `` `gpt-5.6-sol` (same-model review) `` →
   `` `gpt-5.6-sol` (an acceptable pairing) `` →
   `- references/autoreview-routing.md missing "`gpt-5.6-sol`
   (same-model review)"` (exit 1). Restored → green.
6. `no-test-edits rule` → `loose test-editing habit` →
   `- references/autoreview-routing.md missing "no-test-edits rule"`
   (exit 1). Restored → green.
7. `cross-vendor review whenever the worker` → `same-vendor review
   whenever the worker` →
   `- references/autoreview-routing.md missing "cross-vendor review
   whenever the worker"` (exit 1). Restored → green.
8. `at least as capable as the code's producer` → `roughly comparable
   to the code's producer` →
   `- references/autoreview-routing.md missing "at least as capable as
   the code's producer"` (exit 1). Restored → green.

The `hermes-dashboard waves` pin was not break-tested separately: it
sits on the line adjacent to the run-2 pin inside the same PROVISIONAL
sentence, and breaking that sentence (run 2) exercises the same
regression surface.

Every break run reported exactly one failure line. After the final
restore: `node scripts/verify.mjs` green (9 checks), including
`node scripts/validate-workflow.mjs` with all MONO-1 through MONO-9
contract validators passing alongside the amended
`references/autoreview-routing.md` pin list.
