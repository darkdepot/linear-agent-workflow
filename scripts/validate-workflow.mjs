#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const EXPECTED_SKILLS = [
  "linear-check",
  "linear-deploy",
  "linear-handoff",
  "linear-idea",
  "linear-implement",
  "linear-issue",
  "linear-preflight",
  "linear-prd",
  "linear-project",
  "linear-review",
  "linear-ship",
  "linear-spec",
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function fail(message) {
  failures.push(message);
}

function assertIncludes(relativePath, text, label = text) {
  const body = read(relativePath);
  if (!body.includes(text)) fail(`${relativePath} missing ${label}`);
}

function listSkillNames() {
  return fs
    .readdirSync(path.join(root, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("linear-"))
    .map((entry) => entry.name)
    .sort();
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/);
    if (field) fields[field[1]] = field[2].trim();
  }
  return fields;
}

function extractReadFirstEntries(text) {
  const index = text.indexOf("Read first:");
  if (index < 0) return { paths: [], malformedLines: [] };

  const paths = [];
  const malformedLines = [];
  const lines = text.slice(index + "Read first:".length).split("\n");
  let started = false;

  for (const line of lines) {
    if (!line.trim()) continue;
    const match = line.match(/^\d+\.\s+(.+)$/);
    if (!match) {
      if (started) break;
      continue;
    }
    started = true;
    const backtickedPaths = [...match[1].matchAll(/`([^`]+)`/g)].map((pathMatch) => pathMatch[1]);
    if (backtickedPaths.length === 0) malformedLines.push(line.trim());
    paths.push(...backtickedPaths);
  }

  return { paths, malformedLines };
}

function validateReadFirstPath(referencedPath) {
  if (referencedPath === "AGENTS.md") return exists("AGENTS.md");
  if (/^(https?:|\/)/.test(referencedPath)) return false;
  if (/[$<>]/.test(referencedPath)) return false;
  if (referencedPath.startsWith("./") || referencedPath.startsWith("../")) return false;
  if (/^(skills|references|templates|scripts)\//.test(referencedPath)) return exists(referencedPath);
  return false;
}

function runNode(args, options = {}) {
  return execFileSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

function expectCommandFailure(label, callback, expectedText) {
  try {
    callback();
    fail(`${label} unexpectedly passed`);
  } catch (error) {
    const output = `${error.stdout?.toString() || ""}\n${error.stderr?.toString() || ""}`;
    if (expectedText && !output.includes(expectedText)) {
      fail(`${label} failed with unexpected output; expected to include "${expectedText}"`);
    }
  }
}

function validateSkills() {
  const skills = listSkillNames();
  const skillSet = new Set(skills);

  for (const expectedSkill of EXPECTED_SKILLS) {
    if (!skillSet.has(expectedSkill)) fail(`Missing expected core skill: ${expectedSkill}`);
  }

  for (const skill of skills) {
    if (!EXPECTED_SKILLS.includes(skill)) fail(`Unexpected linear skill: ${skill}`);
  }

  for (const skill of skills) {
    const relativePath = `skills/${skill}/SKILL.md`;
    if (!exists(relativePath)) {
      fail(`Missing ${relativePath}`);
      continue;
    }

    const text = read(relativePath);
    const frontmatter = parseFrontmatter(text);
    if (!frontmatter) {
      fail(`${relativePath} must start with YAML frontmatter`);
    } else {
      if (frontmatter.name !== skill) fail(`${relativePath} frontmatter name must be ${skill}`);
      if (!frontmatter.description || frontmatter.description.length < 20) {
        fail(`${relativePath} needs a useful frontmatter description`);
      }
    }

    if (!text.includes("Read first:")) fail(`${relativePath} missing Read first section`);

    const { paths: readFirstPaths, malformedLines } = extractReadFirstEntries(text);
    for (const malformedLine of malformedLines) {
      fail(`${relativePath} has malformed Read first entry: ${malformedLine}`);
    }
    for (const referencedPath of readFirstPaths) {
      if (!validateReadFirstPath(referencedPath)) {
        fail(`${relativePath} has broken Read first path: ${referencedPath}`);
      }
    }

    if (/thin adapter/i.test(text) || /Resolve and follow/i.test(text)) {
      fail(`${relativePath} looks like a redirect adapter`);
    }

    if (text.length < 900) fail(`${relativePath} looks too small to be an executable source skill`);
  }
}

function validateTemplateSections() {
  const requiredSections = {
    "templates/prd.md": [
      "## Акторы",
      "## Текущий процесс",
      "## Требования",
      "## Примеры приемки",
      "## Что должна доказать проверка",
      "## Критерии успеха",
      "## Допущения",
      "## Открытые вопросы",
      "## Связи",
    ],
    "templates/tech-spec.md": [
      "## Исходные требования",
      "## Контракты и границы",
      "## Единицы реализации",
      "## Влияние на остальную систему",
      "## Что может сломаться и как защищаемся",
      "## Валидация",
      "## Релиз и откат",
    ],
    "templates/issue.md": [
      "# Прочитать сначала",
      "# Готовность агента",
      "# Зависимости",
      "# Ключевые контракты",
      "# Текущее поведение",
      "# Желаемое поведение",
      "# Шаги воспроизведения",
      "# Ревью-гейт",
      "# Снимок контекста",
      "# Как проверить",
      "# Критерии приемки",
      "# Что не входит",
    ],
    "templates/project.md": ["# Что", "# Зачем", "# Образ результата", "# Что входит", "# Что не входит"],
    "templates/review-output.md": [
      "Ревью Linear: <ready|advisory-ready|needs-fixes|blocked>",
      "Блокирующие замечания:",
      "Предложенные исправления:",
      "Нужно твоё решение:",
      "К сведению:",
      "Do not use `PASS`, `FAIL`, or `BLOCKED` as the review status.",
    ],
    "templates/ship-output.md": [
      "Preflight: <ready/blocked/drift-candidate/needs-human/not run>",
      "Bug/perf proof: <not applicable or original symptom/baseline + fix proof + regression proof/gap>",
    ],
    "templates/deploy-output.md": [
      "Deploy status:",
      "Ship certificate: <found/missing/stale>",
      "Deploy workflow:",
      "Learnings recorded:",
    ],
    "templates/check-output.md": [
      "Смысл:",
      "Чего не хватает:",
      "Расхождения:",
      "Следующий unblock:",
      "Нарушение контракта:",
      "Как починить:",
    ],
    "templates/orchestrator-dispatch.md": [
      "## Assignment",
      "## Context Snapshot",
      "## AFK Contract",
      "## Mailbox",
      "## Authorization",
      "Do not ask the user",
      "no sub-workers",
    ],
    "templates/orchestrator-brief.md": [
      "Что решаем:",
      "Почему сейчас:",
      "Что уже доказано:",
      "Рекомендация:",
      "Решил сам:",
      "Нужно от тебя:",
    ],
    "templates/orchestrator-report.md": [
      "\"issue\"",
      "\"stage\"",
      "\"status\"",
      "\"question\"",
      "\"recommendation\"",
      "\"linear_mutations_pending\"",
      "needs-decision",
      "## Ledger Entry",
    ],
  };

  for (const [relativePath, sections] of Object.entries(requiredSections)) {
    if (!exists(relativePath)) {
      fail(`Missing template: ${relativePath}`);
      continue;
    }
    for (const section of sections) assertIncludes(relativePath, section);
  }
}

function validateReviewCheckBoundary() {
  const review = read("skills/linear-review/SKILL.md");
  const check = read("skills/linear-check/SKILL.md");

  for (const required of [
    "report-only",
    "must not create, update, delete, or silently repair",
    "Do not use `PASS`, `FAIL`, or `BLOCKED`",
    "`linear-review` is report-only",
  ]) {
    if (!review.includes(required)) fail(`linear-review skill boundary missing: ${required}`);
  }

  if (check.includes("templates/review-output.md") || check.includes("Linear review:") || check.includes("Ревью Linear:")) {
    fail("linear-check must not use the review output template");
  }

  if (!check.includes("Do not emit review findings")) fail("linear-check must explicitly avoid review findings");
  if (!check.includes("Never edit Project, documents, or Issues from `linear-check`")) {
    fail("linear-check must be strictly readiness-only");
  }
  if (!check.includes("return `FAIL` if the required `linear-review` gate is missing")) {
    fail("linear-check must fail missing required review gates");
  }
}

function validateLocalInstallBehavior() {
  const skillsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "linear-workflow-skills-"));
  try {
    expectCommandFailure(
      "install-local --check --remove-stale conflict",
      () => runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot, "--check", "--remove-stale"]),
      "--remove-stale has no effect in --check mode"
    );

    runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot, "--remove-stale"]);

    for (const skill of EXPECTED_SKILLS) {
      const skillPath = path.join(skillsRoot, skill, "SKILL.md");
      if (!fs.existsSync(skillPath)) {
        fail(`Local install missing ${skill}`);
        continue;
      }
      const skillText = fs.readFileSync(skillPath, "utf8");
      if (!skillText.includes("Installed from darkdepot/linear-agent-workflow")) {
        fail(`Local install ${skill} missing generated metadata`);
      }
      if (!skillText.includes("`.agents/linear-workflow.config.json`")) {
        fail(`Local install ${skill} missing project config note`);
      }
      if (/`skills\/linear-/.test(skillText)) {
        fail(`Local install ${skill} kept repo-root peer skill paths`);
      }
    }

    runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot, "--check"]);

    fs.appendFileSync(path.join(skillsRoot, "linear-review", "SKILL.md"), "\nBROKEN\n");
    expectCommandFailure(
      "install-local --check edited skill fixture",
      () => runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot, "--check"]),
      "stale or edited"
    );

    runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot]);
    fs.appendFileSync(path.join(skillsRoot, "linear-review", "references", "review-rubric.md"), "\nBROKEN\n");
    expectCommandFailure(
      "install-local --check edited reference fixture",
      () => runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot, "--check"]),
      "stale or edited"
    );
  } finally {
    fs.rmSync(skillsRoot, { recursive: true, force: true });
  }
}

function validateMultiRootInstallBehavior() {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "linear-workflow-multi-root-"));
  const codexRoot = path.join(baseDir, "codex", "skills");
  const claudeRoot = path.join(baseDir, "claude", "skills");
  const recordedRoot = path.join(baseDir, "recorded", "skills");
  const lockName = ".linear-agent-workflow.lock.json";
  const env = {
    ...process.env,
    LINEAR_WORKFLOW_KNOWN_ROOTS: [codexRoot, claudeRoot].join(path.delimiter),
  };
  const version = read("VERSION").trim();

  try {
    expectCommandFailure(
      "install-local --all-roots --skills-root conflict",
      () => runNode(["scripts/install-local.mjs", "--all-roots", "--skills-root", codexRoot]),
      "--all-roots cannot be combined with --skills-root"
    );

    // Fresh machine: no lockfiles anywhere, default mode installs the first known root only.
    const fallbackOutput = runNode(["scripts/install-local.mjs"], { env });
    if (!fallbackOutput.includes("No installed skills roots found")) {
      fail("install-local default mode must report the fresh-install fallback");
    }
    if (!fs.existsSync(path.join(codexRoot, lockName))) {
      fail("install-local default mode must install into the first known root on a fresh machine");
    }
    if (fs.existsSync(claudeRoot)) {
      fail("install-local fresh-install fallback must not create other known roots");
    }

    // With a second installed root, one default run must sync every root and report per-root versions.
    runNode(["scripts/install-local.mjs", "--skills-root", claudeRoot], { env });
    const syncOutput = runNode(["scripts/install-local.mjs", "--all-roots", "--remove-stale"], { env });
    for (const skillsRoot of [codexRoot, claudeRoot]) {
      if (!syncOutput.includes(`Installed ${EXPECTED_SKILLS.length} Linear workflow skills into ${skillsRoot} (version ${version})`)) {
        fail(`install-local --all-roots must report a per-root install for ${skillsRoot}`);
      }
    }

    const checkOutput = runNode(["scripts/install-local.mjs", "--check"], { env });
    for (const skillsRoot of [codexRoot, claudeRoot]) {
      if (!checkOutput.includes(`Linear workflow local install check passed for ${skillsRoot} (version ${version})`)) {
        fail(`install-local --check must report the per-root version for ${skillsRoot}`);
      }
    }

    // A root recorded in a discovered lockfile is synced even when missing from the known list.
    runNode(["scripts/install-local.mjs", "--skills-root", recordedRoot], { env });
    const claudeLockPath = path.join(claudeRoot, lockName);
    const claudeLock = JSON.parse(fs.readFileSync(claudeLockPath, "utf8"));
    claudeLock.skillsRoot = recordedRoot;
    fs.writeFileSync(claudeLockPath, `${JSON.stringify(claudeLock, null, 2)}\n`);
    const recordedOutput = runNode(["scripts/install-local.mjs"], { env });
    if (!recordedOutput.includes(`Installed ${EXPECTED_SKILLS.length} Linear workflow skills into ${recordedRoot}`)) {
      fail("install-local --all-roots must sync roots recorded in discovered lockfiles");
    }

    // One root left at an older version: the multi-root check must surface it.
    const codexLockPath = path.join(codexRoot, lockName);
    const codexLock = JSON.parse(fs.readFileSync(codexLockPath, "utf8"));
    codexLock.upstreamVersion = "0.0.1";
    fs.writeFileSync(codexLockPath, `${JSON.stringify(codexLock, null, 2)}\n`);
    expectCommandFailure(
      "install-local --check stale per-root version fixture",
      () => runNode(["scripts/install-local.mjs", "--check"], { env }),
      "Lockfile upstreamVersion is 0.0.1"
    );
    runNode(["scripts/install-local.mjs"], { env });

    // One edited root: the multi-root check must fail naming the broken root and still pass the healthy one.
    fs.appendFileSync(path.join(claudeRoot, "linear-review", "SKILL.md"), "\nBROKEN\n");
    for (const expectedText of [
      `Linear workflow local install check failed for ${claudeRoot}`,
      `Linear workflow local install check passed for ${codexRoot}`,
    ]) {
      expectCommandFailure(
        "install-local --check multi-root edited skill fixture",
        () => runNode(["scripts/install-local.mjs", "--check"], { env }),
        expectedText
      );
    }

    runNode(["scripts/install-local.mjs", "--all-roots"], { env });
    runNode(["scripts/install-local.mjs", "--all-roots", "--check"], { env });
  } finally {
    fs.rmSync(baseDir, { recursive: true, force: true });
  }
}

function writeLegacyProjectConfig(repo) {
  fs.mkdirSync(path.join(repo, ".agents"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, ".agents", "linear-workflow.config.md"),
    `# Linear Workflow Consumer Config

- Consumer: Fixture
- Linear team: Fixture
- Linear-facing Project, PRD, Tech Spec, Issue, and comment language: Russian
- Repo docs and code comments language: English
- Autoreview helper: Required installed \`autoreview\` skill/helper in the agent runtime.
- Artifact roots: docs/discovery, docs/reviews
- Implementation workflow: compound-engineering:ce-work
- Ship workflow: gstack ship
- Documentation workflow: None
- Review feedback workflow: compound-engineering:ce-resolve-pr-feedback
- Deploy workflow: gstack land-and-deploy
`
  );
}

function validateProjectConfigBehavior() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "linear-workflow-project-"));
  try {
    fs.writeFileSync(path.join(repo, "AGENTS.md"), "# Fixture Project\n");
    writeLegacyProjectConfig(repo);
    fs.mkdirSync(path.join(repo, ".agents", "skills", "linear-review"), { recursive: true });
    fs.writeFileSync(path.join(repo, ".agents", "skills", "linear-review", "SKILL.md"), "legacy\n");
    fs.mkdirSync(path.join(repo, ".claude", "skills", "linear-review"), { recursive: true });
    fs.writeFileSync(path.join(repo, ".claude", "skills", "linear-review", "SKILL.md"), "legacy\n");
    fs.writeFileSync(path.join(repo, ".agents", "linear-workflow-check.mjs"), "legacy\n");
    fs.writeFileSync(path.join(repo, ".agents", "linear-workflow.lock.json"), "{}\n");
    fs.mkdirSync(path.join(repo, ".github", "workflows"), { recursive: true });
    fs.writeFileSync(path.join(repo, ".github", "workflows", "update-linear-workflow.yml"), "legacy\n");
    fs.writeFileSync(path.join(repo, ".github", "workflows", "update-linear-agent-workflow.yml"), "legacy\n");

    runNode(["scripts/project-config.mjs", "--repo", repo, "--write", "--clean"]);

    const configPath = path.join(repo, ".agents", "linear-workflow.config.json");
    if (!fs.existsSync(configPath)) fail("project-config must write JSON config");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (config.projectName !== "Fixture") fail("project-config must preserve legacy Consumer as projectName");
    if (config.linearTeam !== "Fixture") fail("project-config must preserve legacy Linear team");
    if (JSON.stringify(config.artifactRoots) !== JSON.stringify(["docs/discovery", "docs/reviews"])) {
      fail("project-config must migrate legacy Artifact roots");
    }
    if (config.workflows.ship !== "gstack ship") fail("project-config must migrate Ship workflow");
    if (config.workflows.deploy !== "gstack land-and-deploy") fail("project-config must migrate Deploy workflow");
    if (!("deployApproval" in config)) fail("project-config must write deployApproval field");

    config.deployApproval = "risky-only";
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    runNode(["scripts/project-config.mjs", "--repo", repo, "--check"]);

    config.deployApproval = "monthly";
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    expectCommandFailure(
      "project-config --check invalid deployApproval fixture",
      () => runNode(["scripts/project-config.mjs", "--repo", repo, "--check"]),
      "deployApproval"
    );
    config.deployApproval = "always";
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

    for (const removed of [
      ".agents/linear-workflow.config.md",
      ".agents/linear-workflow-check.mjs",
      ".agents/linear-workflow.lock.json",
      ".agents/skills/linear-review",
      ".claude/skills/linear-review",
      ".github/workflows/update-linear-workflow.yml",
      ".github/workflows/update-linear-agent-workflow.yml",
    ]) {
      if (fs.existsSync(path.join(repo, removed))) fail(`project-config --clean did not remove ${removed}`);
    }

    runNode(["scripts/project-config.mjs", "--repo", repo, "--check"]);

    fs.mkdirSync(path.join(repo, ".agents", "skills", "linear-idea"), { recursive: true });
    fs.writeFileSync(path.join(repo, ".agents", "skills", "linear-idea", "SKILL.md"), "legacy\n");
    expectCommandFailure(
      "project-config --check vendored skill fixture",
      () => runNode(["scripts/project-config.mjs", "--repo", repo, "--check"]),
      "Legacy Linear workflow project install file must be removed"
    );
    runNode(["scripts/project-config.mjs", "--repo", repo, "--clean", "--check"]);

    config.projectName = "<set project>";
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    expectCommandFailure(
      "project-config --check placeholder fixture",
      () => runNode(["scripts/project-config.mjs", "--repo", repo, "--check"]),
      "unresolved"
    );
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
}

function validateDocsAndExamples() {
  for (const [relativePath, texts] of Object.entries({
    "README.md": [
      "linear-implement",
      "linear-preflight",
      "linear-deploy",
      "autoreview",
      "node scripts/install-local.mjs",
      "node scripts/project-config.mjs",
      "--all-roots",
      "~/.claude/skills",
      "per-root",
      "Review/check split",
      "Delivery ladder",
      "Autonomy with transparency",
    ],
    "AGENTS.md": [
      "`linear-review` = report-only quality/risk review",
      "`linear-implement` = Delivery Start",
      "`linear-preflight` = local branch readiness",
      "mandatory `autoreview` clean gate",
      "`linear-deploy` = deploy workflow delegation",
      "Keep `linear-review` report-only",
      "Project repos must keep only `.agents/linear-workflow.config.json`",
    ],
    "examples/zeni-dogfood.md": [
      "Risk-Based Review Gate Examples",
      "Zeni keeps only `.agents/linear-workflow.config.json`",
      "Use the local skill pack installed from this upstream repo",
      "Correct Risky Handoff Review",
      "Correct Implement To Preflight To Ship",
      "Anti-Example: Ship Owns Deploy",
      "Anti-Example: Vendored Project Install",
      "Correct Tiny Advisory Review",
      "Anti-Example: Required Review Skipped",
      "Anti-Example: Review Mutates Linear",
      "Anti-Example: Preflight Owns Ship",
    ],
    "references/artifact-intake.md": [
      "Do not perform broad home-directory scans",
      "Artifact roots",
      "`read`",
      "`unavailable`",
      "`stale_or_ignored`",
      "`conflicts`",
      "`decisions_carried_forward`",
      "`confidence_boundary`",
    ],
    "references/readiness-gates.md": ["`tiny`:", "`standard`:", "`deep`:", "`risky`:", "Tiny Output Profile"],
    "references/artifact-quality.md": ["## PRD", "## Tech Spec", "## Issue", "## Review Findings", "## Preflight Certificate"],
    "references/human-friendly-output.md": ["## Machine Blocks In Linear Comments", "## Linear Exit Comments"],
    "references/execution-quality.md": ["## PRD Coverage", "## Durable Issue Writing", "## Agent Readiness", "## Bug And Performance Proof", "## Architecture Lens"],
    "references/review-rubric.md": ["Allowed review verdicts:", "`ready`", "`advisory-ready`", "`needs-fixes`", "`blocked`"],
    "references/install.md": [
      "local skill pack",
      ".agents/linear-workflow.config.json",
      "does not vendor `autoreview`",
      "--all-roots",
      "~/.claude/skills",
      ".linear-agent-workflow.lock.json",
      "LINEAR_WORKFLOW_KNOWN_ROOTS",
      "per-root",
    ],
    "references/orchestration.md": [
      "## Roles",
      "## Stage Ownership",
      "## Decision Authority",
      "## Worker Transports",
      "## Mailbox And Ledger",
      "## Monitoring Protocol",
      "## Decision Briefs",
      "## Resume",
      "claude-code-desktop",
      "deployApproval",
      "any risk class except `tiny` under `risky-only`",
      "«Решил сам:»",
      "scope-drift-needs-handoff",
    ],
    "references/questioning.md": [
      "`linear-deploy`: ask only for deploy approval",
      "## Autonomy Defaults",
      "/design-html",
    ],
    "references/versioning.md": [
      "`Autoreview helper`",
      "`Artifact roots`",
      "`Implementation workflow`",
      "`Documentation workflow`",
      "`Deploy workflow`",
      "project config",
    ],
  })) {
    if (!exists(relativePath)) {
      fail(`Missing ${relativePath}`);
      continue;
    }
    for (const text of texts) assertIncludes(relativePath, text);
  }
}

function validateAntiPatterns() {
  const review = read("skills/linear-review/SKILL.md");
  if (/Final response must include:[\s\S]*PASS/.test(review)) {
    fail("linear-review final response must not use PASS/FAIL/BLOCKED statuses");
  }

  const handoff = read("skills/linear-handoff/SKILL.md");
  if (!handoff.includes("Apply accepted review fixes in `linear-handoff`")) {
    fail("linear-handoff must own accepted review fixes");
  }
  if (!handoff.includes("references/artifact-intake.md")) {
    fail("linear-handoff must use artifact intake before package synthesis");
  }
  for (const required of [
    "`read`",
    "`unavailable`",
    "`stale_or_ignored`",
    "`conflicts`",
    "`decisions_carried_forward`",
    "`confidence_boundary`",
  ]) {
    if (!handoff.includes(required)) fail(`linear-handoff must expose artifact intake field: ${required}`);
  }
  if (!handoff.includes("Artifact intake, one Russian sentence")) {
    fail("linear-handoff final response must carry artifact intake one-sentence Russian rendering");
  }
  if (!handoff.includes("The structured intake record")) {
    fail("linear-handoff final response must reference the structured intake record location");
  }
  if (!handoff.includes("Do not move the Project to Delivery from `linear-handoff`")) {
    fail("linear-handoff must not own Delivery Start");
  }
  if (!handoff.includes("это одновременно approval на старт кода")) {
    fail("linear-handoff option 2 must label the bundled approval");
  }
  if (!handoff.includes("«Решил сам:»")) {
    fail("linear-handoff must include «Решил сам:» ledger in package approval UX");
  }
  if (!handoff.includes("Always-ask list")) {
    fail("linear-handoff rules must reference the Always-ask list in questioning.md");
  }

  const implement = read("skills/linear-implement/SKILL.md");
  for (const required of [
    "Use this skill to own Delivery Start",
    "Run or report `linear-check delivery`",
    "Move the Project to Delivery only after approval and prerequisites are explicit",
    "after the Project is in Delivery",
    "missing or `None`",
    "Implementation workflow",
    "implemented-needs-preflight",
    "scope-drift-needs-handoff",
    "Implementation-start approval UX:",
    "Что это разрешает: Project переходит в Delivery",
    "post a short Russian Linear exit comment on the Issue following the Linear Exit Comments rule",
    "For `tiny` work, follow the Tiny Output Profile in references/readiness-gates.md",
    "gstack-learnings-search",
    "Учтённые learnings:",
  ]) {
    if (!implement.includes(required)) fail(`linear-implement contract missing: ${required}`);
  }

  const ship = read("skills/linear-ship/SKILL.md");
  if (!ship.includes("`linear-review` is report-only; `linear-ship` owns accepted pre-ship drift sync")) {
    fail("linear-ship must own accepted pre-ship drift sync");
  }
  if (!ship.includes("read the latest `linear-preflight certificate`")) {
    fail("linear-ship must consume the preflight certificate when present");
  }
  if (!ship.includes("If no certificate exists, route to `linear-preflight` before continuing")) {
    fail("linear-ship must require a preflight certificate before ship");
  }
  if (!ship.includes("Linear comments or resources")) {
    fail("linear-ship must recover the preflight certificate from Linear");
  }
  for (const required of ["Documentation workflow", "linear-ship green certificate", "Next: linear-deploy", "Poll interval: 10 minutes"]) {
    if (!ship.includes(required) && !read("references/ship-feedback-loop.md").includes(required)) {
      fail(`linear-ship ladder contract missing: ${required}`);
    }
  }
  if (/Land workflow|configured land workflow|land\/deploy workflow/i.test(ship)) {
    fail("linear-ship must not reference old Land workflow or own deploy");
  }
  if (ship.includes("pr-created")) fail("linear-ship must not keep pr-created as a terminal ship verdict");

  const deploy = read("skills/linear-deploy/SKILL.md");
  for (const required of [
    "Requires `linear-ship green certificate`",
    "Deploy workflow",
    "gstack land-and-deploy",
    "linear-check post-ship",
    "gstack-learnings-log",
    "Do not run `/learn prune`, `/learn export`, `/learn stats`",
    "Do not accept `Land workflow` as a compatibility alias",
    "deployApproval",
    "Готов деплоить",
    "gstack-learnings-search",
    "Learnings consulted:",
  ]) {
    if (!deploy.includes(required)) fail(`linear-deploy contract missing: ${required}`);
  }

  const preflight = read("skills/linear-preflight/SKILL.md");
  for (const required of [
    "owns local branch readiness only",
    "`ready`",
    "`blocked`",
    "`drift-candidate`",
    "`needs-human`",
    "linear-preflight certificate",
    "Issue(s): <keys>",
    "Branch: <branch>; commit state: <clean/dirty/committed>",
    "Changed files: <count/list or summary>",
    "Local verification: <commands run + outcome>",
    "Autoreview: <clean|blocked|needs-human|unavailable>; final command: <selected-scope helper command>; clean result: <exit 0 + clean line or none>",
    "Autoreview loop: <iterations>; accepted findings fixed: <none/list>; residual actionable findings: <none/list, must be none for ready>",
    "Drift candidate: <none/summary>",
    "Not checked: <manual QA/browser/mobile/deploy/etc.>",
    "Next: <linear-ship | linear-handoff | needs-human>",
    "Do not run or claim `linear-review pre-ship`",
    "Do not run or claim `linear-check pre-ship`",
    "Do not create the final PR",
    "Preflight certificate shape",
    "Invoke the installed `autoreview` skill/helper",
    "Do not substitute Compound `ce-code-review`, built-in `/review`, ad hoc self-review, reviewer panels, or a hand-written summary",
    "Treat helper exit 0 plus the clean result",
    "Before emitting `ready`, run one final clean review for the selected durable scope",
    "A clean local dirty-work review alone is not sufficient",
    "Do not cap the review loop at an arbitrary round count",
    "Do not call Compound `ce-code-review` for this gate",
    "Do not silently reject a repeated `autoreview` finding and mark `ready`",
    "Decision needed: <none | точное решение по-русски>",
    "For `tiny` work, follow the Tiny Output Profile in references/readiness-gates.md",
  ]) {
    if (!preflight.includes(required)) fail(`linear-preflight boundary missing: ${required}`);
  }

  const shipOutput = read("templates/ship-output.md");
  if (!shipOutput.includes("Preflight: <ready/blocked/drift-candidate/needs-human/not run>")) {
    fail("ship output template must preserve preflight status boundary");
  }
  if (shipOutput.includes("pr-created")) fail("ship output template must stay focused on green/needs-human/blocked/timed-out");
  for (const required of ["linear-ship green certificate", "Documentation workflow", "Next: <linear-deploy | needs-human | blocked>"]) {
    if (!shipOutput.includes(required)) fail(`ship output template missing ladder field: ${required}`);
  }

  const deployOutput = read("templates/deploy-output.md");
  for (const required of ["Ship certificate: <found/missing/stale>", "Deploy workflow", "Learnings recorded", "stale certificates"]) {
    if (!deployOutput.includes(required)) fail(`deploy output template missing: ${required}`);
  }

  const check = read("skills/linear-check/SKILL.md");
  if (!check.includes("local branch readiness is known through a `linear-preflight` certificate")) {
    fail("linear-check pre-ship must require the preflight certificate");
  }
  if (!check.includes("project-config")) fail("linear-check must expose project-config mode");
  if (check.includes("generated consumer skills are full executable copies")) {
    fail("linear-check must not enforce the removed generated consumer install contract");
  }

  const dogfood = read("examples/zeni-dogfood.md");
  for (const banned of [
    "Zeni `.agents/skills/linear-*` contains generated full copies from upstream",
    "Zeni `.claude/skills/linear-*` contains tiny discovery wrappers to `.agents`",
    "Zeni stores consumer policy in `.agents/linear-workflow.config.md`",
    "Install generated full skills into Zeni",
  ]) {
    if (dogfood.includes(banned)) fail(`Zeni dogfood example preserves removed install contract: ${banned}`);
  }

  const spec = read("skills/linear-spec/SKILL.md");
  if (spec.includes("linear-review design")) fail("linear-spec must not reference unsupported linear-review design mode");

  const projectTemplate = read("templates/project.md");
  for (const banned of ["# Lifecycle", "# Документы", "# План задач", "# Ревью-гейт", "# Текущий статус"]) {
    if (projectTemplate.includes(banned)) fail(`Project template must not expose workflow dashboard section: ${banned}`);
  }

  const techSpecTemplate = read("templates/tech-spec.md");
  for (const banned of ["## Skill contracts", "## linear-check design", "## Дизайн linear-check", "## Дизайн linear-review"]) {
    if (techSpecTemplate.includes(banned)) fail(`Tech Spec template must not expose workflow mechanics section: ${banned}`);
  }

  // New dual-layer comment contract pins (plan 005)
  if (!preflight.includes("<1-2 предложения по-русски: итог и следующий шаг>")) {
    fail("linear-preflight human comment shape missing Russian human-lead placeholder");
  }
  if (!preflight.includes("The Russian human lead (1-2 sentences) is required")) {
    fail("linear-preflight must require the Russian human lead in Linear comment");
  }

  if (!deploy.includes("Выкатили: <что получили пользователи>; проверено на <среда>.")) {
    fail("linear-deploy closeout shape missing required product-outcome Russian lead");
  }
  if (!deploy.includes("The Russian product-outcome lead is required in Linear")) {
    fail("linear-deploy must require the Russian product-outcome lead");
  }

  const idea = read("skills/linear-idea/SKILL.md");
  if (!idea.includes("Выйди из Plan Mode (или перезапусти /linear-idea в обычном режиме) — я создам Project в статусе Idea.")) {
    fail("linear-idea blocked message missing Russian unblock instruction");
  }
  if (!idea.includes("BLOCKED / INCOMPLETE - linear-idea cannot complete because")) {
    fail("linear-idea blocked message must preserve English marker line");
  }
}

validateSkills();
validateTemplateSections();
validateReviewCheckBoundary();
validateLocalInstallBehavior();
validateMultiRootInstallBehavior();
validateProjectConfigBehavior();
validateDocsAndExamples();
validateAntiPatterns();

if (failures.length > 0) {
  console.error("Linear workflow validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Linear workflow validation passed (${listSkillNames().length} skills checked).`);
