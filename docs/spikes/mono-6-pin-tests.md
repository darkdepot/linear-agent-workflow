# MONO-6 Pin Negative Tests (`validateReviewLoopHygiene`)

Date: 2026-07-11. Goal: prove the new MONO-6 pins in
`scripts/validate-workflow.mjs` actually catch regressions — each pin was
broken temporarily, shown to fail naming the pin, then restored (validator
green after every restore). MONO-1's `validateHeartbeatContract`, MONO-2's
`validateHonestLedgerContract`, MONO-3's `validateLiveQaGateContract`,
MONO-4's `validateRealBackendContractSampling`, and MONO-5's
`validateGoalContractBinding` pins run in the same validator pass and
stayed green throughout: every break run reported exactly one failure
line — the deliberately broken pin.

## Pins Under Test

`validateReviewLoopHygiene()` pins, all additive:

- `references/ship-feedback-loop.md`, bot-config-first
  (`Before the first resolver cycle on a PR, check the review bots'
  configuration`, `fixed via configuration or recorded as an environment
  fact`, `never burned down with resolver cycles`).
- `references/ship-feedback-loop.md`, dedup policy
  (`does not consume the resolver cycle budget and does not restart the
  quiet period`, `Resolver cycle budgets count only novel findings`) with
  the mandatory fail-safe
  (`treat it as novel and keep the thread open`,
  `Dedup must never become a channel for dismissing real findings`).
- `references/ship-feedback-loop.md`, submitted-check
  (`published, not a pending draft`, the concrete
  ``gh api repos/<owner>/<repo>/pulls/<n>/reviews --jq '.[] |
  select(.state=="PENDING")'`` command,
  `Unpublished rationales count as unresolved threads`,
  `This submitted-check is a green-certificate precondition`, and the
  Green Exit condition `No pending (unsubmitted) review drafts remain for
  the worker's own reviews`).
- `references/ship-feedback-loop.md`, non-blocking convergence
  (`After the authorized final resolver cycle`,
  `get deferral replies, filed as a follow-up issue when warranted`,
  `proceeds to terminal status`, `always escalate instead`).
- `skills/linear-ship/SKILL.md`, pointer rule
  (`Review Bot Configuration Check, Finding Dedup with its fail-safe,
  Published Replies, and Non-Blocking Convergence rules in
  `` `references/ship-feedback-loop.md` ``,
  `the Published Replies submitted-check is an additional
  green-certificate precondition`).

These pins tighten the green conditions: the submitted-check adds a
green-certificate precondition, and dedup cannot exist without its
fail-safe clause. No existing pin was weakened; the pre-existing
fallback pins on `references/ship-feedback-loop.md`
(`Poll interval: 10 minutes`, `Documentation workflow`,
`linear-ship green certificate`, `Next: linear-deploy`) stayed
byte-intact and green throughout.

## Protocol Runs

1. `Before the first resolver cycle on a PR, check the review bots'
   configuration` replaced with `At some point, consider checking the
   review bots' configuration` in `references/ship-feedback-loop.md` →
   `- references/ship-feedback-loop.md missing "Before the first resolver
   cycle on a PR, check the review bots' configuration"` (exit 1).
   Restored → green.
2. `does not consume the resolver cycle budget and does not restart the
   quiet period` replaced with `consumes the resolver cycle budget and
   restarts the quiet period` →
   `- references/ship-feedback-loop.md missing "does not consume the
   resolver cycle budget and does not restart the quiet period"`
   (exit 1). Restored → green.
3. `Dedup must never become a channel for dismissing real findings`
   replaced with `Dedup may be used to dismiss stubborn findings` →
   `- references/ship-feedback-loop.md missing "Dedup must never become a
   channel for dismissing real findings"` (exit 1). Restored → green.
4. `select(.state=="PENDING")` replaced with `select(.state=="APPROVED")`
   inside the gh verification command →
   `- references/ship-feedback-loop.md missing "gh api
   repos/<owner>/<repo>/pulls/<n>/reviews --jq '.[] |
   select(.state==\"PENDING\")'"` (exit 1). Restored → green.
5. Green Exit condition `No pending (unsubmitted) review drafts remain
   for the worker's own reviews` replaced with `Pending review drafts are
   acceptable` →
   `- references/ship-feedback-loop.md missing "No pending (unsubmitted)
   review drafts remain for the worker's own reviews"` (exit 1).
   Restored → green.
6. `After the authorized final resolver cycle` replaced with `After every
   resolver cycle` →
   `- references/ship-feedback-loop.md missing "After the authorized
   final resolver cycle"` (exit 1). Restored → green.
7. `the Published Replies submitted-check is an additional
   green-certificate precondition` replaced with `the Published Replies
   submitted-check is advisory` in `skills/linear-ship/SKILL.md` →
   `- skills/linear-ship/SKILL.md missing "the Published Replies
   submitted-check is an additional green-certificate precondition"`
   (exit 1). Restored → green.

Every break run reported exactly one failure line. After the final
restore: `node scripts/verify.mjs` green (9 checks), including
`node scripts/validate-workflow.mjs` with `validateHeartbeatContract`
(MONO-1), `validateHonestLedgerContract` (MONO-2),
`validateLiveQaGateContract` (MONO-3),
`validateRealBackendContractSampling` (MONO-4),
`validateGoalContractBinding` (MONO-5), and
`validateReviewLoopHygiene` (MONO-6) all passing.
