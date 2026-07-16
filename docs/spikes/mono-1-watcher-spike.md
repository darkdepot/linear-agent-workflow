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
| `MONO-2-mono-implement-a1.jsonl` | valid JSONL, mtime -60s | silent |
| `MONO-3-mono-implement-a1.jsonl` | valid JSONL, mtime -200s | `stall` |
| `MONO-4-mono-ship-a1.jsonl` | first line `Reading additional input from stdin...`, mtime **now** | `spawn-fail` immediately |
| `MONO-5-mono-implement-a2.jsonl` | valid JSONL, mtime -500s | `dead` (over 2x stall) |
| `MONO-6-mono-preflight-a1.jsonl` | valid JSONL, mtime -300s, plus a fresher `reports/MONO-6-mono-preflight.json` | silent (normal exit) |
| `MONO-8-mono-implement-a1.jsonl` | valid JSONL, mtime -150s, registry `pid: 999999` (nonexistent) | `dead` (writer pid gone) |
| `workers.json` entry `MONO-7` | `log: null` | `dead` (no live log) |

## Run 1: Single Scan, Default Thresholds

```bash
node scripts/watch-workers.mjs --root <fixture-root> --once
```

Output (stdout, verbatim):

```text
2026-07-10T14:57:27.608Z EVENT:stall MONO-3 log MONO-3-mono-implement-a1.jsonl last event 200s ago (stall threshold 120s)
2026-07-10T14:57:27.608Z EVENT:spawn-fail MONO-4 first log line is not JSON: "Reading additional input from stdin..." (MONO-4-mono-ship-a1.jsonl)
2026-07-10T14:57:27.608Z EVENT:dead MONO-5 log MONO-5-mono-implement-a2.jsonl silent for 500s (over 2x stall threshold 120s) with no writer evidence
2026-07-10T14:57:27.608Z EVENT:dead MONO-8 log MONO-8-mono-implement-a1.jsonl silent for 150s and writer pid 999999 is gone
2026-07-10T14:57:27.608Z EVENT:dead MONO-7 workers.json entry (stage mono-implement) has no live log file
```

All seven expectations hold, including both silent cases (fresh worker,
normally-exited worker with a fresher mailbox report).

## Run 2: Live Loop — spawn-fail Latency And Repeat Suppression

```bash
node scripts/watch-workers.mjs --root <fixture-root> --interval-sec 1 &
sleep 2
printf 'Reading additional input from stdin...\n' > <fixture-root>/logs/MONO-9-mono-implement-a1.jsonl
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

## MONO-11 Hotfix: Active-Registry Scoping And Dead-Path Report Suppression

Date: 2026-07-11. The first live run against the real hermes-dashboard
orchestrator root surfaced two false-positive classes:

1. Logs of long-retired Issues (HD-32..HD-49: workers retired, worktrees
   removed, logs silent forever) each produced `EVENT:dead` — a flood of 16
   false events per scan. `checkLog` processed every `logs/*.jsonl`
   regardless of Issue liveness.
2. A finished worker with an unconsumed terminal report (HD-50: green ship
   report written, orchestrator merely hadn't read it yet) was still flagged
   dead by the 2x-silence branch.

### Reproduction Against The Unmodified Watcher (e26da07)

Fixture with two retired logs (no `workers.json` entry, mtimes -90000s /
-86000s) reproduced defect 1 verbatim:

```text
2026-07-11T03:57:21.946Z EVENT:dead HD-32 log HD-32-mono-implement-a1.jsonl silent for 90000s (over 2x stall threshold 120s) with no writer evidence
2026-07-11T03:57:21.946Z EVENT:dead HD-33 log HD-33-mono-ship-a1.jsonl silent for 86000s (over 2x stall threshold 120s) with no writer evidence
```

Defect 2 needed one refinement to reproduce: with a report strictly newer
than the log, the shared freshness check already suppressed the dead branch
(the MONO-6 case above). The false dead only fires under the realistic
terminal ordering where the CLI appends its final shutdown events to the
log *just after* the worker writes the report, leaving the report a hair
older than the log's last event (report -605s, log -600s):

```text
2026-07-11T03:57:43.912Z EVENT:dead HD-50 log HD-50-mono-ship-a1.jsonl silent for 600s (over 2x stall threshold 120s) with no writer evidence
```

### Fix (as amended by review)

- Log checks (stall AND dead) are scoped to Issues present in
  `workers.json` — the active registry. A log whose ISSUE-KEY has no
  registry entry is retired history and is skipped silently. Registry-side
  checks (entries without a live log, transport gating) are unchanged.
- Report suppression is hoisted above the stall/dead branching, so it
  covers stall, pid-gone dead, and 2x-silence dead alike (a completed
  worker's exited pid is its normal terminal state, not death). The watcher
  stays silent when a report for the same issue+stage is at least as fresh
  as the log's last event, or within one stall threshold behind it (the
  CLI tail-write tolerance above), AND not older than the log file's
  birthtime — a report predating the log's creation belongs to a prior
  attempt and proves nothing about this writer, so genuine retry deaths
  still fire even when the stale report is inside the grace window.

The first review round had grafted the grace window onto only the
2x-silence branch; review of that version found three gaps, each confirmed
by a probe below: false pid-gone dead for completed workers (P4), false
stall in the [1x,2x) window (P3), and a prior-attempt report permanently
masking a fast retry's death (P5).

### Fixture Runs Against The Fixed Watcher

Fixtures built in a temp dir by a throwaway script (not part of the repo),
one root per run, `--once` with default thresholds; stdout verbatim. Log
mtimes are aged via `fs.utimesSync`; log birthtimes are made realistic
(spawn well before the last event) via a double `utimesSync` — on
macOS/APFS setting mtime before the current birthtime lowers birthtime,
and a later second `utimesSync` raises only mtime.

Run 1 — retired logs without a registry entry (HD-32 mtime -90000s,
HD-33 mtime -86000s, `workers.json` = `{}`) → **silence**:

```text
(no output; exit 0)
```

Run 2 — silent logs of registry Issues with fresher terminal reports:
HD-50 (log birth -3600s / mtime -600s, report -300s — report strictly
newer) and HD-51 (log birth -3600s / mtime -600s, report -605s —
tail-write ordering) → **silence**:

```text
(no output; exit 0)
```

Run 3 — regression: active-registry silent logs with NO report, plus a
spawn failure → stall / dead / spawn-fail all still fire:

```text
2026-07-11T04:14:06.411Z EVENT:stall HD-60 log HD-60-mono-implement-a1.jsonl last event 200s ago (stall threshold 120s)
2026-07-11T04:14:06.411Z EVENT:dead HD-61 log HD-61-mono-implement-a1.jsonl silent for 500s (over 2x stall threshold 120s) with no writer evidence
2026-07-11T04:14:06.411Z EVENT:spawn-fail HD-62 first log line is not JSON: "Reading additional input from stdin..." (HD-62-mono-implement-a1.jsonl)
```

Run 4 — supplemental (live-case preservation): a registry Issue with
writer `pid: 999999` (gone), a -150s log and NO report still fires the
pid-gone dead, and a registry entry with `log: null` still fires the
registry dead:

```text
2026-07-11T04:14:06.475Z EVENT:dead HD-70 log HD-70-mono-implement-a1.jsonl silent for 150s and writer pid 999999 is gone
2026-07-11T04:14:06.475Z EVENT:dead HD-71 workers.json entry (stage mono-implement) has no live log file
```

Run 5 — review probes. P3: completed worker, no pid, log mtime -150s (in
the [1x,2x) stall window), report -155s → silent. P4: writer pid recorded
and gone, log mtime -150s, report -155s → silent. P5: retry log
`HD-82-...-a2.jsonl` with birth = mtime = -500s and a prior-attempt report
at -560s (inside the 120s grace window but older than the log's birth) →
dead fires:

```text
2026-07-11T04:14:06.539Z EVENT:dead HD-82 log HD-82-mono-implement-a2.jsonl silent for 500s (over 2x stall threshold 120s) with no writer evidence
```

The same run5 root against the pre-amendment version (grace in the
2x-silence branch only) shows all three gaps — false stall (P3), false
pid-gone dead (P4), and silence where P5's retry death must fire:

```text
2026-07-11T04:14:24.650Z EVENT:stall HD-80 log HD-80-mono-ship-a1.jsonl last event 168s ago (stall threshold 120s)
2026-07-11T04:14:24.650Z EVENT:dead HD-81 log HD-81-mono-ship-a1.jsonl silent for 168s and writer pid 999999 is gone
```

Verdict: retired-history false deads are silenced by registry scoping, and
completed-but-unconsumed workers are silent on every alarm path — stall,
pid-gone dead, and 2x-silence dead. For live registry Issues with no
qualifying report, stall, dead, and spawn-fail fire exactly as in MONO-1
(Runs 3-4), and the birthtime guard keeps prior-attempt reports from
masking retry deaths (P5). On filesystems without birthtime, `birthtimeMs`
degrades to 0 and the guard is a no-op, reverting to grace-window-only
suppression. Contract sentence pinned below is safe.
