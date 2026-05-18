# Check Output Template

Pass:

```text
PASS - Linear <mode> ready
Meaning: inspected required state and found no blocking drift; this is not deterministic proof.

Проверено:
Не проверено:
Notes:
```

Blocked:

```text
BLOCKED - Linear <mode> not ready
Meaning: required state could not be inspected or updated, so readiness is unknown.

Missing:
Drift:
Risk:
Проверено:
Не проверено:
Next action:
```

Fail:

```text
FAIL - Linear <mode> not ready
Meaning: a hard workflow contract was violated or a required artifact/stage is missing.

Contract violation:
Evidence:
Проверено:
Не проверено:
Required recovery:
```

Notes:

- `PASS` means the agent inspected required state and found no blocking drift.
- `PASS` is not deterministic proof.
- `FAIL` means the workflow violated a hard contract or skipped a required artifact.
- `BLOCKED` must include the smallest useful next action.
- Every result should include a compact "not checked" boundary when manual QA, browser QA, production smoke, deploy verification, or user acceptance did not run.
