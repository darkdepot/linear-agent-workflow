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

// Normative-section heading matchers, ANCHORED at the start of the heading text
// so the English alternatives cannot overlap: unanchored `goal`/`scope` would
// match "Non-goals"/"Out of scope" and miscount them as behavior. Anchoring alone
// (no `\b`, which mishandles Cyrillic) excludes the negative headings. One source
// of truth, reused by the fingerprint, the oracle, completeness, and risk read.
const SECTION_RE = {
  objective: /^(?:цель pr|objective|goals?)/i,
  scope: /^(?:что сделать|scope|what to do)/i,
  desired: /^(?:желаемое поведение|desired behaviou?r)/i,
  acceptance: /^(?:критерии приёмки|критерии приемки|acceptance)/i,
  verify: /^(?:как проверить|how to verify|verify)/i,
  nonGoals: /^(?:что не входит|non-goals|out of scope)/i,
  reviewGate: /^(?:ревью-гейт|ревью гейт|review gate)/i,
};

// Strict positive-behavior heading matchers (exact heading, optional trailing
// colon) for the self-contained completeness gate ONLY, so a negative heading
// like "Scope exclusions" is never miscounted as described behavior. The
// fingerprint deliberately keeps the looser SECTION_RE matching so all scope-ish
// content is still hashed even under an unusual heading.
const BEHAVIOR_HEADING_RES = [
  /^(?:цель pr|objective|goals?)\s*:?\s*$/i,
  /^(?:что сделать|scope|what to do)\s*:?\s*$/i,
  /^(?:желаемое поведение|desired behaviou?rs?)\s*:?\s*$/i,
];

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

// CommonMark-ish fenced-block tracking. A fence opens with >=3 backticks or
// tildes; it closes ONLY on a bare line of the SAME character at >= the opening
// length. A mismatched or shorter fence inside the block (e.g. ~~~ inside ```) is
// content, not a close — so it can't prematurely re-expose headings.
function fenceTransition(line, open) {
  const match = /^\s*(`{3,}|~{3,})\s*(.*)$/.exec(line);
  if (!match) return open;
  const char = match[1][0];
  const len = match[1].length;
  if (open === null) return { char, len };
  if (char === open.char && len >= open.len && match[2].trim() === "") return null;
  return open;
}

// Extract the content lines of EVERY section whose heading matches, including
// nested subsections, across the whole document. Three structures are honored so
// nothing normative silently escapes the fingerprint:
//   - Fenced code blocks (type/length-aware): a `# comment` inside a fence is not
//     a heading, so a snippet never truncates the section.
//   - Heading depth: a sibling or shallower heading ends the current section, but
//     a DEEPER (nested) heading and its content stay in.
//   - Duplicates: a second matching heading re-opens capture, so both sections'
//     content is included — a duplicate normative section is never dropped.
function extractSection(text, headingRe) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let capturing = false;
  let capturedDepth = 0;
  let fence = null;
  for (const line of lines) {
    const nextFence = fenceTransition(line, fence);
    if (nextFence !== fence) {
      fence = nextFence; // this line opened or closed a fenced block
      if (capturing) out.push(line);
      continue;
    }
    if (fence) {
      if (capturing) out.push(line); // fenced content, never a heading
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const depth = heading[1].length;
      if (capturing) {
        if (depth > capturedDepth) {
          out.push(line); // nested heading stays in the section
          continue;
        }
        capturing = false; // sibling/shallower heading ends the current section
      }
      if (headingRe.test(heading[2])) {
        capturing = true; // (re-)open on any matching heading, so duplicates count
        capturedDepth = depth;
      }
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

// Fingerprint-grade normalization: preserve SEMANTIC indentation (nested lists,
// fenced Python/YAML). Only strip trailing whitespace, collapse runs of blank
// lines to one, and drop leading/trailing blanks — so a meaning-changing
// re-indentation changes the fingerprint, closing a scope-drift bypass that a
// whitespace-collapsing normalizer would leave open.
function normalizeForFingerprint(lines) {
  const out = [];
  for (const raw of lines) {
    const line = raw.replace(/[ \t]+$/g, "");
    if (line === "" && (out.length === 0 || out[out.length - 1] === "")) continue;
    out.push(line);
  }
  while (out.length && out[out.length - 1] === "") out.pop();
  return out.join("\n");
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

// Parse verify steps WITHOUT losing multi-line content and WITHOUT mis-splitting:
// only a TOP-LEVEL list item starts a new step; nested (indented) items, fenced
// command blocks, and plain continuations attach to the current step, and a bare
// command block with no list becomes a single step. Classification is on the raw
// line (indentation preserved) with fence state tracked, so a "1." inside a code
// block is content, not a step boundary.
function parseVerifySteps(lines) {
  const steps = [];
  let current = null;
  let fence = null;
  const flush = () => {
    if (current !== null) {
      const text = current.replace(/\s+/g, " ").trim();
      if (text) steps.push(text);
    }
    current = null;
  };
  for (const raw of lines) {
    const nextFence = fenceTransition(raw, fence);
    if (nextFence !== fence) {
      fence = nextFence; // fence marker line: skip, stay in the current step
      continue;
    }
    if (fence) {
      const inner = raw.trim();
      if (inner !== "") current = current === null ? inner : `${current} ${inner}`;
      continue;
    }
    const topItem = /^(?:[-*]|\d+[.)])\s+(.*)$/.exec(raw);
    if (topItem) {
      flush();
      current = topItem[1];
      continue;
    }
    const rest = raw.trim();
    if (rest === "") continue;
    current = current === null ? rest : `${current} ${rest}`;
  }
  flush();
  return steps;
}

// Substantive = a non-blank line that is not merely a fence marker, so an empty
// fenced block never counts as content.
function hasSubstantiveContent(lines) {
  return lines.some((line) => {
    const trimmed = line.trim();
    return trimmed !== "" && !/^(?:```|~~~)/.test(trimmed);
  });
}

// True when the Issue has a positive-behavior section (EXACT heading) with
// substantive content. Reuses extractSection so it inherits the same fenced-block,
// heading-depth, and nested-subsection handling — no bespoke re-scan to drift out
// of sync (a negative heading like "Scope exclusions" cannot satisfy it, a nested
// subsection under the heading still counts, and an empty fence does not).
function hasDescribedBehavior(text) {
  return BEHAVIOR_HEADING_RES.some((re) => hasSubstantiveContent(extractSection(text, re)));
}

// Deterministic scope fingerprint = full sha256 over the normalized Issue
// contract: objective, scope/what-to-do, desired behavior, acceptance criteria,
// verification instructions, non-goals, and the review-gate risk classification.
// This is must-fix #3 — an approval must never survive a change to the objective,
// scope, non-goals, or recorded risk, only to the acceptance/verify text.
// Including the review-gate means an Issue reclassified standard→deep/risky
// invalidates its old marker. Missing sections contribute a stable empty part.
const CONTRACT_SECTION_RES = [
  SECTION_RE.objective,
  SECTION_RE.scope,
  SECTION_RE.desired,
  SECTION_RE.acceptance,
  SECTION_RE.verify,
  SECTION_RE.nonGoals,
  SECTION_RE.reviewGate,
];

function computeScope(issueText) {
  // Strip the marker block first: when the marker is inline (--marker defaults to
  // the issue body), hashing the body verbatim would fold the marker's own
  // fingerprint field into a section, so the fingerprint emitted before the marker
  // is written would never match afterwards. A separate-comment marker leaves the
  // body unchanged.
  const body = stripMarkerBlock(issueText);
  const acceptanceLines = extractSection(body, SECTION_RE.acceptance);
  const verifyLines = extractSection(body, SECTION_RE.verify);
  const acceptanceIds = parseAcceptanceIds(acceptanceLines);
  const verifySteps = parseVerifySteps(verifyLines);
  // Indentation-preserving normalization so semantic whitespace changes the hash,
  // and the FULL sha256 (no truncation) — a 48-bit truncation is a practical
  // collision target for the approval trust boundary.
  const parts = CONTRACT_SECTION_RES.map((re) => normalizeForFingerprint(extractSection(body, re)));
  // Canonical, unambiguous section encoding — a literal "---" inside a section
  // cannot shuffle text across normative fields while preserving the hash.
  const fingerprint = crypto.createHash("sha256").update(JSON.stringify(parts)).digest("hex");
  // A self-contained issue-only package must describe its behavior (objective /
  // scope / desired behavior) and its non-goals — not just acceptance + verify.
  const nonGoalsText = normalizeLines(extractSection(body, SECTION_RE.nonGoals));
  return {
    acceptanceIds,
    verifySteps,
    fingerprint,
    hasBehavior: hasDescribedBehavior(body),
    hasNonGoals: nonGoalsText.length > 0,
  };
}

// Read (never re-derive) the authoritative risk class recorded in the Issue's
// review-gate section. When the gate names more than one class (a "standard→deep"
// re-tier), the HIGHEST wins — ambiguity moves upward, never downward. Returns
// null when the section names no known class. The marker's Risk class field is
// then required to match this, so the marker cannot silently downgrade the Issue.
function extractReviewGateClass(issueText) {
  const text = normalizeLines(
    extractSection(stripMarkerBlock(issueText), SECTION_RE.reviewGate)
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
  let fence = null;
  for (let i = 0; i < lines.length; i += 1) {
    const nextFence = fenceTransition(lines[i], fence);
    if (nextFence !== fence) {
      fence = nextFence;
      continue;
    }
    // A marker line inside a fenced code block is a documentation EXAMPLE, not an
    // opt-in — only a standalone line outside any fence is a real marker.
    if (!fence && lines[i].trim() === MARKER_LINE) markerIdx = i;
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
      // A nonblank line inside the machine block that is not a field is a
      // malformed marker — whether it appears BEFORE the first field (hiding a
      // punctuation-keyed field ahead of "Marker version") or after (a trailing
      // sixth field). Never an implicit terminator or a silently-skipped line.
      violation(`broken marker: unparseable line "${line}"`);
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

// Remove EVERY standalone, unfenced marker block from issue text so the scope
// fingerprint never hashes a marker. most-recent-wins parses only the newest as
// authoritative, but ALL blocks — including superseded ones left behind by an
// inline renewal — must leave the hashed scope, or an old block would bind stale
// marker metadata (its fingerprint / risk) into the fingerprint and review-gate.
function stripMarkerBlock(text) {
  const lines = text.split(/\r?\n/);
  for (;;) {
    let markerIdx = -1;
    let fence = null;
    for (let i = 0; i < lines.length; i += 1) {
      const nextFence = fenceTransition(lines[i], fence);
      if (nextFence !== fence) {
        fence = nextFence;
        continue;
      }
      if (!fence && lines[i].trim() === MARKER_LINE) {
        markerIdx = i;
        break; // remove blocks one at a time, front to back
      }
    }
    if (markerIdx < 0) break;
    // Drop the marker line and its contiguous field block (fields until a blank
    // line, a fence, or a non-field line).
    let end = markerIdx + 1;
    let started = false;
    for (; end < lines.length; end += 1) {
      const trimmed = lines[end].trim();
      if (trimmed === "" || /^\s*(?:```|~~~)/.test(lines[end])) {
        if (started) break;
        continue;
      }
      if (/^[A-Za-z][A-Za-z0-9 _-]*?:\s*/.test(trimmed)) {
        started = true;
        continue;
      }
      break;
    }
    lines.splice(markerIdx, end - markerIdx);
  }
  return lines.join("\n");
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
  // A self-contained Issue must also describe its behavior and its non-goals —
  // otherwise the lane would bypass Project/PRD/Spec with an undescribed contract.
  if (!scope.hasBehavior || !scope.hasNonGoals) {
    violation("broken marker: issue-only requires a described scope/behavior and explicit non-goals (self-contained Issue)");
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
