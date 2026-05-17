# Check Output Template

Pass:

```text
PASS - Linear <mode> ready

Inspected:
Notes:
```

Blocked:

```text
BLOCKED - Linear <mode> not ready

Missing:
Drift:
Risk:
Next action:
```

Fail:

```text
FAIL - Linear <mode> not ready

Contract violation:
Evidence:
Required recovery:
```

Notes:

- `PASS` means the agent inspected required state and found no blocking drift.
- `PASS` is not deterministic proof.
- `FAIL` means the workflow violated a hard contract or skipped a required artifact.
- `BLOCKED` must include the smallest useful next action.
