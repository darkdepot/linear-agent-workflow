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
  if (!body.includes(text)) {
    fail(`${relativePath} missing ${label}`);
  }
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
    if (backtickedPaths.length === 0) {
      malformedLines.push(line.trim());
    }
    paths.push(...backtickedPaths);
  }

  return { paths, malformedLines };
}

function validateReadFirstPath(referencedPath) {
  if (referencedPath === "AGENTS.md") return exists("AGENTS.md");
  if (/^(https?:|\/)/.test(referencedPath)) return false;
  if (/[$<>]/.test(referencedPath)) return false;
  if (referencedPath.startsWith("./") || referencedPath.startsWith("../")) return false;
  if (/^(skills|references|templates|scripts)\//.test(referencedPath)) {
    return exists(referencedPath);
  }
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

function runSyncConsumer(repo, check = false, consumerName = "Fixture") {
  const args = ["scripts/sync-consumer.mjs", "--repo", repo, "--consumer-name", consumerName];
  if (check) args.push("--check");
  return runNode(args);
}

function runLocalChecker(repo) {
  return execFileSync(process.execPath, [path.join(repo, ".agents", "linear-workflow-check.mjs")], {
    cwd: repo,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function writeCompleteConsumerConfig(repo) {
  fs.writeFileSync(
    path.join(repo, ".agents", "linear-workflow.config.md"),
    `# Linear Workflow Consumer Config

This file is local consumer policy for generated \`linear-*\` skills.

- Consumer: Fixture
- Linear team: Fixture
- Linear-facing Project, PRD, Tech Spec, Issue, and comment language: Russian
- Repo docs and code comments language: English
- Linear is the planning, spec, and task source of truth.
- GitHub is branch, PR, review, CI, deploy, and merge history only.
- Main workflow: \`linear-idea\` -> discovery/reviews -> \`linear-handoff\` -> approved Issue(s) -> \`linear-implement\` -> \`linear-preflight\` -> \`linear-ship\` -> \`linear-deploy\`.
- Autoreview helper: Required installed \`autoreview\` skill/helper in the agent runtime, or explicit consumer helper at \`.agents/skills/autoreview/scripts/autoreview\`; \`linear-preflight\` blocks if unavailable.
- Ship workflow: fixture ship
- Documentation workflow: None
- Review feedback workflow: None
- Deploy workflow: None
`
  );
}

function writeLegacyConsumerConfig(repo) {
  fs.mkdirSync(path.join(repo, ".agents"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, ".agents", "linear-workflow.config.md"),
    `# Linear Workflow Consumer Config

This fixture intentionally models a preserved consumer config without the optional implementation workflow and artifact roots fields, but with current deploy naming.

- Consumer: Fixture
- Linear team: Fixture
- Linear-facing Project, PRD, Tech Spec, Issue, and comment language: Russian
- Repo docs and code comments language: English
- Linear is the planning, spec, and task source of truth.
- GitHub is branch, PR, review, CI, deploy, and merge history only.
- Main workflow: \`linear-idea\` -> discovery/reviews -> \`linear-handoff\` -> risk-based \`linear-review\` gate -> approved Issue(s) -> implementation/ship.
- Autoreview helper: Required installed \`autoreview\` skill/helper in the agent runtime, or explicit consumer helper at \`.agents/skills/autoreview/scripts/autoreview\`; \`linear-preflight\` blocks if unavailable.
- Ship workflow: fixture ship
- Documentation workflow: None
- Review feedback workflow: None
- Deploy workflow: None
`
  );
}

function writeUnsupportedLandConfig(repo) {
  fs.mkdirSync(path.join(repo, ".agents"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, ".agents", "linear-workflow.config.md"),
    `# Linear Workflow Consumer Config

- Consumer: Fixture
- Linear team: Fixture
- Linear-facing Project, PRD, Tech Spec, Issue, and comment language: Russian
- Repo docs and code comments language: English
- Linear is the planning, spec, and task source of truth.
- GitHub is branch, PR, review, CI, deploy, and merge history only.
- Main workflow: \`linear-idea\` -> discovery/reviews -> \`linear-handoff\` -> approved Issue(s) -> \`linear-implement\` -> \`linear-preflight\` -> \`linear-ship\` -> \`linear-deploy\`.
- Autoreview helper: Required installed \`autoreview\` skill/helper in the agent runtime, or explicit consumer helper at \`.agents/skills/autoreview/scripts/autoreview\`; \`linear-preflight\` blocks if unavailable.
- Ship workflow: fixture ship
- Review feedback workflow: None
- Land workflow: fixture land
`
  );
}

function writeMissingAutoreviewHelperConfig(repo) {
  fs.mkdirSync(path.join(repo, ".agents"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, ".agents", "linear-workflow.config.md"),
    `# Linear Workflow Consumer Config

- Consumer: Fixture
- Linear team: Fixture
- Linear-facing Project, PRD, Tech Spec, Issue, and comment language: Russian
- Repo docs and code comments language: English
- Linear is the planning, spec, and task source of truth.
- GitHub is branch, PR, review, CI, deploy, and merge history only.
- Main workflow: \`linear-idea\` -> discovery/reviews -> \`linear-handoff\` -> approved Issue(s) -> \`linear-implement\` -> \`linear-preflight\` -> \`linear-ship\` -> \`linear-deploy\`.
- Ship workflow: fixture ship
- Review feedback workflow: None
- Deploy workflow: None
`
  );
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
    if (!skillSet.has(expectedSkill)) {
      fail(`Missing expected core skill: ${expectedSkill}`);
    }
  }

  for (const skill of skills) {
    if (!EXPECTED_SKILLS.includes(skill)) {
      fail(`Unexpected linear skill: ${skill}`);
    }
  }

  for (const skill of skills) {
    const relativePath = `skills/${skill}/SKILL.md`;
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) {
      fail(`Missing ${relativePath}`);
      continue;
    }

    const text = read(relativePath);
    const frontmatter = parseFrontmatter(text);
    if (!frontmatter) {
      fail(`${relativePath} must start with YAML frontmatter`);
    } else {
      if (frontmatter.name !== skill) {
        fail(`${relativePath} frontmatter name must be ${skill}`);
      }
      if (!frontmatter.description || frontmatter.description.length < 20) {
        fail(`${relativePath} needs a useful frontmatter description`);
      }
    }

    if (!text.includes("Read first:")) {
      fail(`${relativePath} missing Read first section`);
    }

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

    if (text.length < 900) {
      fail(`${relativePath} looks too small to be an executable source skill`);
    }
  }
}

function validateTemplateSections() {
  const requiredSections = {
    "templates/prd.md": [
      "## Акторы",
      "## Текущий процесс",
      "## Требования",
      "## Примеры приемки",
      "## Намерение проверки поведения",
      "## Критерии успеха",
      "## Допущения",
      "## Открытые вопросы",
      "## Связи",
    ],
    "templates/tech-spec.md": [
      "## Исходные требования",
      "## Контракты и границы",
      "## Единицы реализации",
      "## Системное влияние",
      "## Режимы отказа",
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
      "Решения:",
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
  };

  for (const [relativePath, sections] of Object.entries(requiredSections)) {
    if (!exists(relativePath)) {
      fail(`Missing template: ${relativePath}`);
      continue;
    }
    for (const section of sections) {
      assertIncludes(relativePath, section);
    }
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
    if (!review.includes(required)) {
      fail(`linear-review skill boundary missing: ${required}`);
    }
  }

  if (
    check.includes("templates/review-output.md") ||
    check.includes("Linear review:") ||
    check.includes("Ревью Linear:")
  ) {
    fail("linear-check must not use the review output template");
  }

  if (!check.includes("Do not emit review findings")) {
    fail("linear-check must explicitly avoid review findings");
  }

  if (!check.includes("Never edit Project, documents, or Issues from `linear-check`")) {
    fail("linear-check must be strictly readiness-only");
  }

  if (!check.includes("return `FAIL` if the required `linear-review` gate is missing")) {
    fail("linear-check must fail missing required review gates");
  }
}

function validateGeneratedReadFirstPaths(repo) {
  const skillsRoot = path.join(repo, ".agents", "skills");
  for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("linear-")) continue;
    const skillDir = path.join(skillsRoot, entry.name);
    const skillPath = path.join(skillDir, "SKILL.md");
    const text = fs.readFileSync(skillPath, "utf8");
    const { paths: readFirstPaths, malformedLines } = extractReadFirstEntries(text);
    for (const malformedLine of malformedLines) {
      fail(`Generated ${entry.name} has malformed Read first entry: ${malformedLine}`);
    }
    for (const referencedPath of readFirstPaths) {
      if (/^(https?:|\/)/.test(referencedPath) || /[$<>]/.test(referencedPath)) {
        fail(`Generated ${entry.name} has non-local Read first path: ${referencedPath}`);
        continue;
      }
      const resolved = path.resolve(skillDir, referencedPath);
      const relativeToRepo = path.relative(repo, resolved);
      if (relativeToRepo.startsWith("..") || path.isAbsolute(relativeToRepo) || !fs.existsSync(resolved)) {
        fail(`Generated ${entry.name} has broken Read first path: ${referencedPath}`);
      }
    }
  }
}

function validateFreshZeniInstall() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "linear-workflow-zeni-"));
  try {
    fs.writeFileSync(path.join(repo, "AGENTS.md"), "# Zeni Consumer\n");
    runSyncConsumer(repo, false, "Zeni");
    const configText = fs.readFileSync(path.join(repo, ".agents", "linear-workflow.config.md"), "utf8");
    if (!configText.includes("- Implementation workflow: compound-engineering:ce-work")) {
      fail("Fresh Zeni config must include the configured implementation workflow default");
    }
    if (!configText.includes("- Artifact roots: None")) {
      fail("Fresh Zeni config must include explicit Artifact roots default");
    }
    if (!configText.includes("- Documentation workflow: gstack document-release")) {
      fail("Fresh Zeni config must include the configured documentation workflow default");
    }
    if (!configText.includes("- Deploy workflow: gstack land-and-deploy")) {
      fail("Fresh Zeni config must include the configured deploy workflow default");
    }
    if (!configText.includes("- Autoreview helper: Required installed `autoreview` skill/helper")) {
      fail("Fresh Zeni config must include the autoreview helper prerequisite");
    }
    if (configText.includes("Land workflow")) {
      fail("Fresh Zeni config must not include unsupported Land workflow");
    }
    runSyncConsumer(repo, true, "Zeni");
    runLocalChecker(repo);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
}

function validateSyncConsumerBehavior() {
  validateFreshZeniInstall();

  const legacyRepo = fs.mkdtempSync(path.join(os.tmpdir(), "linear-workflow-legacy-"));
  try {
    fs.writeFileSync(path.join(legacyRepo, "AGENTS.md"), "# Legacy Consumer\n");
    writeLegacyConsumerConfig(legacyRepo);
    runSyncConsumer(legacyRepo);
    const preservedConfig = fs.readFileSync(
      path.join(legacyRepo, ".agents", "linear-workflow.config.md"),
      "utf8"
    );
    if (preservedConfig.includes("Implementation workflow")) {
      fail("sync-consumer must preserve old configs without adding the optional Implementation workflow field");
    }
    if (preservedConfig.includes("Artifact roots")) {
      fail("sync-consumer must preserve old configs without adding the optional Artifact roots field");
    }
    if (!preservedConfig.includes("Deploy workflow: None")) {
      fail("legacy fixture must preserve deploy workflow field");
    }
    runSyncConsumer(legacyRepo, true);
    runLocalChecker(legacyRepo);
  } finally {
    fs.rmSync(legacyRepo, { recursive: true, force: true });
  }

  const landRepo = fs.mkdtempSync(path.join(os.tmpdir(), "linear-workflow-land-"));
  try {
    fs.writeFileSync(path.join(landRepo, "AGENTS.md"), "# Land Consumer\n");
    runSyncConsumer(landRepo);
    writeUnsupportedLandConfig(landRepo);
    expectCommandFailure(
      "sync-consumer --check unsupported Land workflow fixture",
      () => runSyncConsumer(landRepo, true),
      "unsupported Land workflow"
    );
    expectCommandFailure(
      "local checker unsupported Land workflow fixture",
      () => runLocalChecker(landRepo),
      "unsupported Land workflow"
    );
  } finally {
    fs.rmSync(landRepo, { recursive: true, force: true });
  }

  const missingAutoreviewRepo = fs.mkdtempSync(path.join(os.tmpdir(), "linear-workflow-no-autoreview-"));
  try {
    fs.writeFileSync(path.join(missingAutoreviewRepo, "AGENTS.md"), "# Missing Autoreview Consumer\n");
    runSyncConsumer(missingAutoreviewRepo);
    writeMissingAutoreviewHelperConfig(missingAutoreviewRepo);
    expectCommandFailure(
      "sync-consumer --check missing Autoreview helper fixture",
      () => runSyncConsumer(missingAutoreviewRepo, true),
      "missing Autoreview helper prerequisite"
    );
    expectCommandFailure(
      "local checker missing Autoreview helper fixture",
      () => runLocalChecker(missingAutoreviewRepo),
      "missing Autoreview helper prerequisite"
    );
  } finally {
    fs.rmSync(missingAutoreviewRepo, { recursive: true, force: true });
  }

  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "linear-workflow-validate-"));
  try {
    fs.writeFileSync(path.join(repo, "AGENTS.md"), "# Fixture Consumer\n");
    runSyncConsumer(repo);
    writeCompleteConsumerConfig(repo);
    runSyncConsumer(repo, true);
    runLocalChecker(repo);
    validateGeneratedReadFirstPaths(repo);

    fs.appendFileSync(path.join(repo, ".agents", "linear-workflow-check.mjs"), "\n// BROKEN\n");
    expectCommandFailure(
      "sync-consumer --check edited local checker fixture",
      () => runSyncConsumer(repo, true),
      "Local install checker is stale or edited"
    );
    expectCommandFailure(
      "local checker edited local checker fixture",
      () => runLocalChecker(repo),
      "Stale or edited local install checker"
    );

    runSyncConsumer(repo);
    fs.appendFileSync(
      path.join(repo, ".agents", "skills", "linear-review", "references", "review-rubric.md"),
      "\nBROKEN\n"
    );
    expectCommandFailure(
      "sync-consumer --check edited copied reference fixture",
      () => runSyncConsumer(repo, true),
      "stale or edited"
    );
    expectCommandFailure(
      "local checker edited copied reference fixture",
      () => runLocalChecker(repo),
      "stale or edited"
    );

    runSyncConsumer(repo);
    fs.rmSync(path.join(repo, ".agents", "skills", "linear-review", "templates", "prd.md"));
    expectCommandFailure(
      "sync-consumer --check missing copied template fixture",
      () => runSyncConsumer(repo, true),
      "Missing copied templates"
    );
    expectCommandFailure(
      "local checker missing copied template fixture",
      () => runLocalChecker(repo),
      "Missing copied templates"
    );

    runSyncConsumer(repo);
    fs.writeFileSync(path.join(repo, ".agents", "skills", "linear-review", "templates", "extra.md"), "extra\n");
    expectCommandFailure(
      "sync-consumer --check extra copied template fixture",
      () => runSyncConsumer(repo, true),
      "Unexpected copied templates"
    );
    expectCommandFailure(
      "local checker extra copied template fixture",
      () => runLocalChecker(repo),
      "Unexpected copied templates"
    );

    runSyncConsumer(repo);
    fs.appendFileSync(path.join(repo, ".agents", "skills", "linear-review", "SKILL.md"), "\nthin adapter\n");
    expectCommandFailure(
      "sync-consumer --check redirect-stub fixture",
      () => runSyncConsumer(repo, true),
      "Redirect-stub pattern"
    );
    expectCommandFailure(
      "local checker redirect-stub fixture",
      () => runLocalChecker(repo),
      "Redirect-stub pattern"
    );

    runSyncConsumer(repo);
    fs.writeFileSync(
      path.join(repo, ".agents", "linear-workflow.config.md"),
      "- Linear team: <set team name>\n"
    );
    expectCommandFailure(
      "sync-consumer --check placeholder config fixture",
      () => runSyncConsumer(repo, true),
      "Consumer config has unresolved placeholder"
    );
    expectCommandFailure(
      "local checker placeholder config fixture",
      () => runLocalChecker(repo),
      "Consumer config has unresolved placeholder"
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
      "node scripts/validate-workflow.mjs",
      "Review/check split",
      "Delivery ladder",
    ],
    "AGENTS.md": [
      "`linear-review` = report-only quality/risk review",
      "`linear-implement` = Delivery Start",
      "`linear-preflight` = local branch readiness",
      "mandatory `autoreview` clean gate",
      "`linear-deploy` = deploy workflow delegation",
      "Keep `linear-review` report-only",
    ],
    "examples/zeni-dogfood.md": [
      "Risk-Based Review Gate Examples",
      "Correct Risky Handoff Review",
      "Correct Implement To Preflight To Ship",
      "Anti-Example: Ship Owns Deploy",
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
    "references/readiness-gates.md": ["`tiny`:", "`standard`:", "`deep`:", "`risky`:"],
    "references/artifact-quality.md": ["## PRD", "## Tech Spec", "## Issue", "## Review Findings", "## Preflight Certificate"],
    "references/execution-quality.md": ["## PRD Coverage", "## Durable Issue Writing", "## Agent Readiness", "## Bug And Performance Proof", "## Architecture Lens"],
    "references/review-rubric.md": ["Allowed review verdicts:", "`ready`", "`advisory-ready`", "`needs-fixes`", "`blocked`"],
    "references/install.md": ["Autoreview helper", "does not vendor `autoreview`"],
    "references/versioning.md": ["`Autoreview helper`", "`Artifact roots`", "`Implementation workflow`", "`Documentation workflow`", "`Deploy workflow`", "documented default selection table"],
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
    if (!handoff.includes(required)) {
      fail(`linear-handoff must expose artifact intake field: ${required}`);
    }
  }
  if (!handoff.includes("Artifact intake summary with `read`, `unavailable`, `stale_or_ignored`, `conflicts`, `decisions_carried_forward`, and `confidence_boundary`")) {
    fail("linear-handoff final response must carry artifact intake summary fields");
  }
  if (!handoff.includes("Do not move the Project to Delivery from `linear-handoff`")) {
    fail("linear-handoff must not own Delivery Start");
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
  ]) {
    if (!implement.includes(required)) {
      fail(`linear-implement contract missing: ${required}`);
    }
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
  for (const required of [
    "Documentation workflow",
    "linear-ship green certificate",
    "Next: linear-deploy",
    "Poll interval: 10 minutes",
  ]) {
    if (!ship.includes(required) && !read("references/ship-feedback-loop.md").includes(required)) {
      fail(`linear-ship ladder contract missing: ${required}`);
    }
  }
  if (/Land workflow|configured land workflow|land\/deploy workflow/i.test(ship)) {
    fail("linear-ship must not reference old Land workflow or own deploy");
  }
  if (ship.includes("pr-created")) {
    fail("linear-ship must not keep pr-created as a terminal ship verdict");
  }

  const deploy = read("skills/linear-deploy/SKILL.md");
  for (const required of [
    "Requires `linear-ship green certificate`",
    "Deploy workflow",
    "gstack land-and-deploy",
    "linear-check post-ship",
    "gstack-learnings-log",
    "Do not run `/learn prune`, `/learn export`, `/learn stats`",
    "Do not accept `Land workflow` as a compatibility alias",
  ]) {
    if (!deploy.includes(required)) {
      fail(`linear-deploy contract missing: ${required}`);
    }
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
    "Autoreview: <clean|blocked|needs-human|unavailable>; final command: <branch/PR helper command>; clean result: <exit 0 + clean line or none>",
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
    "Before emitting `ready`, run one final clean branch/PR review",
    "A clean local dirty-work review alone is not sufficient",
    "Do not cap the review loop at an arbitrary round count",
    "Do not call Compound `ce-code-review` for this gate",
    "Do not silently reject a repeated `autoreview` finding and mark `ready`",
  ]) {
    if (!preflight.includes(required)) {
      fail(`linear-preflight boundary missing: ${required}`);
    }
  }

  const shipOutput = read("templates/ship-output.md");
  if (!shipOutput.includes("Preflight: <ready/blocked/drift-candidate/needs-human/not run>")) {
    fail("ship output template must preserve preflight status boundary");
  }
  if (shipOutput.includes("pr-created")) {
    fail("ship output template must stay focused on green/needs-human/blocked/timed-out");
  }
  for (const required of [
    "linear-ship green certificate",
    "Documentation workflow",
    "Next: <linear-deploy | needs-human | blocked>",
  ]) {
    if (!shipOutput.includes(required)) {
      fail(`ship output template missing ladder field: ${required}`);
    }
  }

  const deployOutput = read("templates/deploy-output.md");
  for (const required of [
    "Ship certificate: <found/missing/stale>",
    "Deploy workflow",
    "Learnings recorded",
    "stale certificates",
  ]) {
    if (!deployOutput.includes(required)) {
      fail(`deploy output template missing: ${required}`);
    }
  }

  const check = read("skills/linear-check/SKILL.md");
  if (!check.includes("local branch readiness is known through a `linear-preflight` certificate")) {
    fail("linear-check pre-ship must require the preflight certificate");
  }

  const spec = read("skills/linear-spec/SKILL.md");
  if (spec.includes("linear-review design")) {
    fail("linear-spec must not reference unsupported linear-review design mode");
  }

  const projectTemplate = read("templates/project.md");
  for (const banned of ["# Lifecycle", "# Документы", "# План задач", "# Ревью-гейт", "# Текущий статус"]) {
    if (projectTemplate.includes(banned)) {
      fail(`Project template must not expose workflow dashboard section: ${banned}`);
    }
  }

  const techSpecTemplate = read("templates/tech-spec.md");
  for (const banned of ["## Skill contracts", "## linear-check design", "## Дизайн linear-check", "## Дизайн linear-review"]) {
    if (techSpecTemplate.includes(banned)) {
      fail(`Tech Spec template must not expose workflow mechanics section: ${banned}`);
    }
  }
}

validateSkills();
validateTemplateSections();
validateReviewCheckBoundary();
validateSyncConsumerBehavior();
validateDocsAndExamples();
validateAntiPatterns();

if (failures.length > 0) {
  console.error("Linear workflow validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Linear workflow validation passed (${listSkillNames().length} skills checked).`);
