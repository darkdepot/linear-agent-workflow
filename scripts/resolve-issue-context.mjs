#!/usr/bin/env node

// Deterministic issue-only lane context resolver.
//
// Reads {issue body, marker, config} and prints the normative 5-field context
// contract as JSON to stdout. It is the seam that every issue-only-lane consumer
// reads FIRST. See references/issue-only-lane.md for the contract.
//
// It is NOT a spine-resolver: it emits no assurance vector, no route-record, and
// no required_artifacts. The marker it reads is a lightweight approval receipt,
// not a route-record ("маркер ≠ route-record").
//
// Fail-closed invariant: no usable marker ⇒ package_kind=project-first. A marker
// that is present but integrity-invalid (broken structure or a stale scope
// fingerprint) ⇒ process.exit(1); it is never silently resolved as issue-only.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const MARKER_LINE = "linear-issue-only marker";
const MARKER_VERSION = 1;
const RISK_CLASSES = ["tiny", "standard", "deep", "risky"];
const REQUIRED_MARKER_FIELDS = [
  "Marker version",
  "Scope fingerprint",
  "Acceptance IDs",
  "Risk class",
  "Approval",
];
// The marker is not a route-record. These fields belong to the spine, not here.
const FORBIDDEN_MARKER_KEYS = ["route revision", "assurance vector", "required artifacts"];

function usage(exitCode = 2) {
  console.error(
    "Usage: node scripts/resolve-issue-context.mjs --issue <path> [--marker <path>] [--config <path>] [--emit-fingerprint]"
  );
  console.error("");
  console.error("Options:");
  console.error("  --issue <path>       Issue body markdown (required)");
  console.error("  --marker <path>      Marker source; defaults to the issue body when omitted");
  console.error("  --config <path>      Project config JSON; validated when provided");
  console.error("  --emit-fingerprint   Print the computed scope fingerprint for --issue and exit");
  console.error("  --help, -h           Show this help and exit");
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = { issue: "", marker: "", config: "", emitFingerprint: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--issue") {
      args.issue = argv[++index] || "";
    } else if (arg === "--marker") {
      args.marker = argv[++index] || "";
    } else if (arg === "--config") {
      args.config = argv[++index] || "";
    } else if (arg === "--emit-fingerprint") {
      args.emitFingerprint = true;
    } else if (arg === "--help" || arg === "-h") {
      usage(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      usage();
    }
  }
  if (!args.issue) usage();
  args.issue = path.resolve(args.issue);
  if (args.marker) args.marker = path.resolve(args.marker);
  if (args.config) args.config = path.resolve(args.config);
  return args;
}

// Single-line, stable violation message → stderr, then hard-fail. Downstream
// fixtures and consumers pin on "issue-only-lane: broken marker" and
// "issue-only-lane: stale marker".
function violation(message) {
  console.error(`issue-only-lane: ${message}`);
  process.exit(1);
}

function readFileOrFail(filePath, label) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    violation(`cannot read ${label}: ${filePath} (${error.code || error.message})`);
    return ""; // unreachable
  }
}

// Extract the content lines of the first flat section whose heading matches.
function extractSection(text, headingRe) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let capturing = false;
  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      if (capturing) break; // any subsequent heading ends the flat section
      if (headingRe.test(heading[2])) capturing = true;
      continue;
    }
    if (capturing) out.push(line);
  }
  return out;
}

function normalizeLines(lines) {
  return lines
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

function parseAcceptanceIds(lines) {
  const ids = [];
  const seen = new Set();
  for (const match of normalizeLines(lines).matchAll(/\bAC\d+\b/g)) {
    if (!seen.has(match[0])) {
      seen.add(match[0]);
      ids.push(match[0]);
    }
  }
  return ids;
}

function parseVerifySteps(lines) {
  const steps = [];
  for (const line of lines) {
    const item = /^\s*(?:[-*]|\d+[.)])\s+(.*\S)\s*$/.exec(line);
    if (item) steps.push(item[1].replace(/\s+/g, " ").trim());
  }
  return steps;
}

// Deterministic scope fingerprint = sha256 over the normalized acceptance and
// verify sections, aligned with the design's oracle_revision definition
// (hash of normalized "Критерии приемки" + "Как проверить"). Truncated for
// human-readable markers; determinism is preserved.
function computeScope(issueText) {
  const acceptanceLines = extractSection(issueText, /(?:критерии приемки|acceptance)/i);
  const verifyLines = extractSection(issueText, /(?:как проверить|how to verify|verify)/i);
  const acceptanceNorm = normalizeLines(acceptanceLines);
  const verifyNorm = normalizeLines(verifyLines);
  const acceptanceIds = parseAcceptanceIds(acceptanceLines);
  const verifySteps = parseVerifySteps(verifyLines);
  const hasScope = acceptanceNorm.length > 0 || verifyNorm.length > 0;
  const fingerprint = crypto
    .createHash("sha256")
    .update(`${acceptanceNorm}\n---\n${verifyNorm}`)
    .digest("hex")
    .slice(0, 12);
  return { acceptanceIds, verifySteps, fingerprint, hasScope };
}

// Locate the most-recent marker block (most-recent-wins) and parse its
// contiguous "Key: value" fields. Returns null when no marker line is present.
function findMarkerBlock(markerText) {
  const idx = markerText.lastIndexOf(MARKER_LINE);
  if (idx < 0) return null;
  const rest = markerText.slice(idx + MARKER_LINE.length).split(/\r?\n/);
  const fields = {};
  let started = false;
  for (const rawLine of rest) {
    const line = rawLine.trim();
    if (line === "" || /^(?:```|~~~)/.test(line)) {
      if (started) break;
      continue;
    }
    const kv = /^([A-Za-z][A-Za-z _]*?):\s*(.*)$/.exec(line);
    if (!kv) {
      if (started) break;
      continue;
    }
    started = true;
    fields[kv[1].trim()] = kv[2].trim();
  }
  return fields;
}

function normalizeKey(key) {
  return key.toLowerCase().replace(/[_\s]+/g, " ").trim();
}

function parseIdList(value) {
  return value
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function sameIdSet(a, b) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((entry) => set.has(entry));
}

function readConfig(configPath) {
  const raw = readFileOrFail(configPath, "config");
  try {
    return JSON.parse(raw);
  } catch (error) {
    violation(`invalid config JSON: ${configPath} (${error.message})`);
    return null; // unreachable
  }
}

function projectFirstResult() {
  return {
    package_kind: "project-first",
    lifecycle_state_entity: "project",
    behavioral_oracle: null,
    risk_class: null,
    approval_status: "absent",
  };
}

function resolveApprovalStatus(approvalValue, fingerprint) {
  const firstToken = approvalValue.trim().split(/\s+/)[0] || "";
  if (firstToken === "" || /^none$/i.test(firstToken)) return "absent";
  return firstToken === fingerprint ? "approved-fresh" : "stale";
}

function resolve(args) {
  const issueText = readFileOrFail(args.issue, "issue body");

  // Optional config. Fail-closed on unreadable/invalid config. An explicit
  // opt-out (issueOnlyLane.enabled === false) short-circuits to project-first
  // before any marker is trusted.
  let config = null;
  if (args.config) {
    config = readConfig(args.config);
    if (config && config.issueOnlyLane && config.issueOnlyLane.enabled === false) {
      return projectFirstResult();
    }
  }

  const markerText = args.marker ? readFileOrFail(args.marker, "marker") : issueText;
  const marker = findMarkerBlock(markerText);

  // No usable marker ⇒ project-first (fail-closed). Never silently issue-only.
  if (marker === null) return projectFirstResult();

  const normalizedKeys = new Map();
  for (const key of Object.keys(marker)) normalizedKeys.set(normalizeKey(key), marker[key]);

  // The marker is not a route-record.
  for (const forbidden of FORBIDDEN_MARKER_KEYS) {
    if (normalizedKeys.has(forbidden)) {
      violation(`broken marker: forbidden route-record field "${forbidden}" (маркер ≠ route-record)`);
    }
  }

  // EXACTLY these five, no more (references/issue-only-lane.md). Any other parsed
  // field is a hard violation, so the marker can never quietly grow a sixth field
  // beyond the 5-field contract and stay silently issue-only.
  const allowedKeys = new Set(REQUIRED_MARKER_FIELDS.map(normalizeKey));
  for (const key of normalizedKeys.keys()) {
    if (!allowedKeys.has(key)) {
      violation(`broken marker: unknown field "${key}" (marker carries exactly the five contract fields)`);
    }
  }

  for (const field of REQUIRED_MARKER_FIELDS) {
    if (!normalizedKeys.has(normalizeKey(field)) || normalizedKeys.get(normalizeKey(field)) === "") {
      violation(`broken marker: missing field "${field}"`);
    }
  }

  const versionRaw = normalizedKeys.get("marker version");
  if (String(Number(versionRaw)) !== String(versionRaw) || Number(versionRaw) !== MARKER_VERSION) {
    violation(`broken marker: unsupported marker version "${versionRaw}" (expected ${MARKER_VERSION})`);
  }

  const riskClass = normalizedKeys.get("risk class");
  if (!RISK_CLASSES.includes(riskClass)) {
    violation(`broken marker: invalid risk class "${riskClass}" (expected one of ${RISK_CLASSES.join(", ")})`);
  }

  const scope = computeScope(issueText);
  if (!scope.hasScope) {
    violation("broken marker: issue body has no acceptance or verify scope to fingerprint");
  }

  const markerAcceptanceIds = parseIdList(normalizedKeys.get("acceptance ids"));
  if (!sameIdSet(markerAcceptanceIds, scope.acceptanceIds)) {
    violation("broken marker: acceptance IDs do not match issue body");
  }

  const markerFingerprint = normalizedKeys.get("scope fingerprint");
  if (markerFingerprint !== scope.fingerprint) {
    violation(`stale marker: scope fingerprint mismatch (marker ${markerFingerprint} vs body ${scope.fingerprint})`);
  }

  return {
    package_kind: "issue-only",
    lifecycle_state_entity: "issue",
    behavioral_oracle: {
      kind: "issue-verification",
      acceptance_ids: scope.acceptanceIds,
      verify_steps: scope.verifySteps,
    },
    risk_class: riskClass,
    approval_status: resolveApprovalStatus(normalizedKeys.get("approval"), scope.fingerprint),
  };
}

const args = parseArgs(process.argv.slice(2));

if (args.emitFingerprint) {
  const issueText = readFileOrFail(args.issue, "issue body");
  process.stdout.write(`${computeScope(issueText).fingerprint}\n`);
  process.exit(0);
}

const result = resolve(args);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exit(0);
