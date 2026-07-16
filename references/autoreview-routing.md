# Autoreview Model Routing

`mono-preflight` must select the Codex review model and reasoning effort from
the workflow risk class. Never rely on the external `autoreview` helper's built-in model default:
that helper is independently updateable and its default
may change without this workflow changing.

## Canonical Routes

| Risk class | Model | Reasoning effort | Intended use |
|---|---|---|---|
| `tiny` | `gpt-5.6-luna` | `low` | Narrow, explicit, low-risk changes with a clear expected result. |
| `standard` | `gpt-5.6-luna` | `medium` | Normal bounded product and workflow changes. |
| `deep` | `gpt-5.6-sol` | `high` | Cross-cutting behavior, new abstractions, ambiguity, or difficult multi-step reasoning without a high-impact boundary. |
| `risky` | `gpt-5.6-sol` | `high` | Auth, permissions, billing, migrations, sensitive data, release/deploy flow, public APIs, and security boundaries. |
| `risky` with critical escalation | `gpt-5.6-sol` | `xhigh` | Irreversible production/data risk, a complex security boundary, a near-limit dispersed scope, or a release blocker after conflicting reviews. |

This policy intentionally uses only the GPT-5.6 family. GPT-5.5 is not a
normal `mono-preflight` route. Do not silently fall back to another model or
effort when a selected route is unavailable.

Cross-vendor review is deliberately not a code-review requirement, and must
not be added by analogy to the Second Voice. Independence-by-different-vendor
is a Second Voice property: it guards subjective product judgment, where two
instances of one model share the same priors and one interviewing the other
learns nothing. Code review is grounded in the concrete diff — bugs, logic,
contract shape — so the gate is served better by matching model strength to
risk within GPT-5.6 than by crossing vendors, and the graded Luna/Terra/Sol
ladder exists for exactly that match. Cross-vendor code review stays only the
specific `risky` compensation described below, and only when the worker engine
is not Codex.

A review model must be at least as capable as the code's producer for the gate
to add signal: a weaker reviewer rubber-stamps exactly the failures the gate
exists to catch. Under that principle the `standard` → `gpt-5.6-luna` /
`medium` route is PROVISIONAL pending live-QA validation of the
hermes-dashboard waves, which run Luna review on standard-class work.
Re-tier trigger: if live QA surfaces defects that Luna-reviewed code shipped,
`standard` re-tiers to `gpt-5.6-sol` / `medium`. The re-tier lands as a
routing-table change in this file, never as an ad-hoc per-run override.

Known limitation at `risky`: the route can put `gpt-5.6-sol` in review of code
produced by `gpt-5.6-sol` (same-model review), and METR flags `gpt-5.6-sol`
with the highest reward-hacking rate among public models — a model reviewing
its own output is worst-placed to catch exactly that defect class. The
workflow compensates with the mandatory live QA gate before Linear closeout,
the no-test-edits rule (review-triggered fixes must never weaken, delete, or
rewrite tests to reach green), and cross-vendor review whenever the worker
engine is not Codex (the Codex reviewer then comes from a different vendor
than the producer).

## Classification

1. Read the risk class already recorded in the current Linear Project, review
   report, Tech Spec, or Issue. Prefer the most recent approved artifact.
2. Compare that class with the actual final diff. Use the higher class when the
   implementation added a riskier surface than the approved package records.
3. When no durable risk class can be recovered, classify from
   `references/readiness-gates.md`. Ambiguity moves upward, never downward. A
   missing classification for a non-tiny change defaults to `deep`, not
   `standard`.
4. Reclassify before the final durable-scope review when review-triggered fixes
   materially change the files, owner boundary, or risk surface.
5. After that final classification, select the route again from the canonical
   table. An earlier clean result is stale when the risk class moves upward or
   a new or stronger critical signal now requires a higher route, including a
   same-class `risky` transition from `high` to `xhigh`.

Within `risky`, escalate from `high` to `xhigh` only when at least one critical
signal is concrete in the final scope: irreversible production or data
mutation, a complex security boundary, a near-limit dispersed review bundle,
or a release blocker after conflicting credible reviews. Record that signal in
the certificate. Do not use `xhigh` merely because the change is important.

The route is a technical workflow decision. Do not ask the user to choose a
model or effort. Ask only when the actual risk requires product or risk
acceptance that the agent cannot infer safely.

## Invocation

Always pin the Codex engine and pass both values explicitly:

```bash
<autoreview-helper> --mode <scope> <scope-args> --engine codex --model <model> --thinking <effort>
```

Examples:

```bash
# Tiny
<autoreview-helper> --mode branch --base origin/main --engine codex --model gpt-5.6-luna --thinking low

# Standard
<autoreview-helper> --mode branch --base origin/main --engine codex --model gpt-5.6-luna --thinking medium

# Deep
<autoreview-helper> --mode branch --base origin/main --engine codex --model gpt-5.6-sol --thinking high

# Risky
<autoreview-helper> --mode branch --base origin/main --engine codex --model gpt-5.6-sol --thinking high

# Risky with a recorded critical escalation
<autoreview-helper> --mode branch --base origin/main --engine codex --model gpt-5.6-sol --thinking xhigh
```

Keep the selected route unchanged across retries and review-fix iterations
unless the risk classification moves upward. Capacity, authentication, or
model-availability errors must retry the same route and then block; they must
not trigger a cheaper or older hidden fallback.

## Certificate Evidence

The preflight certificate must record:

- risk class and where it came from;
- critical escalation signal or `none`;
- selected model and reasoning effort;
- final command with explicit `--model` and `--thinking`;
- any upward reclassification during the review loop.

`ready` is invalid when the final command omits `--engine codex` or either routing flag, selects a model
outside GPT-5.6, or does not match the final risk class.
