#!/usr/bin/env node

// External heartbeat for `linear-orchestrate` (references/orchestration.md,
// "## Heartbeat"). Watches one orchestrator mailbox root and prints one
// stable line per worker liveness event to stdout:
//
//   <ISO time> EVENT:<stall|dead|spawn-fail> <ISSUE-KEY> <detail>
//
// Checks per scan (log checks apply only to Issues present in workers.json,
// the active registry; logs of retired Issues are history and are skipped
// silently):
//   (a) age of the last event of each logs/<ISSUE-KEY>-<stage>[-aN].jsonl
//       (file mtime) against --stall-sec -> stall;
//   (b) workers.json entries without a live log file -> dead;
//   (c) a log whose first line does not start with "{" -> spawn-fail,
//       immediately, without waiting for any age threshold;
//   (d) a log that stopped growing with no writer process evidence
//       (registry pid gone, or silent for 2x the stall threshold) -> dead.
// Stall and dead (both branches) are suppressed when a mailbox report for
// the same issue+stage shows the stage completed: report at least as fresh
// as the log's last event, or within one stall threshold behind it (the CLI
// appends its final shutdown events to the log just after the worker writes
// the report), and never older than the log file's creation time (a prior
// attempt's report proves nothing about a retry's writer).
//
// Read-only by contract: no LLM calls, no writes anywhere — it reads
// logs/*.jsonl, reports/*.json, and workers.json, and emits to stdout only
// (diagnostics go to stderr). Zero dependencies: node:fs/path/process.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_STALL_SEC = 120;
const MIN_STALL_SEC = 90;
const DEFAULT_REPEAT_SEC = 300;
const DEFAULT_INTERVAL_SEC = 15;
const FIRST_LINE_BYTES = 4096;
const DETAIL_SNIPPET_LENGTH = 80;

// <ISSUE-KEY>-<stage>.jsonl or <ISSUE-KEY>-<stage>-a<attempt>.jsonl,
// where <stage> itself may contain hyphens (e.g. linear-implement).
const LOG_NAME_PATTERN = /^([A-Za-z][A-Za-z0-9]*-\d+)-(.+?)(?:-a(\d+))?\.jsonl$/;

function usage(exitCode = 2) {
  console.error("Usage: node scripts/watch-workers.mjs --root <orchestrator-root> [options]");
  console.error("");
  console.error("Watch an orchestrator mailbox root (logs/, reports/, workers.json) and");
  console.error("print one line per worker liveness event to stdout:");
  console.error("  <ISO time> EVENT:<stall|dead|spawn-fail> <ISSUE-KEY> <detail>");
  console.error("");
  console.error("Options:");
  console.error("  --root <dir>        Orchestrator root, e.g. ~/.linear-agent-workflow/orchestrator/<product> (required)");
  console.error(`  --stall-sec <n>     Stall threshold in seconds (default ${DEFAULT_STALL_SEC}, minimum ${MIN_STALL_SEC})`);
  console.error(`  --repeat-sec <n>    Do not repeat the same event more often than this (default ${DEFAULT_REPEAT_SEC})`);
  console.error(`  --interval-sec <n>  Scan interval in seconds (default ${DEFAULT_INTERVAL_SEC})`);
  console.error("  --once              Run a single scan and exit");
  console.error("  --help, -h          Show this help and exit");
  process.exit(exitCode);
}

function expandHome(value) {
  if (value === "~" || value.startsWith("~/")) {
    const home = process.env.HOME;
    if (!home) return value;
    return path.join(home, value.slice(1));
  }
  return value;
}

function parsePositiveInt(flag, value) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || String(parsed) !== String(value).trim()) {
    console.error(`${flag} requires a positive integer, got: ${value}`);
    usage();
  }
  return parsed;
}

function parseArgs(argv) {
  const args = {
    root: null,
    stallSec: DEFAULT_STALL_SEC,
    repeatSec: DEFAULT_REPEAT_SEC,
    intervalSec: DEFAULT_INTERVAL_SEC,
    once: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      args.root = argv[(index += 1)];
    } else if (arg === "--stall-sec") {
      args.stallSec = parsePositiveInt(arg, argv[(index += 1)]);
    } else if (arg === "--repeat-sec") {
      args.repeatSec = parsePositiveInt(arg, argv[(index += 1)]);
    } else if (arg === "--interval-sec") {
      args.intervalSec = parsePositiveInt(arg, argv[(index += 1)]);
    } else if (arg === "--once") {
      args.once = true;
    } else if (arg === "--help" || arg === "-h") {
      usage(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      usage();
    }
  }
  if (!args.root) {
    console.error("--root is required (pass the orchestrator root explicitly).");
    usage();
  }
  if (args.stallSec < MIN_STALL_SEC) {
    console.error(`--stall-sec must be at least ${MIN_STALL_SEC} (got ${args.stallSec}); lower values misread normal turn gaps as stalls.`);
    process.exit(2);
  }
  args.root = path.resolve(expandHome(args.root));
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (!fs.existsSync(args.root) || !fs.statSync(args.root).isDirectory()) {
  console.error(`Orchestrator root is not a directory: ${args.root}`);
  process.exit(2);
}

const emittedAt = new Map();
const warnedOnce = new Set();

function warnOnce(message) {
  if (warnedOnce.has(message)) return;
  warnedOnce.add(message);
  console.error(`watch-workers: ${message}`);
}

function emitEvent(event, issueKey, detail, dedupKey, nowMs) {
  const last = emittedAt.get(dedupKey);
  if (last !== undefined && nowMs - last < args.repeatSec * 1000) return;
  emittedAt.set(dedupKey, nowMs);
  console.log(`${new Date(nowMs).toISOString()} EVENT:${event} ${issueKey} ${detail}`);
}

function truncateForDetail(text) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > DETAIL_SNIPPET_LENGTH ? `${flat.slice(0, DETAIL_SNIPPET_LENGTH)}...` : flat;
}

function readFirstLine(filePath) {
  let descriptor;
  try {
    descriptor = fs.openSync(filePath, "r");
  } catch {
    return null;
  }
  try {
    const buffer = Buffer.alloc(FIRST_LINE_BYTES);
    const bytesRead = fs.readSync(descriptor, buffer, 0, FIRST_LINE_BYTES, 0);
    if (bytesRead === 0) return null;
    const chunk = buffer.toString("utf8", 0, bytesRead);
    const newlineIndex = chunk.indexOf("\n");
    return newlineIndex >= 0 ? chunk.slice(0, newlineIndex) : chunk;
  } finally {
    fs.closeSync(descriptor);
  }
}

function loadRegistry(registryPath) {
  if (!fs.existsSync(registryPath)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    warnOnce(`workers.json is not an object map: ${registryPath}`);
  } catch {
    warnOnce(`workers.json could not be parsed: ${registryPath}`);
  }
  return {};
}

// "alive" / "dead" when the registry records a writer pid, "unknown" otherwise.
function writerPidState(registryEntry) {
  const pid = registryEntry && Number.isInteger(registryEntry.pid) ? registryEntry.pid : null;
  if (!pid || pid <= 0) return "unknown";
  try {
    process.kill(pid, 0);
    return "alive";
  } catch (error) {
    return error.code === "EPERM" ? "alive" : "dead";
  }
}

function collectLatestLogs(logsDir) {
  let names = [];
  try {
    names = fs.readdirSync(logsDir);
  } catch {
    warnOnce(`logs directory not found yet: ${logsDir}`);
    return new Map();
  }

  const latestByIssue = new Map();
  for (const name of names) {
    const match = name.match(LOG_NAME_PATTERN);
    if (!match) continue;
    const filePath = path.join(logsDir, name);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;
    const log = { issue: match[1], stage: match[2], attempt: match[3] ? Number(match[3]) : null, name, filePath, stat };
    const current = latestByIssue.get(log.issue);
    if (!current || stat.mtimeMs > current.stat.mtimeMs) latestByIssue.set(log.issue, log);
  }
  return latestByIssue;
}

function reportMtimeMs(reportsDir, log) {
  const reportPath = path.join(reportsDir, `${log.issue}-${log.stage}.json`);
  try {
    return fs.statSync(reportPath).mtimeMs;
  } catch {
    return null;
  }
}

function checkLog(log, reportsDir, registry, nowMs) {
  const firstLine = readFirstLine(log.filePath);
  if (firstLine !== null && !firstLine.trimStart().startsWith("{")) {
    // A non-JSON first line means the spawn command itself failed (e.g. the
    // CLI fell into interactive stdin mode); report it immediately.
    emitEvent(
      "spawn-fail",
      log.issue,
      `first log line is not JSON: "${truncateForDetail(firstLine)}" (${log.name})`,
      `spawn-fail:${log.name}`,
      nowMs
    );
    return;
  }

  const ageSec = Math.round((nowMs - log.stat.mtimeMs) / 1000);
  if (ageSec < args.stallSec) return;

  // A worker that exited normally leaves a mailbox report for this stage —
  // at least as fresh as the log's last event, or within one stall threshold
  // behind it (the CLI appends its final shutdown events to the log just
  // after the worker writes the report). That is the normal advance signal,
  // not a liveness event, so it suppresses stall and both dead branches: a
  // completed worker's exited pid is its normal terminal state, not death.
  // The birthtime guard keeps a prior attempt's report from masking a fresh
  // retry log: a report older than this log file's creation belongs to an
  // earlier attempt and proves nothing about this writer.
  const reportMs = reportMtimeMs(reportsDir, log);
  if (reportMs !== null && reportMs >= log.stat.birthtimeMs && reportMs >= log.stat.mtimeMs - args.stallSec * 1000) return;

  const pidState = writerPidState(registry[log.issue]);
  if (pidState === "dead") {
    emitEvent(
      "dead",
      log.issue,
      `log ${log.name} silent for ${ageSec}s and writer pid ${registry[log.issue].pid} is gone`,
      `dead:${log.name}`,
      nowMs
    );
  } else if (pidState !== "alive" && ageSec >= args.stallSec * 2) {
    emitEvent(
      "dead",
      log.issue,
      `log ${log.name} silent for ${ageSec}s (over 2x stall threshold ${args.stallSec}s) with no writer evidence`,
      `dead:${log.name}`,
      nowMs
    );
  } else {
    emitEvent(
      "stall",
      log.issue,
      `log ${log.name} last event ${ageSec}s ago (stall threshold ${args.stallSec}s)`,
      `stall:${log.name}`,
      nowMs
    );
  }
}

function checkRegistry(registry, nowMs) {
  for (const [issueKey, entry] of Object.entries(registry)) {
    // Log-based liveness only applies to codex-cli workers: desktop and
    // fallback transports have no JSONL log by design and are monitored
    // through their own runtime signals.
    if (entry?.transport && entry.transport !== "codex-cli") continue;
    const logPath = entry && typeof entry.log === "string" ? path.resolve(expandHome(entry.log)) : null;
    if (!logPath || !fs.existsSync(logPath)) {
      emitEvent(
        "dead",
        issueKey,
        `workers.json entry (stage ${entry?.stage ?? "unknown"}) has no live log file`,
        `dead:registry:${issueKey}`,
        nowMs
      );
    }
  }
}

function scan() {
  const nowMs = Date.now();
  const registry = loadRegistry(path.join(args.root, "workers.json"));
  const latestLogs = collectLatestLogs(path.join(args.root, "logs"));
  const reportsDir = path.join(args.root, "reports");
  for (const log of latestLogs.values()) {
    // The watcher observes the active registry, not the directory's history:
    // only Issues present in workers.json are live workers. Logs whose
    // ISSUE-KEY has no registry entry belong to retired Issues and are
    // skipped silently instead of flooding EVENT:dead on every scan.
    if (!Object.prototype.hasOwnProperty.call(registry, log.issue)) continue;
    checkLog(log, reportsDir, registry, nowMs);
  }
  checkRegistry(registry, nowMs);
}

console.error(
  `watch-workers: root=${args.root} stall-sec=${args.stallSec} repeat-sec=${args.repeatSec} interval-sec=${args.intervalSec}${args.once ? " once" : ""}`
);

scan();
if (!args.once) {
  setInterval(scan, args.intervalSec * 1000);
}
