#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const fileCache = new Map();

function read(relativePath) {
  if (fileCache.has(relativePath)) {
    return fileCache.get(relativePath);
  }

  try {
    const content = fs.readFileSync(path.join(root, relativePath), "utf8");
    fileCache.set(relativePath, content);
    return content;
  } catch {
    fail(`${relativePath} could not be read`);
    fileCache.set(relativePath, "");
    return "";
  }
}

function fail(message) {
  failures.push(message);
}

function mustInclude(relativePath, snippet) {
  if (!read(relativePath).includes(snippet)) {
    fail(`${relativePath} should include the regression guard: ${snippet}`);
  }
}

function mustExclude(relativePath, snippet) {
  if (read(relativePath).includes(snippet)) {
    fail(`${relativePath} leaks a banned workflow phrase: ${snippet}`);
  }
}

// This is intentionally a small smoke guard, not a template police system.
// The real contract lives in the skills and examples. This script only catches
// the specific regressions that broke the first Zeni dogfood flow.

for (const [file, snippets] of [
  [
    "skills/mono-handoff/SKILL.md",
    [
      "Do not rely on lint scripts to make artifacts good.",
      "Run a content-shape review on the package",
      "PRD as product truth with requirement IDs",
      "Tech Spec as implementation truth that traces HOW decisions back to PRD requirements",
      "Issue slicing, `AFK`/`HITL` readiness",
    ],
  ],
  [
    "references/contracts/prd.md",
    [
      "## PR-026 — Invention self-review",
      "## PR-014 — Conditional acceptance examples",
      "## PR-013 — Actor-capability-benefit coverage",
    ],
  ],
  [
    "references/contracts/tech-spec.md",
    [
      "## TS-008 — Decision trace",
      "Trace important HOW decisions to `R` or `AE` IDs",
      "## TS-009 — No WHAT paraphrase",
      "Link HOW to WHAT rather than rewriting PRD behavior",
      "## TS-022 — Deep architecture lens",
      "make the interface the test surface",
    ],
  ],
  [
    "references/contracts/issue.md",
    [
      "## IS-013 — Scope trace",
      "Map Issue scope to PRD requirement IDs",
      "## IS-012 — Extract, do not copy",
      "Do not copy PRD or Tech Spec wholesale",
      "## IS-014 — Agent readiness",
      "`AFK`",
      "`HITL`",
      "## IS-031 — Feedback-loop self-review",
      "feedback-loop contract",
    ],
  ],
  [
    "references/execution-quality.md",
    [
      "actor -> capability -> benefit",
      "AFK",
      "HITL",
      "feedback-loop contract",
      "deletion test",
      "interface is the test surface",
    ],
  ],
  [
    "skills/mono-check/SKILL.md",
    [
      "Judge artifact shape by semantics before exact heading spelling",
      "Do fail when a document has the wrong responsibility",
    ],
  ],
  [
    "examples/profile-workbench-regression.md",
    [
      "The fix is stronger artifact construction, not more template bureaucracy.",
      "R1. Блоки Identity & phase",
      "AE1. Покрывает R1, R2, R3.",
      "Поддерживает R1, R2, R3.",
      "<project id=\"project-profile-workbench\">Agent profile settings cleanup</project>",
      "Bad Anti-Examples",
    ],
  ],
]) {
  for (const snippet of snippets) {
    mustInclude(file, snippet);
  }
}

for (const [file, snippets] of [
  ["templates/project.md", ["# Lifecycle", "# Документы", "# План задач", "# Текущий статус"]],
  ["templates/tech-spec.md", ["## Skill contracts", "## mono-check design"]],
  ["references/contracts/tech-spec.md", ["mono-check delivery"]],
]) {
  for (const snippet of snippets) {
    mustExclude(file, snippet);
  }
}

if (failures.length > 0) {
  console.error("Linear artifact regression smoke failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Linear artifact regression smoke passed");
