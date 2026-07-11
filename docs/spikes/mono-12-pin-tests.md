# MONO-12 pin tests — Second Voice cross-vendor model selection

Contract change: `references/orchestration.md` `### Second Voice` now selects
the reviewer model relative to the orchestrator and always cross-vendor, instead
of hardcoding an Opus-class reviewer and keying independence on a distinct
*session*. Two validator pins in `scripts/validate-workflow.mjs`
(`validateOrchestrationContract`) lock the load-bearing invariants.

## Why

Observed live (2026-07-11): an orchestrator running on Opus spawned a Second
Voice also on Opus — a self-interview. A fresh context on the same model shares
the same training, biases, and blind spots, so the "second" voice was an echo.
The prior binding said "distinct from the orchestrator's own session (Opus-class;
the Agent tool's `opus` model)" — distinctness was scoped to context, not model,
and the model was hardcoded, so an Opus orchestrator contradicted the rule and
collapsed into review-of-self.

## Rule

Cross-vendor, both sides at high reasoning:
- Orchestrator on a Claude model (Fable, Opus, Sonnet …) → Second Voice =
  `gpt-5.6-sol` at `model_reasoning_effort="high"` (fresh `codex exec` thread).
- Orchestrator on GPT-5.6 (`sol`, `terra`, `luna`) → Second Voice = Claude Opus
  (latest) at high reasoning.
- Fallback only when the cross-vendor model is unreachable: in-session lens pass,
  reason recorded. A same-model Second Voice is not an acceptable fallback.

## Pins

1. `"a different model family from the orchestrator"` — the cross-vendor rule.
2. `"A same-model Second Voice is not an acceptable fallback"` — the anti-echo
   guard that forecloses the exact observed failure (no silent downgrade to a
   same-model reviewer when the cross-vendor model is missing).

## Negative test (break → fail → restore)

```
$ node scripts/validate-workflow.mjs        # baseline
VALIDATE EXIT: 0

# break 1: "a different model family" → "a different MODEL family"
$ node scripts/validate-workflow.mjs
- references/orchestration.md missing a different model family from the orchestrator
VALIDATE EXIT: 1

# restore → break 2: "...is not an acceptable fallback" → "...is fine actually"
$ node scripts/validate-workflow.mjs
- references/orchestration.md missing A same-model Second Voice is not an acceptable fallback
VALIDATE EXIT: 1

# restore
$ node scripts/validate-workflow.mjs
VALIDATE EXIT: 0
$ node scripts/verify.mjs                    # 9 checks
VERIFY EXIT: 0
```

Each pin fails independently and names exactly the missing invariant; restoring
the prose returns the validator to green. `verify.mjs` (which runs the validator
plus `node --check` on scripts and the other 8 checks) is green after the change.

## Note

The `model_reasoning_effort="high"` token that `validateHeartbeatContract` pins
in `references/orchestration.md` is preserved by the rewrite (it moved into the
Claude-orchestrator → Sol binding), so no existing pin was disturbed.
