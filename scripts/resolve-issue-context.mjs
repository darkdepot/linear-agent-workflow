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
const ISSUE_ONLY_LABEL = "issue-only";
const RISK_CLASSES = ["tiny", "standard", "deep", "risky"];
// Phase-1 eligibility envelope for the issue-only lane. deep/risky stays
// project-first until the Phase-3 safety modules land (see plan 015 README).
const LANE_ELIGIBLE_RISK = ["tiny", "standard"];
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
    "Usage: node scripts/resolve-issue-context.mjs --issue <path> [--marker <path>] [--config <path>] [--label <names>] [--approval-verified <fp>] [--emit-fingerprint]"
  );
  console.error("");
  console.error("Options:");
  console.error("  --issue <path>          Issue body markdown (required)");
  console.error("  --marker <path>         Marker source; defaults to the issue body when omitted");
  console.error("  --config <path>         Project config JSON; validated when provided");
  console.error("  --label <names>         Trusted, caller-verified Linear labels on the Issue (comma/space separated)");
  console.error("  --approval-verified <fp>  Caller-verified owner-approval fingerprint from the authenticated Linear comment");
  console.error("  --emit-fingerprint      Print the computed scope fingerprint for --issue and exit");
  console.error("  --help, -h              Show this help and exit");
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = { issue: "", marker: "", config: "", label: "", approvalVerified: "", emitFingerprint: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--issue") {
      args.issue = argv[++index] || "";
    } else if (arg === "--marker") {
      args.marker = argv[++index] || "";
    } else if (arg === "--config") {
      args.config = argv[++index] || "";
    } else if (arg === "--label") {
      args.label = argv[++index] || "";
    } else if (arg === "--approval-verified") {
      args.approvalVerified = argv[++index] || "";
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
// Fenced code blocks are honored: a `# comment` line inside a ``` / ~~~ fence is
// NOT a heading, so a shell snippet in a section never truncates it and drops the
// rest of the scope out of the fingerprint.
function extractSection(text, headingRe) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let capturing = false;
  let inFence = false;
  for (const line of lines) {
    if (/^\s*(?:```|~~~)/.test(line)) {
      inFence = !inFence;
      if (capturing) out.push(line);
      continue;
    }
    const heading = !inFence && /^(#{1,6})\s+(.*)$/.exec(line);
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

// Deterministic scope fingerprint = sha256 over the FULL normalized Issue
// contract, not just acceptance + verify: objective, scope/what-to-do, desired
// behavior, acceptance criteria, verification instructions, non-goals, and the
// review-gate risk classification. This is must-fix #3 — an approval must never
// survive a change to the objective, scope, non-goals, or the recorded risk,
// only to the acceptance/verify text. Including the review-gate means an Issue
// reclassified standard→deep/risky invalidates its old marker. Missing sections
// contribute a stable empty part, so the hash stays deterministic. Truncated for
// a human-readable marker; determinism is preserved.
const CONTRACT_SECTION_RES = [
  /(?:цель pr|objective|goal)/i,
  /(?:что сделать|scope|what to do)/i,
  /(?:желаемое поведение|desired behaviou?r)/i,
  /(?:критерии приёмки|критерии приемки|acceptance)/i,
  /(?:как проверить|how to verify|verify)/i,
  /(?:что не входит|non-goals|out of scope)/i,
  /(?:ревью-гейт|ревью гейт|review gate)/i,
];

function computeScope(issueText) {
  const acceptanceLines = extractSection(issueText, /(?:критерии приёмки|критерии приемки|acceptance)/i);
  const verifyLines = extractSection(issueText, /(?:как проверить|how to verify|verify)/i);
  const acceptanceIds = parseAcceptanceIds(acceptanceLines);
  const verifySteps = parseVerifySteps(verifyLines);
  const parts = CONTRACT_SECTION_RES.map((re) => normalizeLines(extractSection(issueText, re)));
  const fingerprint = crypto
    .createHash("sha256")
    .update(parts.join("\n---\n"))
    .digest("hex")
    .slice(0, 12);
  return { acceptanceIds, verifySteps, fingerprint };
}

// Read (never re-derive) the authoritative risk class recorded in the Issue's
// review-gate section. When the gate names more than one class (a "standard→deep"
// re-tier), the HIGHEST wins — ambiguity moves upward, never downward. Returns
// null when the section names no known class. The marker's Risk class field is
// then required to match this, so the marker cannot silently downgrade the Issue.
function extractReviewGateClass(issueText) {
  const text = normalizeLines(
    extractSection(issueText, /(?:ревью-гейт|ревью гейт|review gate)/i)
  ).toLowerCase();
  let found = null;
  for (const cls of RISK_CLASSES) {
    if (new RegExp(`\\b${cls}\\b`).test(text)) found = cls;
  }
  return found;
}

// Locate the most-recent marker block (most-recent-wins) and parse its contiguous
// "Key: value" fields. The marker line must stand ALONE on its own line — a mere
// prose mention of "linear-issue-only marker" (e.g. an Issue documenting the
// convention) is not a marker, so such an Issue still resolves to project-first.
// Returns null when no standalone marker line is present.
function findMarkerBlock(markerText) {
  const lines = markerText.split(/\r?\n/);
  let markerIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim() === MARKER_LINE) markerIdx = i;
  }
  if (markerIdx < 0) return null;
  const fields = {};
  const seen = new Set();
  let started = false;
  for (let i = markerIdx + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line === "" || /^(?:```|~~~)/.test(line)) {
      if (started) break;
      continue;
    }
    // Parse ANY field-shaped line — the key may hold letters, digits, spaces,
    // underscores, or hyphens — so a sixth field can never hide by using a
    // character the parser would otherwise skip past as end-of-block.
    const kv = /^([A-Za-z][A-Za-z0-9 _-]*?):\s*(.*)$/.exec(line);
    if (!kv) {
      // Inside the machine block, a nonblank line that is not a field is a
      // malformed marker — never an implicit terminator that could hide a sixth
      // field spelled with punctuation the key charset excludes (e.g. "Notes.v2:").
      if (started) violation(`broken marker: unparseable line "${line}"`);
      continue;
    }
    started = true;
    const key = kv[1].trim();
    const norm = normalizeKey(key);
    // A repeated field is ambiguous — a second value can mask the first (a
    // second "Risk class: standard" hiding a first "Risk class: deep"); reject.
    if (seen.has(norm)) violation(`broken marker: duplicate field "${key}"`);
    seen.add(norm);
    fields[key] = kv[2].trim();
  }
  return fields;
}

function normalizeKey(key) {
  return key.toLowerCase().replace(/[-_\s]+/g, " ").trim();
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

function resolve(args) {
  const issueText = readFileOrFail(args.issue, "issue body");

  // Optional config. Fail-closed on unreadable/invalid config. An explicit
  // opt-out (issueOnlyLane.enabled === false) short-circuits to project-first
  // before any marker is trusted.
  let config = null;
  if (args.config) {
    config = readConfig(args.config);
    if (config && Object.prototype.hasOwnProperty.call(config, "issueOnlyLane")) {
      const lane = config.issueOnlyLane;
      // Fail closed on a malformed opt-out: a stringly-typed `"false"` must never
      // be mistaken for "not disabled" and quietly enable the lane.
      if (typeof lane !== "object" || lane === null || typeof lane.enabled !== "boolean") {
        violation("invalid config: issueOnlyLane must be an object with a boolean `enabled`");
      }
      if (lane.enabled === false) {
        return projectFirstResult();
      }
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

  // The marker's Risk class must MATCH the Issue's authoritative review-gate
  // class — the marker records the existing class, it never re-derives or
  // downgrades it. A marker claiming a lower class than the Issue's review-gate
  // (e.g. "standard" on a deep Issue) is rejected, closing the risk-downgrade
  // bypass of the Phase-1 envelope.
  const reviewGateClass = extractReviewGateClass(issueText);
  if (reviewGateClass === null) {
    violation("broken marker: issue body has no review-gate risk class to verify the marker against");
  }
  if (riskClass !== reviewGateClass) {
    violation(`broken marker: marker Risk class "${riskClass}" does not match the Issue review-gate class "${reviewGateClass}"`);
  }

  const scope = computeScope(issueText);
  // The behavioral oracle must be non-vacuous: an issue-only package proves
  // itself by its own acceptance criteria and verify steps, so the Issue must
  // carry at least one stable acceptance ID and at least one verify step. This
  // also rejects a marker whose "Acceptance IDs: ," parses to an empty list.
  if (scope.acceptanceIds.length === 0 || scope.verifySteps.length === 0) {
    violation("broken marker: issue-only requires at least one acceptance ID and one verify step");
  }

  const markerAcceptanceIds = parseIdList(normalizedKeys.get("acceptance ids"));
  if (!sameIdSet(markerAcceptanceIds, scope.acceptanceIds)) {
    violation("broken marker: acceptance IDs do not match issue body");
  }

  const markerFingerprint = normalizedKeys.get("scope fingerprint");
  if (markerFingerprint !== scope.fingerprint) {
    violation(`stale marker: scope fingerprint mismatch (marker ${markerFingerprint} vs body ${scope.fingerprint})`);
  }

  // Phase-1 eligibility envelope — checked only AFTER every integrity gate above,
  // so a corrupt deep/risky marker (stale fingerprint, mismatched acceptance IDs)
  // still hard-fails rather than silently falling back. A structurally valid
  // marker recording deep/risky is not corrupt — it is out of the envelope, so it
  // resolves to the safe project-first lane. deep/risky keeps full ceremony until
  // the Phase-3 safety modules land.
  if (!LANE_ELIGIBLE_RISK.includes(riskClass)) {
    return projectFirstResult();
  }

  // Second, human-visible opt-in factor: the verified `issue-only` Linear label.
  // The marker is machine-authoritative; the label is the filterable owner-facing
  // signal. `--label` is trusted input the caller supplies after reading Linear;
  // when the label is absent or unverified, the lane fails closed to
  // project-first. Atomically writing marker+label is the create-then-approve
  // intake transaction's job (a later slice).
  const verifiedLabels = new Set(parseIdList(args.label));
  if (!verifiedLabels.has(ISSUE_ONLY_LABEL)) {
    return projectFirstResult();
  }

  // Owner start-approval must be present AND fresh AND caller-verified. The
  // marker's Approval token is self-attested text; on its own it proves nothing.
  // `--approval-verified` is the fingerprint the caller confirmed against the
  // authenticated owner comment in Linear (the create-then-approve receipt). The
  // lane activates only when the marker's recorded approval, the live scope
  // fingerprint, and the caller-verified fingerprint all agree; anything else
  // (absent, stale/superseded, or unverified) fails closed to project-first. The
  // resolver enforces freshness and provenance-agreement; owner authenticity is
  // established upstream by the create-then-approve intake transaction.
  const markerApproval = (normalizedKeys.get("approval") || "").trim().split(/\s+/)[0] || "";
  const approvalFresh =
    markerApproval === scope.fingerprint && args.approvalVerified === scope.fingerprint;
  if (!approvalFresh) {
    return projectFirstResult();
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
    approval_status: "approved-fresh",
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
