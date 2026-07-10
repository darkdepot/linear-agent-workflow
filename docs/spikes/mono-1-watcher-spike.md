# MONO-1 Spike: External Worker Watcher (`scripts/watch-workers.mjs`)

Date: 2026-07-10. Goal: prove that a zero-dependency, read-only watcher over
the orchestrator root detects `spawn-fail` immediately and `stall`/`dead` by
threshold, before touching any contracts.

## Watcher Under Test

`scripts/watch-workers.mjs` — Node, `node:fs`/`node:path`/`node:process`
only. Reads `logs/*.jsonl`, `reports/*.json`, `workers.json` under
`--root <dir>`; writes nothing; emits one stable line per event to stdout:

```text
<ISO time> EVENT:<stall|dead|spawn-fail> <ISSUE-KEY> <detail>
```

Thresholds: `--stall-sec` default 120 (hard minimum 90), `--repeat-sec`
default 300 (event dedup window), `--interval-sec` default 15 scan period.

## Fixture

Built in a temp directory by a throwaway script (aged mtimes via
`fs.utimesSync`; not part of the repo):

| Log / registry entry | Setup | Expected |
| --- | --- | --- |
| `MONO-2-linear-implement-a1.jsonl` | valid JSONL, mtime -60s | silent |
| `MONO-3-linear-implement-a1.jsonl` | valid JSONL, mtime -200s | `stall` |
| `MONO-4-linear-ship-a1.jsonl` | first line `Reading additional input from stdin...`, mtime **now** | `spawn-fail` immediately |
| `MONO-5-linear-implement-a2.jsonl` | valid JSONL, mtime -500s | `dead` (over 2x stall) |
| `MONO-6-linear-preflight-a1.jsonl` | valid JSONL, mtime -300s, plus a fresher `reports/MONO-6-linear-preflight.json` | silent (normal exit) |
| `MONO-8-linear-implement-a1.jsonl` | valid JSONL, mtime -150s, registry `pid: 999999` (nonexistent) | `dead` (writer pid gone) |
| `workers.json` entry `MONO-7` | `log: null` | `dead` (no live log) |

## Run 1: Single Scan, Default Thresholds

```bash
node scripts/watch-workers.mjs --root <fixture-root> --once
```

Output (stdout, verbatim):

```text
2026-07-10T14:57:27.608Z EVENT:stall MONO-3 log MONO-3-linear-implement-a1.jsonl last event 200s ago (stall threshold 120s)
2026-07-10T14:57:27.608Z EVENT:spawn-fail MONO-4 first log line is not JSON: "Reading additional input from stdin..." (MONO-4-linear-ship-a1.jsonl)
2026-07-10T14:57:27.608Z EVENT:dead MONO-5 log MONO-5-linear-implement-a2.jsonl silent for 500s (over 2x stall threshold 120s) with no writer evidence
2026-07-10T14:57:27.608Z EVENT:dead MONO-8 log MONO-8-linear-implement-a1.jsonl silent for 150s and writer pid 999999 is gone
2026-07-10T14:57:27.608Z EVENT:dead MONO-7 workers.json entry (stage linear-implement) has no live log file
```

All seven expectations hold, including both silent cases (fresh worker,
normally-exited worker with a fresher mailbox report).

## Run 2: Live Loop — spawn-fail Latency And Repeat Suppression

```bash
node scripts/watch-workers.mjs --root <fixture-root> --interval-sec 1 &
sleep 2
printf 'Reading additional input from stdin...\n' > <fixture-root>/logs/MONO-9-linear-implement-a1.jsonl
sleep 4; kill %1
```

- Watcher started 14:57:47.074Z; the bad `MONO-9` log was created at
  ~14:57:49.05 and detected at **14:57:49.078Z** — the very next 1s tick,
  with mtime = now. `spawn-fail` detection is immediate (bounded only by the
  scan interval), not gated on any age threshold.
- Over ~6 scans at 1s interval with `--repeat-sec 300`, `sort | uniq -c`
  showed **every event exactly once** — repeat suppression works.

## Run 3: Threshold Guards

```bash
node scripts/watch-workers.mjs --root <fixture-root> --once --stall-sec 89
# --stall-sec must be at least 90 (got 89); lower values misread normal turn gaps as stalls.  (exit 2)

node scripts/watch-workers.mjs --root <fixture-root> --once --stall-sec 90
# exit 0; MONO-3 at 200s now exceeds 2x90=180s and correctly escalates stall -> dead
```

Missing `--root` exits 2 with usage. `node --check` passes.

## Threshold Conclusions

- `spawn-fail` needs no threshold: a non-JSON first line is deterministic
  evidence (the codex CLI interactive-stdin banner) and is caught on the
  first scan after the file appears.
- 120s default stall is right for codex JSONL streams: turn gaps of 60-90s
  are normal under high reasoning effort, so the 90s floor is enforced in
  code, not just in prose.
- `dead` uses two independent signals: registry writer pid gone (precise,
  when recorded), or silence over 2x the stall threshold (fallback with no
  pid). Both fired correctly in the fixture.
- A stale log with a fresher mailbox report is a normal stage exit, not an
  incident; the watcher stays silent (MONO-6), which keeps events actionable.

Verdict: spike proven; contracts below in this PR are safe to pin.

## Validator Pin Negative Tests

`node scripts/verify.mjs` runs `scripts/validate-workflow.mjs`, which does
not auto-discover new scripts (hard-coded step list in `verify.mjs`), so
`node --check scripts/watch-workers.mjs` was added to `verify.mjs`
explicitly. Each pin below was broken temporarily, shown to fail naming the
pin, then restored (verify green after restore):

1. `mv scripts/watch-workers.mjs scripts/watch-workers.mjs.bak` →
   `FAIL node scripts/validate-workflow.mjs`: `- Missing scripts/watch-workers.mjs`
   (plus the `node --check scripts/watch-workers.mjs` step fails).
2. `## Heartbeat` heading edited to `## Heart-beat` in
   `references/orchestration.md` →
   `- references/orchestration.md missing ## Heartbeat`.
3. `< /dev/null` removed from the spawn command in
   `references/orchestration.md` →
   `- references/orchestration.md missing < /dev/null`.
