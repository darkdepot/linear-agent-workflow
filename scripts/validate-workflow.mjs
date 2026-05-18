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
  "linear-handoff",
  "linear-idea",
  "linear-issue",
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

function runSyncConsumer(repo, check = false) {
  const args = ["scripts/sync-consumer.mjs", "--repo", repo, "--consumer-name", "Fixture"];
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

function validateSyncConsumerBehavior() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "linear-workflow-validate-"));
  try {
    fs.writeFileSync(path.join(repo, "AGENTS.md"), "# Fixture Consumer\n");
    runSyncConsumer(repo);
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
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
}

function validateDocsAndExamples() {
  for (const [relativePath, texts] of Object.entries({
    "README.md": ["linear-review", "node scripts/validate-workflow.mjs", "Review/check split"],
    "AGENTS.md": ["`linear-review` = report-only quality/risk review", "Keep `linear-review` report-only"],
    "examples/zeni-dogfood.md": [
      "Risk-Based Review Gate Examples",
      "Correct Risky Handoff Review",
      "Correct Tiny Advisory Review",
      "Anti-Example: Required Review Skipped",
      "Anti-Example: Review Mutates Linear",
    ],
    "references/readiness-gates.md": ["`tiny`:", "`standard`:", "`deep`:", "`risky`:"],
    "references/artifact-quality.md": ["## PRD", "## Tech Spec", "## Issue", "## Review Findings"],
    "references/review-rubric.md": ["Allowed review verdicts:", "`ready`", "`advisory-ready`", "`needs-fixes`", "`blocked`"],
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

  const ship = read("skills/linear-ship/SKILL.md");
  if (!ship.includes("`linear-review` is report-only; `linear-ship` owns accepted pre-ship drift sync")) {
    fail("linear-ship must own accepted pre-ship drift sync");
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
