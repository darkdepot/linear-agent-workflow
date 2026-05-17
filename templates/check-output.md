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

Notes:

- `PASS` means the agent inspected required state and found no blocking drift.
- `PASS` is not deterministic proof.
- `BLOCKED` must include the smallest useful next action.
