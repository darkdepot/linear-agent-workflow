#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const EXPECTED_SKILLS = [
  "mono-check",
  "mono-deploy",
  "mono-handoff",
  "mono-idea",
  "mono-implement",
  "mono-issue",
  "mono-issue-intake",
  "mono-orchestrate",
  "mono-preflight",
  "mono-prd",
  "mono-project",
  "mono-review",
  "mono-ship",
  "mono-spec",
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
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("mono-"))
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
      "### Реальные ответы бэкенда",
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
      "## Goal Contract",
      "## Engine",
      "## Context Snapshot",
      "## AFK Contract",
      "## Mailbox",
      "## Authorization",
      "Do not ask the user",
      "Never write to Linear yourself",
      "no sub-workers",
      "~/.codex/skills/",
      ".orchestrator/",
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
      "\"verification_items\"",
      "\"question\"",
      "\"recommendation\"",
      "\"linear_mutations_pending\"",
      "\"notes\"",
      "needs-decision",
      "needs-human",
      "drift-candidate",
      "## Ledger Entry",
      "## Worker Registry",
      "workers.json",
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
  const review = read("skills/mono-review/SKILL.md");
  const check = read("skills/mono-check/SKILL.md");

  for (const required of [
    "report-only",
    "must not create, update, delete, or silently repair",
    "Do not use `PASS`, `FAIL`, or `BLOCKED`",
    "`mono-review` is report-only",
  ]) {
    if (!review.includes(required)) fail(`mono-review skill boundary missing: ${required}`);
  }

  if (check.includes("templates/review-output.md") || check.includes("Linear review:") || check.includes("Ревью Linear:")) {
    fail("mono-check must not use the review output template");
  }

  if (!check.includes("Do not emit review findings")) fail("mono-check must explicitly avoid review findings");
  if (!check.includes("Never edit Project, documents, or Issues from `mono-check`")) {
    fail("mono-check must be strictly readiness-only");
  }
  if (!check.includes("return `FAIL` if the required `mono-review` gate is missing")) {
    fail("mono-check must fail missing required review gates");
  }
}

function validateLocalInstallBehavior() {
  const skillsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mono-workflow-skills-"));
  const installedResolver = path.join(skillsRoot, ".mono-agent-workflow", "scripts", "resolve-issue-context.mjs");
  const legacySkillDir = path.join(skillsRoot, "linear-check");
  const legacyLockPath = path.join(skillsRoot, ".linear-agent-workflow.lock.json");
  const legacyRuntimeDir = path.join(skillsRoot, ".linear-agent-workflow");
  try {
    expectCommandFailure(
      "install-local --check --remove-stale conflict",
      () => runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot, "--check", "--remove-stale"]),
      "--remove-stale has no effect in --check mode"
    );

    fs.mkdirSync(legacySkillDir, { recursive: true });
    fs.writeFileSync(
      path.join(legacySkillDir, "SKILL.md"),
      "<!-- Installed from darkdepot/linear-agent-workflow @ legacy. Do not edit manually. -->\n"
    );
    fs.mkdirSync(legacyRuntimeDir, { recursive: true });
    fs.writeFileSync(path.join(legacyRuntimeDir, "legacy.mjs"), "// legacy\n");
    fs.writeFileSync(
      legacyLockPath,
      `${JSON.stringify({ installedSkills: [{ name: "linear-check" }] }, null, 2)}\n`
    );

    runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot]);

    if (fs.existsSync(legacySkillDir)) fail("Local install kept previous-brand linear-check");
    if (fs.existsSync(legacyLockPath)) fail("Local install kept previous-brand lockfile");
    if (fs.existsSync(legacyRuntimeDir)) fail("Local install kept previous-brand runtime directory");

    for (const skill of EXPECTED_SKILLS) {
      const skillPath = path.join(skillsRoot, skill, "SKILL.md");
      if (!fs.existsSync(skillPath)) {
        fail(`Local install missing ${skill}`);
        continue;
      }
      const skillText = fs.readFileSync(skillPath, "utf8");
      if (!skillText.includes("Installed by Mono Agent Workflow")) {
        fail(`Local install ${skill} missing generated metadata`);
      }
      if (!skillText.includes("`.agents/mono-workflow.config.json`")) {
        fail(`Local install ${skill} missing project config note`);
      }
      if (/`skills\/mono-/.test(skillText)) {
        fail(`Local install ${skill} kept repo-root peer skill paths`);
      }
    }

    // AC3: the issue-only resolver is installed at the canonical pack-private
    // path and is runnable in the installed layout — the create-then-approve
    // intake (MONO-15) invokes it from here at delivery time.
    if (!fs.existsSync(installedResolver)) {
      fail("Local install missing the canonical issue-only resolver");
    } else {
      const probeIssue = path.join(skillsRoot, "probe-issue.md");
      fs.writeFileSync(
        probeIssue,
        ["# Probe", "", "## Что сделать", "", "- do it", "", "## Критерии приёмки", "", "- AC1: x", "", "## Как проверить", "", "1. s", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n")
      );
      const probeFp = runNode([installedResolver, "--issue", probeIssue, "--emit-fingerprint"]).trim();
      if (!/^[0-9a-f]{64}$/.test(probeFp)) {
        fail("Installed issue-only resolver must be runnable and emit a 64-hex fingerprint");
      }
      fs.rmSync(probeIssue, { force: true });
    }

    runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot, "--check"]);

    fs.appendFileSync(path.join(skillsRoot, "mono-review", "SKILL.md"), "\nBROKEN\n");
    expectCommandFailure(
      "install-local --check edited skill fixture",
      () => runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot, "--check"]),
      "stale or edited"
    );

    runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot]);
    fs.appendFileSync(path.join(skillsRoot, "mono-review", "references", "review-rubric.md"), "\nBROKEN\n");
    expectCommandFailure(
      "install-local --check edited reference fixture",
      () => runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot, "--check"]),
      "stale or edited"
    );

    // A tampered installed runtime script is caught by --check, exactly like an
    // edited skill body or reference.
    runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot]);
    fs.appendFileSync(installedResolver, "\n// BROKEN\n");
    expectCommandFailure(
      "install-local --check edited runtime script fixture",
      () => runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot, "--check"]),
      "stale or edited"
    );

    // The "missing installed runtime script" branch: a deleted resolver is
    // flagged (mirrors the copied-asset missing-file test).
    runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot]);
    fs.rmSync(installedResolver, { force: true });
    expectCommandFailure(
      "install-local --check missing runtime script fixture",
      () => runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot, "--check"]),
      "Missing installed runtime script"
    );

    // The "unexpected" branch: an extra file under the canonical scripts dir is
    // flagged (mirrors the copied-asset unexpected-file test).
    runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot]);
    fs.writeFileSync(path.join(skillsRoot, ".mono-agent-workflow", "scripts", "stray.mjs"), "// stray\n");
    expectCommandFailure(
      "install-local --check unexpected runtime script fixture",
      () => runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot, "--check"]),
      "Unexpected installed runtime script"
    );

    // The tamper scan walks the whole .mono-agent-workflow/ root: a file planted
    // one level up (not under scripts/) is flagged too.
    runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot]);
    fs.writeFileSync(path.join(skillsRoot, ".mono-agent-workflow", "evil.mjs"), "// evil\n");
    expectCommandFailure(
      "install-local --check pack-root stray file fixture",
      () => runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot, "--check"]),
      "Unexpected installed runtime script"
    );

    // schemaVersion 2 -> 3 migration: a pre-MONO-19 lockfile (v2 shape, no
    // runtimeScripts) fails --check loudly, and a re-sync upgrades it to a clean
    // v3 install that passes.
    runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot]);
    const lockPath = path.join(skillsRoot, ".mono-agent-workflow.lock.json");
    const v2Lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    v2Lock.schemaVersion = 2;
    delete v2Lock.runtimeScripts;
    fs.writeFileSync(lockPath, `${JSON.stringify(v2Lock, null, 2)}\n`);
    expectCommandFailure(
      "install-local --check schemaVersion 2 lockfile fixture",
      () => runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot, "--check"]),
      "Lockfile schemaVersion must be 3"
    );
    runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot]);
    runNode(["scripts/install-local.mjs", "--skills-root", skillsRoot, "--check"]);
  } finally {
    fs.rmSync(skillsRoot, { recursive: true, force: true });
  }
}

function validateMultiRootInstallBehavior() {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "mono-workflow-multi-root-"));
  const codexRoot = path.join(baseDir, "codex", "skills");
  const claudeRoot = path.join(baseDir, "claude", "skills");
  const recordedRoot = path.join(baseDir, "recorded", "skills");
  const lockName = ".mono-agent-workflow.lock.json";
  const env = {
    ...process.env,
    MONO_WORKFLOW_KNOWN_ROOTS: [codexRoot, claudeRoot].join(path.delimiter),
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
      if (!syncOutput.includes(`Installed ${EXPECTED_SKILLS.length} Mono workflow skills into ${skillsRoot} (version ${version})`)) {
        fail(`install-local --all-roots must report a per-root install for ${skillsRoot}`);
      }
      // AC3: every synced root gets the pack-private resolver at the canonical path.
      if (!fs.existsSync(path.join(skillsRoot, ".mono-agent-workflow", "scripts", "resolve-issue-context.mjs"))) {
        fail(`install-local --all-roots must install the issue-only resolver into ${skillsRoot}`);
      }
    }

    const checkOutput = runNode(["scripts/install-local.mjs", "--check"], { env });
    for (const skillsRoot of [codexRoot, claudeRoot]) {
      if (!checkOutput.includes(`Mono workflow local install check passed for ${skillsRoot} (version ${version})`)) {
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
    if (!recordedOutput.includes(`Installed ${EXPECTED_SKILLS.length} Mono workflow skills into ${recordedRoot}`)) {
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
    fs.appendFileSync(path.join(claudeRoot, "mono-review", "SKILL.md"), "\nBROKEN\n");
    for (const expectedText of [
      `Mono workflow local install check failed for ${claudeRoot}`,
      `Mono workflow local install check passed for ${codexRoot}`,
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
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "mono-workflow-project-"));
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

    const configPath = path.join(repo, ".agents", "mono-workflow.config.json");
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

    config.issueOnlyLane = { enabled: true, ownerPrincipal: "user_abc123" };
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    runNode(["scripts/project-config.mjs", "--repo", repo, "--check"]);

    config.issueOnlyLane = { enabled: true };
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    expectCommandFailure(
      "project-config --check issue-only lane without ownerPrincipal fixture",
      () => runNode(["scripts/project-config.mjs", "--repo", repo, "--check"]),
      "ownerPrincipal"
    );
    delete config.issueOnlyLane;
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

    config.workflows.qa = "gstack qa-only";
    config.qaAuth = "cookie-import";
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    runNode(["scripts/project-config.mjs", "--repo", repo, "--check"]);

    config.qaAuth = "shared-password";
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    expectCommandFailure(
      "project-config --check invalid qaAuth fixture",
      () => runNode(["scripts/project-config.mjs", "--repo", repo, "--check"]),
      "qaAuth"
    );

    config.qaAuth = "owner-session";
    config.workflows.qa = 42;
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    expectCommandFailure(
      "project-config --check invalid workflows.qa fixture",
      () => runNode(["scripts/project-config.mjs", "--repo", repo, "--check"]),
      "workflows.qa"
    );

    delete config.workflows.qa;
    delete config.qaAuth;
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    runNode(["scripts/project-config.mjs", "--repo", repo, "--check"]);

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

    fs.mkdirSync(path.join(repo, ".agents", "skills", "mono-idea"), { recursive: true });
    fs.writeFileSync(path.join(repo, ".agents", "skills", "mono-idea", "SKILL.md"), "legacy\n");
    expectCommandFailure(
      "project-config --check vendored skill fixture",
      () => runNode(["scripts/project-config.mjs", "--repo", repo, "--check"]),
      "Legacy Mono workflow project install file must be removed"
    );
    runNode(["scripts/project-config.mjs", "--repo", repo, "--clean", "--check"]);

    const jsonMigrationRepo = path.join(repo, "previous-json-project");
    fs.mkdirSync(path.join(jsonMigrationRepo, ".agents"), { recursive: true });
    const previousJsonConfig = {
      schemaVersion: 1,
      projectName: "Previous JSON Fixture",
      linearTeam: "Mono",
      languages: { linear: "Russian", repo: "English" },
      artifactRoots: ["plans"],
      workflows: {
        implementation: null,
        ship: "gstack ship",
        documentation: null,
        reviewFeedback: null,
        deploy: "gstack land-and-deploy",
      },
      prerequisites: { autoreviewHelper: true },
      deployApproval: "risky-only",
    };
    fs.writeFileSync(
      path.join(jsonMigrationRepo, ".agents", "linear-workflow.config.json"),
      `${JSON.stringify(previousJsonConfig, null, 2)}\n`
    );
    expectCommandFailure(
      "project-config standalone clean preserves previous-brand JSON fixture",
      () => runNode(["scripts/project-config.mjs", "--repo", jsonMigrationRepo, "--clean", "--check"]),
      "Refusing to clean the only project config"
    );
    if (!fs.existsSync(path.join(jsonMigrationRepo, ".agents", "linear-workflow.config.json"))) {
      fail("project-config standalone clean must preserve the only previous-brand JSON config");
    }
    runNode(["scripts/project-config.mjs", "--repo", jsonMigrationRepo, "--write", "--clean", "--check"]);
    const migratedJsonConfig = JSON.parse(
      fs.readFileSync(path.join(jsonMigrationRepo, ".agents", "mono-workflow.config.json"), "utf8")
    );
    if (migratedJsonConfig.projectName !== previousJsonConfig.projectName) {
      fail("project-config must preserve previous-brand JSON config during migration");
    }
    if (fs.existsSync(path.join(jsonMigrationRepo, ".agents", "linear-workflow.config.json"))) {
      fail("project-config --clean must remove the previous-brand JSON config after migration");
    }

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

function validateIssueOnlyLaneBehavior() {
  // String pins: the doc fixes the marker line, the five marker fields, the
  // 5-field contract, the marker ≠ route-record boundary, and the fail-closed
  // invariant.
  for (const pin of [
    "mono-issue-only marker",
    "Marker version: 1",
    "Scope fingerprint",
    "Acceptance IDs",
    "Risk class",
    "Approval",
    "маркер ≠ route-record",
    "route_revision",
    "assurance_vector",
    "required_artifacts",
    "package_kind",
    "lifecycle_state_entity",
    "behavioral_oracle",
    "issue-verification",
    "risk_class",
    "approval_status",
    "no marker ⇒ `package_kind=project-first`",
    "scripts/resolve-issue-context.mjs",
    "Not a spine-resolver",
    // MONO-19: config opt-in gate + the canonical installed resolver path.
    "opt-in gate",
    "issueOnlyLane.enabled: true",
    "ownerPrincipal",
    ".mono-agent-workflow/scripts/resolve-issue-context.mjs",
  ]) {
    assertIncludes("references/issue-only-lane.md", pin);
  }

  // MONO-16: downstream delivery consumes the resolver seam without changing
  // the existing Project-first path. These pins keep the prose contracts tied
  // to the executable escalation fixture below.
  for (const required of [
    "Resolve the 5-field context seam before changing lifecycle state",
    "`lifecycle_state_entity=issue`",
    "`approval_status=approved-fresh`",
    "Run `mono-check delivery` in issue-only mode",
    "Project-first branch remains unchanged",
    "A `project` lifecycle entity does not prove that Project artifacts exist",
    "A resolver integrity error (`broken marker` or `stale marker`) is a hard `needs-human` stop",
    "A successful fail-closed `project-first` result from an issue-only candidate triggers the deterministic pre-code fallback",
    "Before coding: park the Issue, supersede the marker approval, and restart Project-first",
  ]) {
    assertIncludes("skills/mono-implement/SKILL.md", required, JSON.stringify(required));
  }
  const implementDelivery = read("skills/mono-implement/SKILL.md");
  const issueOnlyDeliveryCheck = implementDelivery.indexOf("Run `mono-check delivery` in issue-only mode");
  const issueOnlyLifecycleMove = implementDelivery.indexOf("Move the **Issue** into its configured started/in-progress state");
  if (issueOnlyDeliveryCheck > issueOnlyLifecycleMove) {
    fail("mono-implement issue-only delivery check must pass before the Issue moves to started/in-progress");
  }
  for (const required of [
    "compare the diff against `behavioral_oracle` plus the live `scope_fingerprint`",
    "preserve the existing risk-escalation rule",
    "`deep` or `risky` is a `drift-candidate`",
    "do not treat it as a genuine Project-first package",
    "After `ready`: freeze the independently shippable slice",
  ]) {
    assertIncludes("skills/mono-preflight/SKILL.md", required, JSON.stringify(required));
  }
  for (const required of [
    "No in-place Issue-to-Project promotion",
    "Pre-code exit",
    "Post-`ready` exit",
    "Approval: superseded",
    "frozen approval remains valid only while the whole-body fingerprint matches",
    "separate follow-up Project",
  ]) {
    assertIncludes("references/issue-only-lane.md", required, JSON.stringify(required));
  }

  // MONO-17 / fixture 5 — parentless ship gate. The ship contract must consume
  // the same five-field seam, keep a freshly approved issue-only package out of
  // handoff, fail closed for an absent/stale marker, and preserve the mandatory
  // standard+ pre-ship review.
  for (const required of [
    "Resolve the 5-field context seam before deciding whether to route to `mono-handoff`",
    "`package_kind=issue-only` with `approval_status=approved-fresh`",
    "do not route the parentless Issue to `mono-handoff`",
    "An absent marker resolves `project-first` and routes the parentless candidate through the deterministic fallback to `mono-handoff`",
    "A `stale marker` resolver error is a hard stop that routes back to `mono-handoff`",
    "Project-first ship behavior remains unchanged",
    "Required `mono-review pre-ship` runs for `standard`, `deep`, `risky`",
  ]) {
    assertIncludes("skills/mono-ship/SKILL.md", required, JSON.stringify(required));
  }

  // MONO-17 / fixture 6 — deploy live Issue oracle. Prepare must be seam-shaped,
  // issue-only live QA must walk every Issue AC-ID, oracle drift must fail (never
  // become a skip), and design acceptance is omitted when no prototype exists.
  for (const required of [
    "Resolve the 5-field context seam before package-specific prepare fetches",
    "Project and PRD/Tech Spec as `n/a`",
    "walk every `behavioral_oracle.acceptance_ids` entry in AC1..ACn order",
    "Oracle drift is a failed live QA gate, never a skipped sweep",
    "skip design acceptance when no approved prototype exists",
    "Project-first deploy behavior remains unchanged",
  ]) {
    assertIncludes("skills/mono-deploy/SKILL.md", required, JSON.stringify(required));
  }

  // MONO-18 / fixture 7 — check modes, dispatch snapshot, and resume-discovery.
  // Every issue-only check mode must use the same verified seam instead of
  // Project/PRD/Spec presence, dispatch must carry the complete worker world,
  // and resume must discover only open, parentless, label-selected candidates
  // that re-resolve issue-only/approved-fresh.
  for (const required of [
    "Before applying `issue`, `delivery`, `pre-ship`, or `post-ship` mode requirements",
    "`package_kind=issue-only`, `lifecycle_state_entity=issue`, and `approval_status=approved-fresh`",
    "`issue` (issue-only lane)",
    "`delivery` (issue-only lane)",
    "`pre-ship` (issue-only lane)",
    "`post-ship` (issue-only lane)",
    "Missing marker or a fail-closed `project-first` result never waives Project-first requirements",
  ]) {
    assertIncludes("skills/mono-check/SKILL.md", required, JSON.stringify(required));
  }
  assertIncludes(
    "skills/mono-check/SKILL.md",
    "Project moved to Delivery with PRD and Tech Spec but no approved execution Issue or no implementation-start approval.",
    "hard-FAIL Project-in-Delivery-without-approved-Issue must remain unchanged",
  );

  for (const required of [
    "PRD: <full text, the sections relevant to this Issue, or `n/a (issue-only)`>",
    "Tech Spec: <full text, the contracts relevant to this Issue, or `n/a (issue-only)`>",
    "Issue-only marker: <current marker comment verbatim, or `n/a (project-first)`>",
    "Scope fingerprint: <fresh whole-body SHA-256, or `n/a (project-first)`>",
    "Issue-only config: <`enabled=true; ownerPrincipal=<stable Linear user ID>`, or `n/a (project-first)`>",
    "Owner approval: <authenticated author plus approved fingerprint, or `n/a (project-first)`>",
  ]) {
    assertIncludes("templates/orchestrator-dispatch.md", required, JSON.stringify(required));
  }

  for (const required of [
    "query open parentless Issues carrying the verified `issue-only` label",
    "re-run the 5-field context seam",
    "Only `package_kind=issue-only` plus `approval_status=approved-fresh` is resumable",
    "Missing label or marker is not discovered as issue-only",
    "unverified reconstruction fails closed",
  ]) {
    assertIncludes("references/orchestration.md", required, JSON.stringify(required));
  }

  // Slice 5 is the plumbing go-live, not implicit activation. Intake still
  // leaves a package non-startable; mono-implement alone moves the Issue after
  // the delivery check, and each consuming repo remains config-opt-in.
  for (const [relativePath, required] of [
    ["skills/mono-issue-intake/SKILL.md", "Intake never moves the Issue to started; `mono-implement` owns activation"],
    ["skills/mono-idea/SKILL.md", "live only when `issueOnlyLane.enabled: true` and `ownerPrincipal` are configured"],
    ["references/artifact-rules.md", "intake remains non-activating; `mono-implement` owns the later Issue lifecycle move"],
    ["references/issue-only-lane.md", "The plumbing is live, but intake remains non-activating"],
  ]) {
    assertIncludes(relativePath, required, JSON.stringify(required));
  }
  const activeProjectConfig = JSON.parse(read(".agents/mono-workflow.config.json"));
  if (activeProjectConfig.issueOnlyLane?.enabled === true) {
    fail("Slice 5 must not enable issueOnlyLane in the upstream repo's real project config");
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mono-workflow-issue-only-"));
  try {
    // MONO-19: the issue-only lane is a config opt-in. issue-only is granted only
    // when --config enables the lane AND names an owner principal. Every fixture
    // that expects issue-only — and every project-first fixture whose intent is a
    // downstream soft gate (eligibility envelope, verified label, fresh approval)
    // — passes this enabling config, so the ONLY reason it fails closed is the
    // specific gate under test. The dedicated opt-in fixtures below omit or weaken
    // it on purpose.
    const enableConfigPath = path.join(dir, "config-enabled.json");
    fs.writeFileSync(
      enableConfigPath,
      `${JSON.stringify({ schemaVersion: 1, issueOnlyLane: { enabled: true, ownerPrincipal: "user_owner_1" } }, null, 2)}\n`
    );

    const issuePath = path.join(dir, "issue.md");
    const markerPath = path.join(dir, "marker.md");
    fs.writeFileSync(
      issuePath,
      [
        "# Fixture Issue",
        "",
        "## Что сделать",
        "",
        "- SCOPE_SENTINEL build the resolver seam",
        "",
        "## Acceptance",
        "",
        "- AC1: resolver prints five fields",
        "- AC2: missing marker yields project-first",
        "",
        "## How to verify",
        "",
        "1. run resolver on a valid marker",
        "2. run resolver with no marker",
        "",
        "## Что не входит",
        "",
        "- NONGOALS_SENTINEL skill wiring",
        "",
        "## Ревью-гейт",
        "",
        "- REVIEWGATE_SENTINEL standard, pre-ship review",
        "",
      ].join("\n")
    );

    const writeMarker = (fields) =>
      fs.writeFileSync(markerPath, `${["mono-issue-only marker", ...fields].join("\n")}\n`);

    // Fixture 1 — legacy-unchanged: a project-first issue (no marker) resolves
    // to project-first. The lane never activates without a marker.
    const legacy = JSON.parse(runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath]));
    if (legacy.package_kind !== "project-first") fail("resolve-issue-context legacy issue must be project-first");
    if (legacy.lifecycle_state_entity !== "project") fail("resolve-issue-context project-first must read the Project lifecycle entity");
    if (legacy.behavioral_oracle !== null) fail("resolve-issue-context project-first must have no behavioral oracle");
    if (legacy.risk_class !== null) fail("resolve-issue-context project-first must not synthesize a risk class");
    if (legacy.approval_status !== "absent") fail("resolve-issue-context project-first approval must be absent");

    // Compute the correct fingerprint via the resolver's own helper so the
    // happy fixture never duplicates the hash.
    const fingerprint = runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--emit-fingerprint"]).trim();

    // The two trusted, caller-verified signals every issue-only resolution needs
    // on top of a valid marker: the verified issue-only label and the owner-
    // approval fingerprint the caller confirmed against the authenticated comment.
    const issueOnlyArgs = ["--label", "issue-only", "--approval-verified", fingerprint];

    // Fixture 2 — happy: a valid marker plus both trusted signals resolves the
    // five fields correctly.
    writeMarker([
      "Marker version: 1",
      `Scope fingerprint: ${fingerprint}`,
      "Acceptance IDs: AC1, AC2",
      "Risk class: standard",
      `Approval: ${fingerprint} (approved by owner)`,
    ]);
    const happy = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath, "--config", enableConfigPath, ...issueOnlyArgs])
    );
    if (happy.package_kind !== "issue-only") fail("resolve-issue-context valid marker must be issue-only");
    if (happy.lifecycle_state_entity !== "issue") fail("resolve-issue-context issue-only must read the Issue lifecycle entity");
    if (!happy.behavioral_oracle || happy.behavioral_oracle.kind !== "issue-verification") {
      fail("resolve-issue-context issue-only oracle kind must be issue-verification");
    }
    if (JSON.stringify(happy.behavioral_oracle?.acceptance_ids) !== JSON.stringify(["AC1", "AC2"])) {
      fail("resolve-issue-context issue-only oracle must carry the Issue acceptance IDs");
    }
    if (!Array.isArray(happy.behavioral_oracle?.verify_steps) || happy.behavioral_oracle.verify_steps.length !== 2) {
      fail("resolve-issue-context issue-only oracle must carry the Issue verify steps");
    }
    if (happy.risk_class !== "standard") fail("resolve-issue-context issue-only must read the recorded risk class");
    if (happy.approval_status !== "approved-fresh") {
      fail("resolve-issue-context issue-only approval must be approved-fresh when the fingerprint matches");
    }

    // Fixture 7 — resume-discovery. Linear narrows the scan to open,
    // parentless Issues carrying the verified issue-only label; the resuming
    // orchestrator then re-runs the seam and trusts only approved-fresh results.
    const isResumeDiscoveryCandidate = ({ parentProject, statusType, labels, seam, reconstructionVerified }) =>
      parentProject === null &&
      !["completed", "canceled"].includes(statusType) &&
      labels.includes("issue-only") &&
      reconstructionVerified === true &&
      seam.package_kind === "issue-only" &&
      seam.lifecycle_state_entity === "issue" &&
      seam.approval_status === "approved-fresh";
    const resumeCandidate = {
      parentProject: null,
      statusType: "started",
      labels: ["issue-only"],
      seam: happy,
      reconstructionVerified: true,
    };
    if (!isResumeDiscoveryCandidate(resumeCandidate)) {
      fail("resume-discovery fixture must recover an open parentless issue-only Issue");
    }
    const resumeWithoutLabelSeam = JSON.parse(
      runNode([
        "scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath,
        "--config", enableConfigPath, "--approval-verified", fingerprint,
      ])
    );
    if (isResumeDiscoveryCandidate({ ...resumeCandidate, labels: [], seam: resumeWithoutLabelSeam })) {
      fail("resume-discovery fixture must not recover a candidate without the issue-only label");
    }
    const resumeWithoutMarkerSeam = JSON.parse(
      runNode([
        "scripts/resolve-issue-context.mjs", "--issue", issuePath,
        "--config", enableConfigPath, ...issueOnlyArgs,
      ])
    );
    if (isResumeDiscoveryCandidate({ ...resumeCandidate, seam: resumeWithoutMarkerSeam })) {
      fail("resume-discovery fixture must not recover a candidate without the marker");
    }
    if (isResumeDiscoveryCandidate({ ...resumeCandidate, reconstructionVerified: false })) {
      fail("resume-discovery fixture must fail closed when reconstruction evidence is unverified");
    }

    // Fixture 5 runtime proof: the `happy` assertions above prove the valid
    // marker + trusted approval route is issue-only/approved-fresh. This second
    // invocation proves the same parentless candidate with no marker fails
    // closed to project-first, completing the two ship routes without rechecking
    // the already-proven happy object.
    const parentlessShipAbsent = JSON.parse(
      runNode([
        "scripts/resolve-issue-context.mjs", "--issue", issuePath,
        "--config", enableConfigPath, ...issueOnlyArgs,
      ])
    );
    if (
      parentlessShipAbsent.package_kind !== "project-first" ||
      parentlessShipAbsent.approval_status !== "absent"
    ) {
      fail("parentless-ship absent marker fixture must route back through project-first fallback");
    }

    // Fixture 6 runtime proof: deploy's live checklist is exactly the Issue
    // oracle AC-ID sequence. Editing an oracle criterion after approval makes
    // the marker stale and is a failure, not an excusable not-run sweep.
    const liveOracleChecklist = happy.behavioral_oracle?.acceptance_ids;
    if (JSON.stringify(liveOracleChecklist) !== JSON.stringify(["AC1", "AC2"])) {
      fail("live-oracle fixture checklist must equal the Issue behavioral_oracle AC-ID sequence");
    }
    const oracleDriftPath = path.join(dir, "issue-live-oracle-drift.md");
    fs.writeFileSync(
      oracleDriftPath,
      fs.readFileSync(issuePath, "utf8").replace(
        "AC2: missing marker yields project-first",
        "AC2: drifted live behavior",
      ),
    );
    expectCommandFailure(
      "resolve-issue-context live-oracle drift fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", oracleDriftPath,
          "--marker", markerPath, "--config", enableConfigPath, ...issueOnlyArgs,
        ]),
      "issue-only-lane: stale marker",
    );

    // Brand migration compatibility: previously approved durable Linear
    // comments keep resolving. New writes use mono; reads accept the old marker.
    fs.writeFileSync(
      markerPath,
      `${[
        "linear-issue-only marker",
        "Marker version: 1",
        `Scope fingerprint: ${fingerprint}`,
        "Acceptance IDs: AC1, AC2",
        "Risk class: standard",
        `Approval: ${fingerprint}`,
      ].join("\n")}\n`
    );
    const previousBrandMarker = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath, "--config", enableConfigPath, ...issueOnlyArgs])
    );
    if (previousBrandMarker.package_kind !== "issue-only") {
      fail("resolve-issue-context must preserve previous-brand durable marker approvals");
    }

    // Guard (must-fix #3): the fingerprint binds the FULL Issue contract, not
    // just acceptance + verify. Mutating the scope or the non-goals section must
    // change the fingerprint, so an approval can never survive a contract change.
    const emitFingerprint = (issueFile) =>
      runNode(["scripts/resolve-issue-context.mjs", "--issue", issueFile, "--emit-fingerprint"]).trim();
    const fullBody = fs.readFileSync(issuePath, "utf8");
    for (const [sentinel, label] of [
      ["SCOPE_SENTINEL", "scope/what-to-do"],
      ["NONGOALS_SENTINEL", "non-goals"],
      ["REVIEWGATE_SENTINEL", "review-gate risk"],
    ]) {
      const mutatedPath = path.join(dir, `issue-mutated-${sentinel}.md`);
      fs.writeFileSync(mutatedPath, fullBody.replace(sentinel, `${sentinel}_MUTATED`));
      if (emitFingerprint(mutatedPath) === fingerprint) {
        fail(`resolve-issue-context fingerprint must cover the ${label} section`);
      }
    }

    // Guard: issue-only requires BOTH the verified label AND a fresh caller-
    // verified approval. Drop either and a fully valid marker fails closed to
    // project-first — marker text alone never activates the lane.
    writeMarker([
      "Marker version: 1",
      `Scope fingerprint: ${fingerprint}`,
      "Acceptance IDs: AC1, AC2",
      "Risk class: standard",
      `Approval: ${fingerprint}`,
    ]);
    const noLabel = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath, "--config", enableConfigPath, "--approval-verified", fingerprint])
    );
    if (noLabel.package_kind !== "project-first") {
      fail("resolve-issue-context must fail closed to project-first without the verified issue-only label");
    }
    // A full label name is matched — "not issue-only" (one label with a space) is
    // not the "issue-only" opt-in and must not activate the lane.
    const wrongLabel = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath, "--config", enableConfigPath, "--label", "not issue-only", "--approval-verified", fingerprint])
    );
    if (wrongLabel.package_kind !== "project-first") {
      fail("resolve-issue-context must match the full label name, not a bare word inside a longer label");
    }
    const noApproval = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath, "--config", enableConfigPath, "--label", "issue-only"])
    );
    if (noApproval.package_kind !== "project-first") {
      fail("resolve-issue-context must fail closed to project-first without a caller-verified approval");
    }
    const wrongApproval = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath, "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", "0000deadbeef"])
    );
    if (wrongApproval.package_kind !== "project-first") {
      fail("resolve-issue-context must fail closed to project-first when the caller-verified approval does not match the scope fingerprint");
    }

    // Fixture 3 — missing-marker: a marker source without the marker line is
    // fail-closed to project-first (never silently issue-only).
    const emptyMarkerPath = path.join(dir, "empty.md");
    fs.writeFileSync(emptyMarkerPath, "no marker here\n");
    const missing = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", emptyMarkerPath])
    );
    if (missing.package_kind !== "project-first") fail("resolve-issue-context missing marker must fail closed to project-first");

    // Fixture 4 — risk/scope escalation -> project-first. Start with the valid
    // standard package above, then model the two deterministic exit causes. A
    // risk reclassification to risky remains structurally valid but leaves the
    // Phase-1 envelope; a superseded approval parks pre-code scope growth. Both
    // must resolve through the same five-field seam as project-first.
    const projectFirstSeam = {
      package_kind: "project-first",
      lifecycle_state_entity: "project",
      behavioral_oracle: null,
      risk_class: null,
      approval_status: "absent",
    };
    const riskEscalatedIssuePath = path.join(dir, "issue-risk-escalated.md");
    const riskEscalatedMarkerPath = path.join(dir, "marker-risk-escalated.md");
    const riskEscalatedBody = fullBody.replace(
      "REVIEWGATE_SENTINEL standard, pre-ship review",
      "REVIEWGATE_SENTINEL risky, pre-ship review (diff reclassified)"
    );
    fs.writeFileSync(riskEscalatedIssuePath, riskEscalatedBody);
    const riskEscalatedFingerprint = emitFingerprint(riskEscalatedIssuePath);
    fs.writeFileSync(
      riskEscalatedMarkerPath,
      `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${riskEscalatedFingerprint}`, "Acceptance IDs: AC1, AC2", "Risk class: risky", `Approval: ${riskEscalatedFingerprint}`].join("\n")}\n`
    );
    const riskEscalated = JSON.parse(
      runNode([
        "scripts/resolve-issue-context.mjs", "--issue", riskEscalatedIssuePath,
        "--marker", riskEscalatedMarkerPath, "--config", enableConfigPath,
        "--label", "issue-only", "--approval-verified", riskEscalatedFingerprint,
      ])
    );
    if (JSON.stringify(riskEscalated) !== JSON.stringify(projectFirstSeam)) {
      fail("resolve-issue-context risky-diff escalation must fall back to the exact project-first seam contract");
    }

    fs.writeFileSync(
      markerPath,
      `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${fingerprint}`, "Acceptance IDs: AC1, AC2", "Risk class: standard", "Approval: superseded"].join("\n")}\n`
    );
    const scopeEscalated = JSON.parse(
      runNode([
        "scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath,
        "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", fingerprint,
      ])
    );
    if (JSON.stringify(scopeEscalated) !== JSON.stringify(projectFirstSeam)) {
      fail("resolve-issue-context pre-code scope escalation with superseded approval must fall back to the exact project-first seam contract");
    }

    // Negative halves of the fixture pin stable integrity failures: pretending
    // the risky body is still standard is a broken marker, while carrying the
    // old standard fingerprint into the risky body is stale.
    fs.writeFileSync(
      riskEscalatedMarkerPath,
      `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${riskEscalatedFingerprint}`, "Acceptance IDs: AC1, AC2", "Risk class: standard", `Approval: ${riskEscalatedFingerprint}`].join("\n")}\n`
    );
    expectCommandFailure(
      "resolve-issue-context risk-escalation downgrade fixture",
      () => runNode([
        "scripts/resolve-issue-context.mjs", "--issue", riskEscalatedIssuePath,
        "--marker", riskEscalatedMarkerPath, "--config", enableConfigPath,
        "--label", "issue-only", "--approval-verified", riskEscalatedFingerprint,
      ]),
      "issue-only-lane: broken marker: marker Risk class"
    );
    fs.writeFileSync(
      riskEscalatedMarkerPath,
      `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${fingerprint}`, "Acceptance IDs: AC1, AC2", "Risk class: risky", `Approval: ${fingerprint}`].join("\n")}\n`
    );
    expectCommandFailure(
      "resolve-issue-context risk-escalation stale-scope fixture",
      () => runNode([
        "scripts/resolve-issue-context.mjs", "--issue", riskEscalatedIssuePath,
        "--marker", riskEscalatedMarkerPath, "--config", enableConfigPath,
        "--label", "issue-only", "--approval-verified", fingerprint,
      ]),
      "issue-only-lane: stale marker"
    );

    // Guard: a prose MENTION of the marker line (not standalone) is not a marker —
    // an Issue documenting the convention still resolves to project-first, never a
    // spurious broken-marker hard failure (this repo's own Issues do this).
    const proseIssuePath = path.join(dir, "issue-prose-mention.md");
    fs.writeFileSync(
      proseIssuePath,
      [
        "# Prose mention",
        "",
        "## Что сделать",
        "",
        "Document the `mono-issue-only marker` convention; Marker version: 1 is inline prose.",
        "",
        "## Критерии приёмки",
        "",
        "- AC1: x",
        "",
        "## Как проверить",
        "",
        "1. step",
        "",
        "## Ревью-гейт",
        "",
        "- standard",
        "",
      ].join("\n")
    );
    const prose = JSON.parse(runNode(["scripts/resolve-issue-context.mjs", "--issue", proseIssuePath]));
    if (prose.package_kind !== "project-first") {
      fail("resolve-issue-context must treat a prose mention of the marker line as project-first, not a marker");
    }

    // Guard: a fenced code block inside a section does not truncate it — a
    // `# comment` inside a ``` fence must not drop the rest of the scope out of
    // the fingerprint, or scope drift after the fence would go undetected.
    const fencedBase = [
      "# Fenced",
      "",
      "## Что сделать",
      "",
      "```sh",
      "# setup step (a comment, not a heading)",
      "run build",
      "```",
      "",
      "FENCED_TAIL after the fence is still scope.",
      "",
      "## Критерии приёмки",
      "",
      "- AC1: x",
      "",
      "## Как проверить",
      "",
      "1. step",
      "",
      "## Ревью-гейт",
      "",
      "- standard",
      "",
    ].join("\n");
    const fencedPath = path.join(dir, "issue-fenced.md");
    fs.writeFileSync(fencedPath, fencedBase);
    const fencedFp = emitFingerprint(fencedPath);
    const fencedMutPath = path.join(dir, "issue-fenced-mut.md");
    fs.writeFileSync(fencedMutPath, fencedBase.replace("FENCED_TAIL", "FENCED_TAIL_MUTATED"));
    if (emitFingerprint(fencedMutPath) === fencedFp) {
      fail("resolve-issue-context fingerprint must include scope after a fenced code block (a fence must not truncate the section)");
    }

    // Guard: semantic indentation is part of the fingerprint — re-indenting a
    // fenced code block in the scope changes the hash, so no meaning-changing
    // whitespace edit can slip past an existing approval.
    const indentA = ["# Ind", "", "## Что сделать", "", "```python", "def f():", "    return 1", "```", "", "## Критерии приёмки", "", "- AC1: x", "", "## Как проверить", "", "1. s", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const indentAPath = path.join(dir, "issue-indent-a.md");
    const indentBPath = path.join(dir, "issue-indent-b.md");
    fs.writeFileSync(indentAPath, indentA);
    fs.writeFileSync(indentBPath, indentA.replace("    return 1", "        return 1"));
    if (emitFingerprint(indentAPath) === emitFingerprint(indentBPath)) {
      fail("resolve-issue-context fingerprint must be sensitive to semantic indentation in the scope");
    }

    // Guard: the full 64-hex sha256 is emitted, never a truncated hash (a short
    // hash is a collision target for the approval binding).
    if (!/^[0-9a-f]{64}$/.test(emitFingerprint(indentAPath))) {
      fail("resolve-issue-context must emit the full 64-hex sha256 fingerprint");
    }

    // Guard: a nested subsection under a normative heading still participates in
    // the fingerprint — content under `### Edge cases` inside `## Что сделать` is
    // hashed, so edits there invalidate an approval.
    const nestedBase = (tail) =>
      ["# N", "", "## Что сделать", "", "intro line", "", "### Edge cases", "", tail, "", "## Критерии приёмки", "", "- AC1: x", "", "## Как проверить", "", "1. s", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const nestedAPath = path.join(dir, "issue-nested-a.md");
    const nestedBPath = path.join(dir, "issue-nested-b.md");
    fs.writeFileSync(nestedAPath, nestedBase("handle empty input"));
    fs.writeFileSync(nestedBPath, nestedBase("handle HUGE input differently"));
    if (emitFingerprint(nestedAPath) === emitFingerprint(nestedBPath)) {
      fail("resolve-issue-context fingerprint must include content under nested subsections");
    }

    // Guard: section boundaries are canonically encoded — moving a "---"-delimited
    // fragment from one section into an adjacent one changes the fingerprint (a
    // raw delimiter join would let it collide).
    const boundary = (scope, desired) =>
      ["# B", "", "## Что сделать", "", scope, "", "## Желаемое поведение", "", desired, "", "## Критерии приёмки", "", "- AC1: x", "", "## Как проверить", "", "1. s", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const boundaryAPath = path.join(dir, "issue-boundary-a.md");
    const boundaryBPath = path.join(dir, "issue-boundary-b.md");
    fs.writeFileSync(boundaryAPath, boundary("keep", "moved"));
    fs.writeFileSync(boundaryBPath, boundary("keep\n\n---\n\nmoved", ""));
    if (emitFingerprint(boundaryAPath) === emitFingerprint(boundaryBPath)) {
      fail("resolve-issue-context fingerprint must unambiguously encode section boundaries");
    }

    // Guard: a fenced EXAMPLE of the marker format is not an opt-in — an Issue
    // documenting the format in a code fence still resolves to project-first.
    const fencedMarkerPath = path.join(dir, "issue-fenced-marker.md");
    fs.writeFileSync(
      fencedMarkerPath,
      ["# Doc", "", "## Что сделать", "", "Example marker format:", "", "```text", "mono-issue-only marker", "Marker version: 1", "Scope fingerprint: abc", "Acceptance IDs: AC1", "Risk class: standard", "Approval: none", "```", "", "## Критерии приёмки", "", "- AC1: x", "", "## Как проверить", "", "1. s", "", "## Ревью-гейт", "", "- standard", ""].join("\n")
    );
    const fencedMarker = JSON.parse(runNode(["scripts/resolve-issue-context.mjs", "--issue", fencedMarkerPath]));
    if (fencedMarker.package_kind !== "project-first") {
      fail("resolve-issue-context must treat a fenced marker example as project-first, not an opt-in");
    }

    // Guard: fence type/length is tracked — a ~~~ line inside a ```text block does
    // not close it, so a `# heading` inside the block cannot truncate the section.
    const fenceTypeBase = (tail) =>
      ["# FT", "", "## Что сделать", "", "```text", "~~~", "# not a real heading", tail, "```", "", "## Критерии приёмки", "", "- AC1: x", "", "## Как проверить", "", "1. s", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const fenceTypeAPath = path.join(dir, "issue-fencetype-a.md");
    const fenceTypeBPath = path.join(dir, "issue-fencetype-b.md");
    fs.writeFileSync(fenceTypeAPath, fenceTypeBase("payload one"));
    fs.writeFileSync(fenceTypeBPath, fenceTypeBase("payload two"));
    if (emitFingerprint(fenceTypeAPath) === emitFingerprint(fenceTypeBPath)) {
      fail("resolve-issue-context fence tracking must honor fence type so nested content stays in the section");
    }

    // Guard: a duplicate normative section is not ignored — content in a SECOND
    // `## Что сделать` is hashed too, so it cannot change post-approval unnoticed.
    const dupBase = (second) =>
      ["# Dup", "", "## Что сделать", "", "first scope", "", "## Что сделать", "", second, "", "## Критерии приёмки", "", "- AC1: x", "", "## Как проверить", "", "1. s", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const dupAPath = path.join(dir, "issue-dup-a.md");
    const dupBPath = path.join(dir, "issue-dup-b.md");
    fs.writeFileSync(dupAPath, dupBase("second scope A"));
    fs.writeFileSync(dupBPath, dupBase("second scope B"));
    if (emitFingerprint(dupAPath) === emitFingerprint(dupBPath)) {
      fail("resolve-issue-context fingerprint must include duplicate normative sections");
    }

    // Guard: an issue-only package must be a self-contained Issue — missing
    // scope/behavior or non-goals is rejected even with valid acceptance + verify.
    const incompletePath = path.join(dir, "issue-incomplete.md");
    fs.writeFileSync(
      incompletePath,
      ["# Incomplete", "", "## Критерии приёмки", "", "- AC1: x", "", "## Как проверить", "", "1. s", "", "## Ревью-гейт", "", "- standard", ""].join("\n")
    );
    const incompleteFp = emitFingerprint(incompletePath);
    const incompleteMarkerPath = path.join(dir, "marker-incomplete.md");
    fs.writeFileSync(
      incompleteMarkerPath,
      `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${incompleteFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${incompleteFp}`].join("\n")}\n`
    );
    expectCommandFailure(
      "resolve-issue-context incomplete contract fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", incompletePath, "--marker", incompleteMarkerPath,
          "--label", "issue-only", "--approval-verified", incompleteFp,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: an INLINE marker (marker source defaults to the issue body) is
    // stripped before hashing, so its own fingerprint field does not change the
    // hash — the package resolves issue-only, never self-referentially stale.
    const inlineBody = ["# Inline", "", "## Что сделать", "", "- do it", "", "## Критерии приёмки", "", "- AC1: x", "- AC2: y", "", "## Как проверить", "", "1. s", "2. t", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const inlinePath = path.join(dir, "issue-inline.md");
    fs.writeFileSync(inlinePath, inlineBody);
    const inlineFp = emitFingerprint(inlinePath);
    fs.writeFileSync(
      inlinePath,
      `${inlineBody}\nmono-issue-only marker\nMarker version: 1\nScope fingerprint: ${inlineFp}\nAcceptance IDs: AC1, AC2\nRisk class: standard\nApproval: ${inlineFp}\n`
    );
    const inlineResolved = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", inlinePath, "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", inlineFp])
    );
    if (inlineResolved.package_kind !== "issue-only") {
      fail("resolve-issue-context inline marker must be stripped before hashing so it resolves issue-only, not stale");
    }

    // Guard: most-recent-wins recovery for INLINE markers — a renewed (second)
    // inline marker is authoritative, and BOTH the superseded and the fresh blocks
    // are stripped before hashing, so an old block (stale fingerprint, higher risk)
    // never binds into the fingerprint or contaminates the review-gate class.
    const renewBody = ["# Renew", "", "## Что сделать", "", "- do it", "", "## Критерии приёмки", "", "- AC1: x", "- AC2: y", "", "## Как проверить", "", "1. s", "2. t", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const renewPath = path.join(dir, "issue-renew.md");
    fs.writeFileSync(renewPath, renewBody);
    const renewFp = emitFingerprint(renewPath);
    fs.writeFileSync(
      renewPath,
      `${renewBody}\nmono-issue-only marker\nMarker version: 1\nScope fingerprint: deadbeefdead\nAcceptance IDs: AC1, AC2\nRisk class: deep\nApproval: deadbeefdead\n\nmono-issue-only marker\nMarker version: 1\nScope fingerprint: ${renewFp}\nAcceptance IDs: AC1, AC2\nRisk class: standard\nApproval: ${renewFp}\n`
    );
    const renewResolved = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", renewPath, "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", renewFp])
    );
    if (renewResolved.package_kind !== "issue-only") {
      fail("resolve-issue-context must strip ALL inline markers (superseded + fresh) and honor the newest, so a renewed inline marker resolves issue-only");
    }

    // Guard: negative headings are not miscounted as behavior — an English Issue
    // with only Non-goals (plus acceptance + verify) has no described behavior and
    // is rejected, not admitted as a self-contained package.
    const negHeadingPath = path.join(dir, "issue-neg-heading.md");
    fs.writeFileSync(
      negHeadingPath,
      ["# Neg", "", "## Acceptance", "", "- AC1: x", "", "## How to verify", "", "1. s", "", "## Non-goals", "", "- out of scope thing", "", "## Review gate", "", "- standard", ""].join("\n")
    );
    const negFp = emitFingerprint(negHeadingPath);
    const negMarkerPath = path.join(dir, "marker-neg.md");
    fs.writeFileSync(
      negMarkerPath,
      `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${negFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${negFp}`].join("\n")}\n`
    );
    expectCommandFailure(
      "resolve-issue-context negative-heading behavior fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", negHeadingPath, "--marker", negMarkerPath,
          "--label", "issue-only", "--approval-verified", negFp,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: a verification given as a bare command block (no list) is a valid
    // step, not "no steps" — the package resolves issue-only and the command is
    // preserved in the oracle's verify_steps.
    const cmdVerifyBody = ["# Cmd", "", "## Что сделать", "", "- do it", "", "## Критерии приёмки", "", "- AC1: x", "", "## Как проверить", "", "```sh", "npm test", "```", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const cmdVerifyPath = path.join(dir, "issue-cmd-verify.md");
    fs.writeFileSync(cmdVerifyPath, cmdVerifyBody);
    const cmdVerifyFp = emitFingerprint(cmdVerifyPath);
    const cmdVerifyMarkerPath = path.join(dir, "marker-cmd-verify.md");
    fs.writeFileSync(
      cmdVerifyMarkerPath,
      `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${cmdVerifyFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${cmdVerifyFp}`].join("\n")}\n`
    );
    const cmdVerify = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", cmdVerifyPath, "--marker", cmdVerifyMarkerPath, "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", cmdVerifyFp])
    );
    if (cmdVerify.package_kind !== "issue-only") {
      fail("resolve-issue-context must accept a bare command-block verification as a valid step");
    }
    if (!cmdVerify.behavioral_oracle.verify_steps.some((step) => step.includes("npm test"))) {
      fail("resolve-issue-context must preserve command-block content in verify_steps");
    }

    // Guard: an over-broad positive-scope heading is not counted as behavior — an
    // Issue whose only scope-ish heading is "Scope exclusions" (a negative) has no
    // described behavior and is rejected as not self-contained.
    const scopeExclPath = path.join(dir, "issue-scope-excl.md");
    fs.writeFileSync(
      scopeExclPath,
      ["# SE", "", "## Scope exclusions", "", "- not this", "", "## Acceptance", "", "- AC1: x", "", "## How to verify", "", "1. s", "", "## Out of scope", "", "- nor that", "", "## Review gate", "", "- standard", ""].join("\n")
    );
    const scopeExclFp = emitFingerprint(scopeExclPath);
    const scopeExclMarkerPath = path.join(dir, "marker-scope-excl.md");
    fs.writeFileSync(
      scopeExclMarkerPath,
      `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${scopeExclFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${scopeExclFp}`].join("\n")}\n`
    );
    expectCommandFailure(
      "resolve-issue-context scope-exclusions heading fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", scopeExclPath, "--marker", scopeExclMarkerPath,
          "--label", "issue-only", "--approval-verified", scopeExclFp,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: verify_steps splits only on TOP-LEVEL items — a nested item and a
    // fenced "2." line stay in their parent step, matching the section structure.
    const nestedVerifyBody = ["# NV", "", "## Что сделать", "", "- do it", "", "## Критерии приёмки", "", "- AC1: x", "", "## Как проверить", "", "1. Run the check:", "   - confirm the result", "   ```sh", "   2. not a step", "   ```", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const nestedVerifyPath = path.join(dir, "issue-nested-verify.md");
    fs.writeFileSync(nestedVerifyPath, nestedVerifyBody);
    const nvFp = emitFingerprint(nestedVerifyPath);
    const nvMarkerPath = path.join(dir, "marker-nv.md");
    fs.writeFileSync(nvMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${nvFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${nvFp}`].join("\n")}\n`);
    const nv = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", nestedVerifyPath, "--marker", nvMarkerPath, "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", nvFp])
    );
    if (nv.package_kind !== "issue-only") fail("resolve-issue-context nested-verify fixture must resolve issue-only");
    if (nv.behavioral_oracle.verify_steps.length !== 1) {
      fail("resolve-issue-context must split verify_steps only on top-level items (nested item + fenced line are not separate steps)");
    }

    // Guard: a behavior section whose content starts with a nested subheading is
    // still described behavior (extractSection keeps nested subsections).
    const nestedBehaviorBody = ["# NB", "", "## Что сделать", "", "### Details", "", "- the actual scope", "", "## Критерии приёмки", "", "- AC1: x", "", "## Как проверить", "", "1. s", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const nestedBehaviorPath = path.join(dir, "issue-nested-behavior.md");
    fs.writeFileSync(nestedBehaviorPath, nestedBehaviorBody);
    const nbFp = emitFingerprint(nestedBehaviorPath);
    const nbMarkerPath = path.join(dir, "marker-nb.md");
    fs.writeFileSync(nbMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${nbFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${nbFp}`].join("\n")}\n`);
    const nb = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", nestedBehaviorPath, "--marker", nbMarkerPath, "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", nbFp])
    );
    if (nb.package_kind !== "issue-only") {
      fail("resolve-issue-context must count a behavior section starting with a nested subheading as described behavior");
    }

    // Guard: a behavior heading whose only content is an EMPTY fenced block has no
    // substantive content and is rejected — a fence marker is not behavior.
    const emptyFenceBody = ["# EF", "", "## Что сделать", "", "```", "```", "", "## Критерии приёмки", "", "- AC1: x", "", "## Как проверить", "", "1. s", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const emptyFencePath = path.join(dir, "issue-empty-fence.md");
    fs.writeFileSync(emptyFencePath, emptyFenceBody);
    const efFp = emitFingerprint(emptyFencePath);
    const efMarkerPath = path.join(dir, "marker-ef.md");
    fs.writeFileSync(efMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${efFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${efFp}`].join("\n")}\n`);
    expectCommandFailure(
      "resolve-issue-context empty-fence behavior fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", emptyFencePath, "--marker", efMarkerPath,
          "--label", "issue-only", "--approval-verified", efFp,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: stripMarkerBlock removes ONLY recognized marker fields — normative
    // text like "Endpoint: /admin/delete" after a (superseded) marker line stays
    // in the fingerprint, so changing it stales the approval.
    const afterMarker = (endpoint) =>
      ["# AM", "", "## Что сделать", "", "mono-issue-only marker", "Marker version: 1", "Scope fingerprint: deadbeefdead", "Acceptance IDs: AC1", "Risk class: standard", "Approval: none", `Endpoint: ${endpoint}`, "", "## Критерии приёмки", "", "- AC1: x", "", "## Как проверить", "", "1. s", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const amAPath = path.join(dir, "issue-am-a.md");
    const amBPath = path.join(dir, "issue-am-b.md");
    fs.writeFileSync(amAPath, afterMarker("/admin/read"));
    fs.writeFileSync(amBPath, afterMarker("/admin/delete"));
    if (emitFingerprint(amAPath) === emitFingerprint(amBPath)) {
      fail("resolve-issue-context must keep non-marker content after a marker line in the fingerprint");
    }

    // Guard: a meaning-changing heading rename changes the fingerprint — the
    // matched heading text is bound into the hash, so "Scope" vs "Scope exclusions"
    // (mapping the same body) are distinct.
    const renameBody = (scopeHeading) =>
      ["# RN", "", `## ${scopeHeading}`, "", "- the body", "", "## Objective", "", "the objective", "", "## Критерии приёмки", "", "- AC1: x", "", "## Как проверить", "", "1. s", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const rnAPath = path.join(dir, "issue-rn-a.md");
    const rnBPath = path.join(dir, "issue-rn-b.md");
    fs.writeFileSync(rnAPath, renameBody("Scope"));
    fs.writeFileSync(rnBPath, renameBody("Scope exclusions"));
    if (emitFingerprint(rnAPath) === emitFingerprint(rnBPath)) {
      fail("resolve-issue-context must bind the matched heading text into the fingerprint (a rename changes the hash)");
    }

    // Guard: a bare nested subheading with no body under it is not substantive
    // behavior — the completeness gate rejects it.
    const emptyNestedPath = path.join(dir, "issue-empty-nested.md");
    fs.writeFileSync(
      emptyNestedPath,
      ["# EN", "", "## Что сделать", "", "### Details", "", "## Критерии приёмки", "", "- AC1: x", "", "## Как проверить", "", "1. s", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n")
    );
    const enFp = emitFingerprint(emptyNestedPath);
    const enMarkerPath = path.join(dir, "marker-en.md");
    fs.writeFileSync(enMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${enFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${enFp}`].join("\n")}\n`);
    expectCommandFailure(
      "resolve-issue-context empty nested behavior fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", emptyNestedPath, "--marker", enMarkerPath,
          "--label", "issue-only", "--approval-verified", enFp,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: a marker with duplicate Acceptance IDs (padding the count to mask a
    // missing required id) is rejected — IDs are compared as deduped sets.
    writeMarker([
      "Marker version: 1",
      `Scope fingerprint: ${fingerprint}`,
      "Acceptance IDs: AC1, AC1",
      "Risk class: standard",
      `Approval: ${fingerprint}`,
    ]);
    expectCommandFailure(
      "resolve-issue-context duplicate acceptance id fixture",
      () => runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath, ...issueOnlyArgs]),
      "issue-only-lane: broken marker: duplicate Acceptance IDs"
    );

    // Guard: a marker line OUTSIDE a fence whose fields are all INSIDE a fenced
    // code block collects no real fields (fenced = documentation example) and
    // fails closed, never a silent issue-only even with valid label/approval args.
    const fencedFieldsMarkerPath = path.join(dir, "marker-fenced-fields.md");
    fs.writeFileSync(
      fencedFieldsMarkerPath,
      `${["mono-issue-only marker", "```text", "Marker version: 1", `Scope fingerprint: ${fingerprint}`, "Acceptance IDs: AC1, AC2", "Risk class: standard", `Approval: ${fingerprint}`, "```"].join("\n")}\n`
    );
    expectCommandFailure(
      "resolve-issue-context fenced marker fields fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", fencedFieldsMarkerPath,
          ...issueOnlyArgs,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: a heading with valid Markdown indentation (1-3 spaces) is recognized,
    // so content under an indented " ## Scope" section binds the fingerprint.
    const indentHeadingBase = (tail) =>
      ["# IH", "", " ## Что сделать", "", tail, "", "## Критерии приёмки", "", "- AC1: x", "", "## Как проверить", "", "1. s", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const ihAPath = path.join(dir, "issue-ih-a.md");
    const ihBPath = path.join(dir, "issue-ih-b.md");
    fs.writeFileSync(ihAPath, indentHeadingBase("- scope A"));
    fs.writeFileSync(ihBPath, indentHeadingBase("- scope B"));
    if (emitFingerprint(ihAPath) === emitFingerprint(ihBPath)) {
      fail("resolve-issue-context must recognize indented Markdown headings so their content binds the fingerprint");
    }

    // Guard: a behavior section whose only content is an HTML comment is not
    // substantive and is rejected — an invisible comment is not described behavior.
    const htmlCommentPath = path.join(dir, "issue-html-comment.md");
    fs.writeFileSync(
      htmlCommentPath,
      ["# HC", "", "## Что сделать", "", "<!-- TODO: fill this in -->", "", "## Критерии приёмки", "", "- AC1: x", "", "## Как проверить", "", "1. s", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n")
    );
    const hcFp = emitFingerprint(htmlCommentPath);
    const hcMarkerPath = path.join(dir, "marker-hc.md");
    fs.writeFileSync(hcMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${hcFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${hcFp}`].join("\n")}\n`);
    expectCommandFailure(
      "resolve-issue-context html-comment behavior fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", htmlCommentPath, "--marker", hcMarkerPath,
          "--label", "issue-only", "--approval-verified", hcFp,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: stripMarkerBlock skips the same leading blank lines findMarkerBlock
    // allows — an inline marker with a blank line before its fields still resolves.
    const blankInlineBody = ["# BI", "", "## Что сделать", "", "- do it", "", "## Критерии приёмки", "", "- AC1: x", "- AC2: y", "", "## Как проверить", "", "1. s", "2. t", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const blankInlinePath = path.join(dir, "issue-blank-inline.md");
    fs.writeFileSync(blankInlinePath, blankInlineBody);
    const biFp = emitFingerprint(blankInlinePath);
    fs.writeFileSync(
      blankInlinePath,
      `${blankInlineBody}\nmono-issue-only marker\n\nMarker version: 1\nScope fingerprint: ${biFp}\nAcceptance IDs: AC1, AC2\nRisk class: standard\nApproval: ${biFp}\n`
    );
    const blankInline = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", blankInlinePath, "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", biFp])
    );
    if (blankInline.package_kind !== "issue-only") {
      fail("resolve-issue-context must strip an inline marker with a leading blank line before its fields so it resolves issue-only");
    }

    // Guard: only DECLARED acceptance IDs are collected — a cross-reference in a
    // criterion's prose ("described by AC99") and an id in a fenced example are not
    // declarations, so the oracle reports exactly the declared ids.
    const crossRefBody = ["# CR", "", "## Что сделать", "", "- do it", "", "## Критерии приёмки", "", "- AC1: preserve behavior described by AC99", "- AC2: also see AC1", "", "```", "AC77: fenced example", "```", "", "## Как проверить", "", "1. s", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const crossRefPath = path.join(dir, "issue-crossref.md");
    fs.writeFileSync(crossRefPath, crossRefBody);
    const crFp = emitFingerprint(crossRefPath);
    const crMarkerPath = path.join(dir, "marker-cr.md");
    fs.writeFileSync(crMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${crFp}`, "Acceptance IDs: AC1, AC2", "Risk class: standard", `Approval: ${crFp}`].join("\n")}\n`);
    const cr = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", crossRefPath, "--marker", crMarkerPath, "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", crFp])
    );
    if (cr.package_kind !== "issue-only") fail("resolve-issue-context cross-reference fixture must resolve issue-only with declared ids only");
    if (JSON.stringify(cr.behavioral_oracle.acceptance_ids) !== JSON.stringify(["AC1", "AC2"])) {
      fail("resolve-issue-context must collect only declared acceptance IDs (not cross-references or fenced examples)");
    }

    // Guard: a clean "standard" review-gate resolves issue-only. (This base issue
    // is reused below by replacing the review-gate line to test re-tier / history
    // / chain forms.)
    const reGateA = ["# RG", "", "## Что сделать", "", "- do it", "", "## Критерии приёмки", "", "- AC1: x", "", "## Как проверить", "", "1. s", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "standard", ""].join("\n");
    const reGateAPath = path.join(dir, "issue-regate-a.md");
    fs.writeFileSync(reGateAPath, reGateA);
    const rgaFp = emitFingerprint(reGateAPath);
    const rgaMarkerPath = path.join(dir, "marker-rga.md");
    fs.writeFileSync(rgaMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${rgaFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${rgaFp}`].join("\n")}\n`);
    const rga = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", reGateAPath, "--marker", rgaMarkerPath, "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", rgaFp])
    );
    if (rga.package_kind !== "issue-only" || rga.risk_class !== "standard") {
      fail("resolve-issue-context must read the recorded review-gate class (standard), not a later 'deep' mention");
    }

    // And an explicit re-tier "standard→deep" records the target deep (out of the
    // Phase-1 envelope → project-first).
    const reGateB = reGateA.replace("standard", "standard→deep (new abstraction)");
    const reGateBPath = path.join(dir, "issue-regate-b.md");
    fs.writeFileSync(reGateBPath, reGateB);
    const rgbFp = emitFingerprint(reGateBPath);
    const rgbMarkerPath = path.join(dir, "marker-rgb.md");
    fs.writeFileSync(rgbMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${rgbFp}`, "Acceptance IDs: AC1", "Risk class: deep", `Approval: ${rgbFp}`].join("\n")}\n`);
    const rgb = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", reGateBPath, "--marker", rgbMarkerPath, "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", rgbFp])
    );
    if (rgb.package_kind !== "project-first") {
      fail("resolve-issue-context must read a 'standard→deep' re-tier as deep (out of Phase-1 envelope → project-first)");
    }

    // Guard: a DOWNWARD re-tier "deep→standard" still records the higher class
    // (deep), so a standard marker cannot downgrade it into the lane.
    const downRetier = reGateA.replace("standard", "deep→standard (scope shrank)");
    const drPath = path.join(dir, "issue-down-retier.md");
    fs.writeFileSync(drPath, downRetier);
    const drFp = emitFingerprint(drPath);
    const drMarkerPath = path.join(dir, "marker-dr.md");
    fs.writeFileSync(drMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${drFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${drFp}`].join("\n")}\n`);
    expectCommandFailure(
      "resolve-issue-context downward re-tier fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", drPath, "--marker", drMarkerPath,
          "--label", "issue-only", "--approval-verified", drFp,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: an empty acceptance declaration ("- AC1:" with no criterion text) is
    // not a usable criterion — the Issue has no acceptance and is rejected.
    const emptyAcPath = path.join(dir, "issue-empty-ac.md");
    fs.writeFileSync(
      emptyAcPath,
      ["# EA", "", "## Что сделать", "", "- do it", "", "## Критерии приёмки", "", "- AC1:", "", "## Как проверить", "", "1. run it", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n")
    );
    const eaFp = emitFingerprint(emptyAcPath);
    const eaMarkerPath = path.join(dir, "marker-ea.md");
    fs.writeFileSync(eaMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${eaFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${eaFp}`].join("\n")}\n`);
    expectCommandFailure(
      "resolve-issue-context empty acceptance criterion fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", emptyAcPath, "--marker", eaMarkerPath,
          "--label", "issue-only", "--approval-verified", eaFp,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: a verification placeholder ("1. <!-- TODO -->") is not a real step —
    // the Issue has no verification and is rejected.
    const placeholderVerifyPath = path.join(dir, "issue-placeholder-verify.md");
    fs.writeFileSync(
      placeholderVerifyPath,
      ["# PV", "", "## Что сделать", "", "- do it", "", "## Критерии приёмки", "", "- AC1: real criterion", "", "## Как проверить", "", "1. <!-- TODO -->", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n")
    );
    const pvFp = emitFingerprint(placeholderVerifyPath);
    const pvMarkerPath = path.join(dir, "marker-pv.md");
    fs.writeFileSync(pvMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${pvFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${pvFp}`].join("\n")}\n`);
    expectCommandFailure(
      "resolve-issue-context placeholder verify fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", placeholderVerifyPath, "--marker", pvMarkerPath,
          "--label", "issue-only", "--approval-verified", pvFp,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: a "## Что сделать" whose body is ONLY nested OTHER normative sections
    // has no scope description of its own and is rejected.
    const nestedForeignPath = path.join(dir, "issue-nested-foreign.md");
    fs.writeFileSync(
      nestedForeignPath,
      ["# NF", "", "## Что сделать", "", "### Критерии приёмки", "", "- AC1: real criterion", "", "### Как проверить", "", "1. run it", "", "### Что не входит", "", "- ng", "", "### Ревью-гейт", "", "- standard", ""].join("\n")
    );
    const nfFp = emitFingerprint(nestedForeignPath);
    const nfMarkerPath = path.join(dir, "marker-nf.md");
    fs.writeFileSync(nfMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${nfFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${nfFp}`].join("\n")}\n`);
    expectCommandFailure(
      "resolve-issue-context nested-foreign-sections fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", nestedForeignPath, "--marker", nfMarkerPath,
          "--label", "issue-only", "--approval-verified", nfFp,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: verify steps with valid 0-3 space indentation are separate steps.
    const indentStepsBody = ["# IS", "", "## Что сделать", "", "- do it", "", "## Критерии приёмки", "", "- AC1: real", "", "## Как проверить", "", "  1. first check", "  2. second check", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const indentStepsPath = path.join(dir, "issue-indent-steps.md");
    fs.writeFileSync(indentStepsPath, indentStepsBody);
    const isFp = emitFingerprint(indentStepsPath);
    const isMarkerPath = path.join(dir, "marker-is.md");
    fs.writeFileSync(isMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${isFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${isFp}`].join("\n")}\n`);
    const is = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", indentStepsPath, "--marker", isMarkerPath, "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", isFp])
    );
    if (is.package_kind !== "issue-only" || is.behavioral_oracle.verify_steps.length !== 2) {
      fail("resolve-issue-context must treat 0-3 space indented list items as separate verify steps");
    }

    // Guard: only the EXACT authoritative "Review gate" heading sets the class — an
    // earlier "Review gate considerations" section cannot mask the deep class and
    // downgrade the package into the lane.
    const gateDupPath = path.join(dir, "issue-gate-dup.md");
    fs.writeFileSync(
      gateDupPath,
      ["# GD", "", "## Что сделать", "", "- do it", "", "## Критерии приёмки", "", "- AC1: real", "", "## Как проверить", "", "1. run it", "", "## Что не входит", "", "- ng", "", "## Review gate considerations", "", "- standard was rejected", "", "## Review gate", "", "- deep", ""].join("\n")
    );
    const gdFp = emitFingerprint(gateDupPath);
    const gdMarkerPath = path.join(dir, "marker-gd.md");
    fs.writeFileSync(gdMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${gdFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${gdFp}`].join("\n")}\n`);
    expectCommandFailure(
      "resolve-issue-context review-gate considerations fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", gateDupPath, "--marker", gdMarkerPath,
          "--label", "issue-only", "--approval-verified", gdFp,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: a duplicate Acceptance ID declared in the issue body is ambiguous and
    // rejected, like a duplicate id in the marker.
    const dupAcPath = path.join(dir, "issue-dup-ac.md");
    fs.writeFileSync(
      dupAcPath,
      ["# DA", "", "## Что сделать", "", "- do it", "", "## Критерии приёмки", "", "- AC1: first criterion", "- AC1: second criterion, same id", "", "## Как проверить", "", "1. run it", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n")
    );
    const daFp = emitFingerprint(dupAcPath);
    const daMarkerPath = path.join(dir, "marker-da.md");
    fs.writeFileSync(daMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${daFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${daFp}`].join("\n")}\n`);
    expectCommandFailure(
      "resolve-issue-context duplicate body acceptance id fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", dupAcPath, "--marker", daMarkerPath,
          "--label", "issue-only", "--approval-verified", daFp,
        ]),
      "issue-only-lane: broken marker: duplicate Acceptance ID declared in issue body"
    );

    // Guard: a re-classification CHAIN records the highest class — "tiny→standard→
    // deep" is deep, so a standard marker cannot downgrade it into the lane.
    const chainGate = reGateA.replace("standard", "tiny→standard→deep (grew twice)");
    const chainPath = path.join(dir, "issue-chain.md");
    fs.writeFileSync(chainPath, chainGate);
    const chFp = emitFingerprint(chainPath);
    const chMarkerPath = path.join(dir, "marker-ch.md");
    fs.writeFileSync(chMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${chFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${chFp}`].join("\n")}\n`);
    expectCommandFailure(
      "resolve-issue-context re-tier chain fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", chainPath, "--marker", chMarkerPath,
          "--label", "issue-only", "--approval-verified", chFp,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: Linear task-list acceptance criteria ("- [ ] AC1: ...") are recognized.
    const checklistBody = ["# CL", "", "## Что сделать", "", "- do it", "", "## Критерии приёмки", "", "- [ ] AC1: resolver works", "- [x] AC2: marker parses", "", "## Как проверить", "", "1. run it", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const checklistPath = path.join(dir, "issue-checklist.md");
    fs.writeFileSync(checklistPath, checklistBody);
    const clFp = emitFingerprint(checklistPath);
    const clMarkerPath = path.join(dir, "marker-cl.md");
    fs.writeFileSync(clMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${clFp}`, "Acceptance IDs: AC1, AC2", "Risk class: standard", `Approval: ${clFp}`].join("\n")}\n`);
    const cl = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", checklistPath, "--marker", clMarkerPath, "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", clFp])
    );
    if (cl.package_kind !== "issue-only" || JSON.stringify(cl.behavioral_oracle.acceptance_ids) !== JSON.stringify(["AC1", "AC2"])) {
      fail("resolve-issue-context must recognize Markdown task-list acceptance criteria");
    }

    // Guard: a re-tier chain in "risk history" cannot LOWER the authoritative class
    // — "risky; previous history: tiny→standard" stays risky.
    const historyGate = reGateA.replace("standard", "risky; previous history: tiny→standard");
    const historyPath = path.join(dir, "issue-history.md");
    fs.writeFileSync(historyPath, historyGate);
    const hyFp = emitFingerprint(historyPath);
    const hyMarkerPath = path.join(dir, "marker-hy.md");
    fs.writeFileSync(hyMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${hyFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${hyFp}`].join("\n")}\n`);
    expectCommandFailure(
      "resolve-issue-context risk-history fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", historyPath, "--marker", hyMarkerPath,
          "--label", "issue-only", "--approval-verified", hyFp,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: sections hidden inside an HTML comment are invisible — an Issue whose
    // Acceptance and How-to-verify are commented out has no oracle and is rejected.
    const commentedOraclePath = path.join(dir, "issue-commented-oracle.md");
    fs.writeFileSync(
      commentedOraclePath,
      ["# CO", "", "## Что сделать", "", "- do it", "", "<!--", "## Критерии приёмки", "", "- AC1: hidden criterion", "", "## Как проверить", "", "1. hidden step", "-->", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n")
    );
    const coFp = emitFingerprint(commentedOraclePath);
    const coMarkerPath = path.join(dir, "marker-co.md");
    fs.writeFileSync(coMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${coFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${coFp}`].join("\n")}\n`);
    expectCommandFailure(
      "resolve-issue-context commented-oracle fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", commentedOraclePath, "--marker", coMarkerPath,
          "--label", "issue-only", "--approval-verified", coFp,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: the review-gate class is the MAX of all mentioned classes — a
    // "standard was proposed; Risk class: risky" section reads risky, so a
    // standard marker cannot enter the lane.
    const maxGate = reGateA.replace("standard", "standard was proposed; Risk class: risky");
    const maxPath = path.join(dir, "issue-max-gate.md");
    fs.writeFileSync(maxPath, maxGate);
    const mgFp = emitFingerprint(maxPath);
    const mgMarkerPath = path.join(dir, "marker-mg.md");
    fs.writeFileSync(mgMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${mgFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${mgFp}`].join("\n")}\n`);
    expectCommandFailure(
      "resolve-issue-context max-class review-gate fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", maxPath, "--marker", mgMarkerPath,
          "--label", "issue-only", "--approval-verified", mgFp,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: an ATX heading with a closing "#" sequence ("## Ревью-гейт ##") is
    // still recognized.
    const closingHashBody = ["# CH", "", "## Что сделать", "", "- do it", "", "## Критерии приёмки", "", "- AC1: real", "", "## Как проверить", "", "1. run", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт ##", "", "- standard", ""].join("\n");
    const closingHashPath = path.join(dir, "issue-closing-hash.md");
    fs.writeFileSync(closingHashPath, closingHashBody);
    const chhFp = emitFingerprint(closingHashPath);
    const chhMarkerPath = path.join(dir, "marker-chh.md");
    fs.writeFileSync(chhMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${chhFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${chhFp}`].join("\n")}\n`);
    const chh = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", closingHashPath, "--marker", chhMarkerPath, "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", chhFp])
    );
    if (chh.package_kind !== "issue-only") {
      fail("resolve-issue-context must recognize ATX headings with a closing hash sequence");
    }

    // Guard: a 4-space-indented ``` is indented code, NOT a fence, so it does not
    // hide the following normative headings.
    const fourSpaceFenceBody = ["# FS", "", "## Что сделать", "", "    ```", "    code indented", "", "## Критерии приёмки", "", "- AC1: real", "", "## Как проверить", "", "1. run", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const fourSpacePath = path.join(dir, "issue-four-space.md");
    fs.writeFileSync(fourSpacePath, fourSpaceFenceBody);
    const fsFp = emitFingerprint(fourSpacePath);
    const fsMarkerPath = path.join(dir, "marker-fs.md");
    fs.writeFileSync(fsMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${fsFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${fsFp}`].join("\n")}\n`);
    const fs4 = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", fourSpacePath, "--marker", fsMarkerPath, "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", fsFp])
    );
    if (fs4.package_kind !== "issue-only") {
      fail("resolve-issue-context must not treat a 4-space-indented ``` as a fence that hides later headings");
    }

    // Guard: a marker line indented 4+ spaces is a Markdown indented code block (a
    // documentation example), not an opt-in — even with an otherwise-valid inline
    // marker and matching label/approval, the Issue resolves project-first.
    const cleanImBody = ["# IM", "", "## Что сделать", "", "- do it", "", "## Критерии приёмки", "", "- AC1: real", "", "## Как проверить", "", "1. run", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const cleanImPath = path.join(dir, "issue-im-clean.md");
    fs.writeFileSync(cleanImPath, cleanImBody);
    const imFp = emitFingerprint(cleanImPath);
    const indentedMarkerPath = path.join(dir, "issue-indented-marker.md");
    fs.writeFileSync(
      indentedMarkerPath,
      `${cleanImBody}\n    mono-issue-only marker\n    Marker version: 1\n    Scope fingerprint: ${imFp}\n    Acceptance IDs: AC1\n    Risk class: standard\n    Approval: ${imFp}\n`
    );
    const im = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", indentedMarkerPath, "--label", "issue-only", "--approval-verified", imFp])
    );
    if (im.package_kind !== "project-first") {
      fail("resolve-issue-context must treat a 4-space-indented marker line as project-first, not an opt-in");
    }

    // Guard: a marker line inside an HTML comment (a commented-out example, e.g. an
    // Issue documenting the format) is not a marker — it resolves project-first,
    // never a spurious broken-marker error from parsing the commented fields.
    const commentedMarkerPath = path.join(dir, "issue-commented-marker.md");
    fs.writeFileSync(
      commentedMarkerPath,
      ["# CM", "", "## Что сделать", "", "Documents the marker format:", "", "<!--", "mono-issue-only marker", "Marker version: 1", "(fields omitted in this example)", "-->", "", "## Критерии приёмки", "", "- AC1: real", "", "## Как проверить", "", "1. run", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n")
    );
    const cmm = JSON.parse(runNode(["scripts/resolve-issue-context.mjs", "--issue", commentedMarkerPath]));
    if (cmm.package_kind !== "project-first") {
      fail("resolve-issue-context must ignore a marker line inside an HTML comment (project-first, not a broken-marker error)");
    }

    // Guard: content after an HTML comment closes mid-line ("--> real scope") is
    // visible and counts — the tail after "-->" is not skipped.
    const remainderBody = ["# RM", "", "## Что сделать", "", "<!-- placeholder note", "--> the real scope is here", "", "## Критерии приёмки", "", "- AC1: real", "", "## Как проверить", "", "1. run", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const remainderPath = path.join(dir, "issue-remainder.md");
    fs.writeFileSync(remainderPath, remainderBody);
    const rmFp = emitFingerprint(remainderPath);
    const rmMarkerPath = path.join(dir, "marker-rm.md");
    fs.writeFileSync(rmMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${rmFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${rmFp}`].join("\n")}\n`);
    const rm = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", remainderPath, "--marker", rmMarkerPath, "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", rmFp])
    );
    if (rm.package_kind !== "issue-only") {
      fail("resolve-issue-context must see content after an HTML comment closes mid-line");
    }

    // Guard: the oracle sections use EXACT headings — "## Acceptance history" and
    // "## Verify exclusions" are not the canonical acceptance/verify sections, so an
    // Issue lacking the real ones has no oracle and is rejected.
    const looseHeadingPath = path.join(dir, "issue-loose-heading.md");
    fs.writeFileSync(
      looseHeadingPath,
      ["# LH", "", "## Что сделать", "", "- do it", "", "## Acceptance history", "", "- AC1: old criterion", "", "## Verify exclusions", "", "1. not a real step", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n")
    );
    const lhFp = emitFingerprint(looseHeadingPath);
    const lhMarkerPath = path.join(dir, "marker-lh.md");
    fs.writeFileSync(lhMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${lhFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${lhFp}`].join("\n")}\n`);
    expectCommandFailure(
      "resolve-issue-context loose-oracle-heading fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", looseHeadingPath, "--marker", lhMarkerPath,
          "--label", "issue-only", "--approval-verified", lhFp,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: marker fields indented 4+ spaces are a Markdown indented code block —
    // an example with an unindented marker line and indented fields collects no
    // fields and fails closed, never a silent issue-only.
    const aFp = "a".repeat(64);
    const indentedFieldsPath = path.join(dir, "issue-indented-fields.md");
    fs.writeFileSync(
      indentedFieldsPath,
      ["# IF", "", "## Что сделать", "", "Example:", "", "mono-issue-only marker", "", `    Marker version: 1`, `    Scope fingerprint: ${aFp}`, "    Acceptance IDs: AC1", "    Risk class: standard", `    Approval: ${aFp}`, "", "## Критерии приёмки", "", "- AC1: real", "", "## Как проверить", "", "1. run", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n")
    );
    expectCommandFailure(
      "resolve-issue-context indented marker fields fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", indentedFieldsPath,
          "--label", "issue-only", "--approval-verified", aFp,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: a "<!--" inside a fenced code block is literal, not a comment — it must
    // NOT swallow the real sections after the fence.
    const commentInFenceBody = ["# CF", "", "## Что сделать", "", "```", "<!-- this is code, not a comment", "```", "", "## Критерии приёмки", "", "- AC1: real", "", "## Как проверить", "", "1. run", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const cfPath = path.join(dir, "issue-comment-in-fence.md");
    fs.writeFileSync(cfPath, commentInFenceBody);
    const cfFp = emitFingerprint(cfPath);
    const cfMarkerPath = path.join(dir, "marker-cf.md");
    fs.writeFileSync(cfMarkerPath, `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${cfFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${cfFp}`].join("\n")}\n`);
    const cf = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", cfPath, "--marker", cfMarkerPath, "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", cfFp])
    );
    if (cf.package_kind !== "issue-only") {
      fail("resolve-issue-context must treat <!-- inside a fence as literal, not swallow the following sections");
    }

    // Guard: marker fields with a mixed space+tab indent reaching 4 columns are
    // indented code, not fields — fail closed (the old space-only check missed this).
    const tabFp = "b".repeat(64);
    const tabFieldsPath = path.join(dir, "issue-tab-fields.md");
    fs.writeFileSync(
      tabFieldsPath,
      ["# TF", "", "## Что сделать", "", "mono-issue-only marker", "", "  \tMarker version: 1", `  \tScope fingerprint: ${tabFp}`, "  \tAcceptance IDs: AC1", "  \tRisk class: standard", `  \tApproval: ${tabFp}`, "", "## Критерии приёмки", "", "- AC1: real", "", "## Как проверить", "", "1. run", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n")
    );
    expectCommandFailure(
      "resolve-issue-context tab-indented marker fields fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", tabFieldsPath,
          "--label", "issue-only", "--approval-verified", tabFp,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: a 4+-column-indented recognized-key line after an inline marker is
    // Markdown code, not a field — stripMarkerBlock leaves it in the whole-body
    // fingerprint, so changing it invalidates the approval.
    const indentedAfterMarker = (val) =>
      ["# IAM", "", "## Что сделать", "", "- do it", "", "mono-issue-only marker", "Marker version: 1", "Scope fingerprint: x", "Acceptance IDs: AC1", "Risk class: standard", "Approval: none", `    Risk class: ${val}`, "", "## Критерии приёмки", "", "- AC1: real", "", "## Как проверить", "", "1. run", "", "## Что не входит", "", "- ng", "", "## Ревью-гейт", "", "- standard", ""].join("\n");
    const iamAPath = path.join(dir, "issue-iam-a.md");
    const iamBPath = path.join(dir, "issue-iam-b.md");
    fs.writeFileSync(iamAPath, indentedAfterMarker("keep"));
    fs.writeFileSync(iamBPath, indentedAfterMarker("changed"));
    if (emitFingerprint(iamAPath) === emitFingerprint(iamBPath)) {
      fail("resolve-issue-context must keep a 4+-indent recognized-key line in the fingerprint (not strip it as a marker field)");
    }

    // Guard: a stale scope fingerprint is a hard violation, not a silent lane.
    writeMarker([
      "Marker version: 1",
      "Scope fingerprint: deadbeef12ab",
      "Acceptance IDs: AC1, AC2",
      "Risk class: standard",
      "Approval: none",
    ]);
    expectCommandFailure(
      "resolve-issue-context stale fingerprint fixture",
      () => runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath]),
      "issue-only-lane: stale marker"
    );

    // Guard: a structurally broken marker (unknown version) is a hard violation.
    writeMarker([
      "Marker version: 2",
      `Scope fingerprint: ${fingerprint}`,
      "Acceptance IDs: AC1, AC2",
      "Risk class: standard",
      "Approval: none",
    ]);
    expectCommandFailure(
      "resolve-issue-context broken marker version fixture",
      () => runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath]),
      "issue-only-lane: broken marker"
    );

    // Guard: the marker ≠ route-record boundary is executable — a route-record
    // field is rejected.
    writeMarker([
      "Marker version: 1",
      `Scope fingerprint: ${fingerprint}`,
      "Acceptance IDs: AC1, AC2",
      "Risk class: standard",
      "Approval: none",
      "route_revision: 7",
    ]);
    expectCommandFailure(
      "resolve-issue-context forbidden route-record field fixture",
      () => runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath]),
      "issue-only-lane: broken marker"
    );

    // Guard: the "exactly five fields, no more" contract is executable — an extra
    // sixth field (even a benign one) is rejected, so the marker can't quietly grow.
    writeMarker([
      "Marker version: 1",
      `Scope fingerprint: ${fingerprint}`,
      "Acceptance IDs: AC1, AC2",
      "Risk class: standard",
      "Approval: none",
      "Notes: sneaky sixth field",
    ]);
    expectCommandFailure(
      "resolve-issue-context unknown extra field fixture",
      () => runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath]),
      "issue-only-lane: broken marker: unknown field"
    );

    // Guard: the Phase-1 eligibility envelope is executable — a marker that
    // MATCHES an Issue genuinely classified deep/risky (its review-gate carries
    // that class) falls back to project-first, never silently issue-only
    // (deep/risky keeps full ceremony until Phase 3).
    for (const ineligible of ["deep", "risky"]) {
      const ineligibleIssuePath = path.join(dir, `issue-${ineligible}.md`);
      fs.writeFileSync(ineligibleIssuePath, fullBody.replace("REVIEWGATE_SENTINEL standard", `REVIEWGATE_SENTINEL ${ineligible}`));
      const ineligibleFp = emitFingerprint(ineligibleIssuePath);
      const ineligibleMarkerPath = path.join(dir, `marker-${ineligible}.md`);
      fs.writeFileSync(
        ineligibleMarkerPath,
        `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${ineligibleFp}`, "Acceptance IDs: AC1, AC2", `Risk class: ${ineligible}`, `Approval: ${ineligibleFp}`].join("\n")}\n`
      );
      const outOfEnvelope = JSON.parse(
        runNode(["scripts/resolve-issue-context.mjs", "--issue", ineligibleIssuePath, "--marker", ineligibleMarkerPath, "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", ineligibleFp])
      );
      if (outOfEnvelope.package_kind !== "project-first") {
        fail(`resolve-issue-context must fall back to project-first for an out-of-envelope ${ineligible} marker`);
      }
    }

    // Guard: the marker's Risk class cannot DOWNGRADE the Issue's authoritative
    // review-gate class — a "standard" marker on a deep Issue is rejected, not
    // silently admitted to the lane.
    const deepIssuePath = path.join(dir, "issue-deep.md");
    fs.writeFileSync(deepIssuePath, fullBody.replace("REVIEWGATE_SENTINEL standard", "REVIEWGATE_SENTINEL deep"));
    const deepFp = emitFingerprint(deepIssuePath);
    const downgradeMarkerPath = path.join(dir, "marker-downgrade.md");
    fs.writeFileSync(
      downgradeMarkerPath,
      `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${deepFp}`, "Acceptance IDs: AC1, AC2", "Risk class: standard", `Approval: ${deepFp}`].join("\n")}\n`
    );
    expectCommandFailure(
      "resolve-issue-context risk downgrade fixture",
      () => runNode(["scripts/resolve-issue-context.mjs", "--issue", deepIssuePath, "--marker", downgradeMarkerPath, "--label", "issue-only", "--approval-verified", deepFp]),
      "issue-only-lane: broken marker"
    );

    // Guard: integrity is checked BEFORE the eligibility fallback — a deep marker
    // (matching a deep Issue) with a stale fingerprint still hard-fails via the
    // fingerprint check, it does not slip into a silent project-first.
    const deepStaleMarkerPath = path.join(dir, "marker-deep-stale.md");
    fs.writeFileSync(
      deepStaleMarkerPath,
      `${["mono-issue-only marker", "Marker version: 1", "Scope fingerprint: deadbeef12ab", "Acceptance IDs: AC1, AC2", "Risk class: deep", "Approval: none"].join("\n")}\n`
    );
    expectCommandFailure(
      "resolve-issue-context corrupt deep marker fixture",
      () => runNode(["scripts/resolve-issue-context.mjs", "--issue", deepIssuePath, "--marker", deepStaleMarkerPath]),
      "issue-only-lane: stale marker"
    );

    // Guard: a sixth field whose key uses a hyphen or digit is still parsed and
    // rejected, never skipped as end-of-block.
    writeMarker([
      "Marker version: 1",
      `Scope fingerprint: ${fingerprint}`,
      "Acceptance IDs: AC1, AC2",
      "Risk class: standard",
      "Approval: none",
      "Owner-ID: sneaky",
    ]);
    expectCommandFailure(
      "resolve-issue-context hyphenated extra field fixture",
      () => runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath]),
      "issue-only-lane: broken marker"
    );

    // Guard: a duplicate field is ambiguous and rejected — a second value can
    // never silently mask the first (here a second Risk class hiding a first).
    writeMarker([
      "Marker version: 1",
      `Scope fingerprint: ${fingerprint}`,
      "Acceptance IDs: AC1, AC2",
      "Risk class: deep",
      "Risk class: standard",
      "Approval: none",
    ]);
    expectCommandFailure(
      "resolve-issue-context duplicate field fixture",
      () => runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath]),
      "issue-only-lane: broken marker: duplicate field"
    );

    // Guard: a field-shaped line whose key holds punctuation the charset cannot
    // represent is a violation, not a silent block terminator that hides a field.
    writeMarker([
      "Marker version: 1",
      `Scope fingerprint: ${fingerprint}`,
      "Acceptance IDs: AC1, AC2",
      "Risk class: standard",
      "Approval: none",
      "Notes.v2: sneaky",
    ]);
    expectCommandFailure(
      "resolve-issue-context unparseable line fixture",
      () => runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath]),
      "issue-only-lane: broken marker: unparseable line"
    );

    // Guard: an unparseable line BEFORE the first field is rejected too — a
    // punctuation-keyed line cannot hide ahead of Marker version.
    fs.writeFileSync(
      markerPath,
      `${["mono-issue-only marker", "Notes.v2: hidden", "Marker version: 1", `Scope fingerprint: ${fingerprint}`, "Acceptance IDs: AC1, AC2", "Risk class: standard", `Approval: ${fingerprint}`].join("\n")}\n`
    );
    expectCommandFailure(
      "resolve-issue-context pre-field unparseable line fixture",
      () => runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath, ...issueOnlyArgs]),
      "issue-only-lane: broken marker: unparseable line"
    );

    // Guard: an empty behavioral oracle is rejected — issue-only needs at least
    // one acceptance ID and one verify step, so an Issue with no acceptance IDs
    // (and a marker whose "Acceptance IDs: ," parses empty) hard-fails.
    const emptyOraclePath = path.join(dir, "issue-empty-oracle.md");
    fs.writeFileSync(
      emptyOraclePath,
      ["# Empty oracle", "", "## Acceptance", "", "- no stable ids here", "", "## How to verify", "", "1. a step", "", "## Ревью-гейт", "", "- standard", ""].join("\n")
    );
    const emptyFp = runNode(["scripts/resolve-issue-context.mjs", "--issue", emptyOraclePath, "--emit-fingerprint"]).trim();
    const emptyOracleMarkerPath = path.join(dir, "marker-empty-oracle.md");
    fs.writeFileSync(
      emptyOracleMarkerPath,
      `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${emptyFp}`, "Acceptance IDs: ,", "Risk class: standard", `Approval: ${emptyFp}`].join("\n")}\n`
    );
    expectCommandFailure(
      "resolve-issue-context empty oracle fixture",
      () =>
        runNode([
          "scripts/resolve-issue-context.mjs", "--issue", emptyOraclePath, "--marker", emptyOracleMarkerPath,
          "--label", "issue-only", "--approval-verified", emptyFp,
        ]),
      "issue-only-lane: broken marker"
    );

    // Guard: a stale (superseded) owner approval fails closed to project-first —
    // the lane never activates on an approval that does not match current scope.
    writeMarker([
      "Marker version: 1",
      `Scope fingerprint: ${fingerprint}`,
      "Acceptance IDs: AC1, AC2",
      "Risk class: standard",
      "Approval: 0000deadbeef (approved by owner for an older scope)",
    ]);
    const staleApproval = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath, "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", "0000deadbeef"])
    );
    if (staleApproval.package_kind !== "project-first") {
      fail("resolve-issue-context must fail closed to project-first on a stale (superseded) owner approval");
    }

    // ── Config opt-in gate (MONO-19) ─────────────────────────────────────────
    // The issue-only lane is OFF by default. A fully valid marker + verified
    // label + fresh approval resolves issue-only ONLY when --config opts the lane
    // in AND names an owner principal. Every other config shape fails closed to
    // project-first; only structural corruption of issueOnlyLane is a hard
    // violation. (The happy fixture above already proves the enabled +
    // ownerPrincipal grant, so these cover the fail-closed cases.)
    writeMarker([
      "Marker version: 1",
      `Scope fingerprint: ${fingerprint}`,
      "Acceptance IDs: AC1, AC2",
      "Risk class: standard",
      `Approval: ${fingerprint}`,
    ]);

    // (a) No --config at all ⇒ project-first, even with a valid marker + verified
    // label + fresh approval. The lane never activates without the opt-in.
    const noConfig = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath, ...issueOnlyArgs])
    );
    if (noConfig.package_kind !== "project-first") {
      fail("resolve-issue-context must fail closed to project-first without the opt-in config");
    }

    // (b) issueOnlyLane.enabled === false ⇒ project-first even with a valid
    // marker and a named owner.
    const disabledConfigPath = path.join(dir, "config-disabled.json");
    fs.writeFileSync(
      disabledConfigPath,
      `${JSON.stringify({ schemaVersion: 1, issueOnlyLane: { enabled: false, ownerPrincipal: "user_owner_1" } }, null, 2)}\n`
    );
    const disabled = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath, "--config", disabledConfigPath, ...issueOnlyArgs])
    );
    if (disabled.package_kind !== "project-first") {
      fail("resolve-issue-context must fail closed to project-first when the lane is disabled by config");
    }

    // (c) enabled === true but no ownerPrincipal ⇒ project-first (fail-closed).
    // The opt-in must both enable the lane AND designate the owner principal.
    const noOwnerConfigPath = path.join(dir, "config-no-owner.json");
    fs.writeFileSync(
      noOwnerConfigPath,
      `${JSON.stringify({ schemaVersion: 1, issueOnlyLane: { enabled: true } }, null, 2)}\n`
    );
    const noOwner = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath, "--config", noOwnerConfigPath, ...issueOnlyArgs])
    );
    if (noOwner.package_kind !== "project-first") {
      fail("resolve-issue-context must fail closed to project-first when the enabled lane names no ownerPrincipal");
    }

    // (c′) enabled === true with an empty/whitespace ownerPrincipal ⇒ project-first.
    const blankOwnerConfigPath = path.join(dir, "config-blank-owner.json");
    fs.writeFileSync(
      blankOwnerConfigPath,
      `${JSON.stringify({ schemaVersion: 1, issueOnlyLane: { enabled: true, ownerPrincipal: "   " } }, null, 2)}\n`
    );
    const blankOwner = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath, "--config", blankOwnerConfigPath, ...issueOnlyArgs])
    );
    if (blankOwner.package_kind !== "project-first") {
      fail("resolve-issue-context must fail closed to project-first when ownerPrincipal is empty/whitespace");
    }

    // (d) A structurally malformed issueOnlyLane is a hard violation, never a
    // silent enable — a non-boolean `enabled` and a non-object lane both fail
    // closed with the stable invalid-config line.
    const badEnabledConfigPath = path.join(dir, "config-bad-enabled.json");
    fs.writeFileSync(
      badEnabledConfigPath,
      `${JSON.stringify({ schemaVersion: 1, issueOnlyLane: { enabled: "false" } }, null, 2)}\n`
    );
    expectCommandFailure(
      "resolve-issue-context malformed config enabled fixture",
      () => runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath, "--config", badEnabledConfigPath, ...issueOnlyArgs]),
      "issue-only-lane: invalid config"
    );
    const nonObjectLaneConfigPath = path.join(dir, "config-nonobject-lane.json");
    fs.writeFileSync(
      nonObjectLaneConfigPath,
      `${JSON.stringify({ schemaVersion: 1, issueOnlyLane: "enabled" }, null, 2)}\n`
    );
    expectCommandFailure(
      "resolve-issue-context non-object issueOnlyLane fixture",
      () => runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath, "--config", nonObjectLaneConfigPath, ...issueOnlyArgs]),
      "issue-only-lane: invalid config"
    );

    // AC2 / MONO-15 stale-approval fixture — the create-then-approve read-back
    // guard. A marker approved against fingerprint F goes STALE the moment ANY of
    // the four contract sections (scope, acceptance, verify, non-goals) is edited
    // after approval: the whole-body fingerprint no longer matches F, so the
    // resolver hard-fails with `stale marker` and never silently resolves the
    // edited body as issue-only. This exercises the EXISTING whole-body detection
    // (no new hashing path) and proves the intake transaction parks any package
    // whose body drifts between approve and activate.
    const staleBase = [
      "# Stale After Approval",
      "",
      "## Что сделать",
      "",
      "- STALE_SCOPE build the widget",
      "",
      "## Критерии приёмки",
      "",
      "- AC1: STALE_ACCEPTANCE the widget renders",
      "",
      "## Как проверить",
      "",
      "1. STALE_VERIFY run the widget suite",
      "",
      "## Что не входит",
      "",
      "- STALE_NONGOALS theming work",
      "",
      "## Ревью-гейт",
      "",
      "- standard, pre-ship review",
      "",
    ].join("\n");
    const staleBasePath = path.join(dir, "issue-stale-base.md");
    fs.writeFileSync(staleBasePath, staleBase);
    const staleFp = emitFingerprint(staleBasePath);
    // The marker the owner approved against fingerprint F (the unedited body).
    const staleMarkerPath = path.join(dir, "marker-stale-after-approval.md");
    fs.writeFileSync(
      staleMarkerPath,
      `${["mono-issue-only marker", "Marker version: 1", `Scope fingerprint: ${staleFp}`, "Acceptance IDs: AC1", "Risk class: standard", `Approval: ${staleFp}`].join("\n")}\n`
    );
    // Sanity: the unedited body resolves issue-only under the approved marker, so
    // the failures below are caused only by the post-approval body edit.
    const staleBaseResolved = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", staleBasePath, "--marker", staleMarkerPath, "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", staleFp])
    );
    if (staleBaseResolved.package_kind !== "issue-only") {
      fail("resolve-issue-context stale-approval base must resolve issue-only before any post-approval edit");
    }
    // Editing ANY of the four sections after approval invalidates it: the marker
    // still records F while the body now hashes to F', so the resolver hard-fails.
    for (const [sentinel, label] of [
      ["STALE_SCOPE", "scope"],
      ["STALE_ACCEPTANCE", "acceptance"],
      ["STALE_VERIFY", "verify"],
      ["STALE_NONGOALS", "non-goals"],
    ]) {
      const editedPath = path.join(dir, `issue-stale-${sentinel}.md`);
      fs.writeFileSync(editedPath, staleBase.replace(sentinel, `${sentinel}_EDITED_AFTER_APPROVAL`));
      expectCommandFailure(
        `resolve-issue-context stale-approval ${label}-edit fixture`,
        () =>
          runNode([
            "scripts/resolve-issue-context.mjs", "--issue", editedPath, "--marker", staleMarkerPath,
            "--config", enableConfigPath, "--label", "issue-only", "--approval-verified", staleFp,
          ]),
        "issue-only-lane: stale marker"
      );
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function validateIssueIntakeContract() {
  // MONO-15: the mono-issue-intake front door plus the idea/issue guard edits
  // and the issue-only fingerprint-approval contract. Pins anchor the load-bearing
  // prose; the create-then-approve transaction itself is agent work backed by the
  // existing resolver, exercised by validateIssueOnlyLaneBehavior's fixtures.
  for (const required of [
    "nine eligibility conditions",
    "Prequalification",
    "intake-authorized draft mode",
    "create-then-approve",
    "scripts/resolve-issue-context.mjs",
    "--emit-fingerprint",
    "--approval-verified",
    "whole-body",
    "non-startable Issue",
    "Run the mandatory review gate on the drafted body",
    "readiness check before activation",
    "Phase-1 go-live boundary",
    "prepared, approved, non-startable package",
    "`mono-implement` owns activation",
    ".mono-agent-workflow/scripts/resolve-issue-context.mjs",
    "owner principal's stable Linear user ID",
    "issueOnlyLane.ownerPrincipal",
    "explicit owner decision",
    "Never self-approve",
    "маркер ≠ route-record",
    "route_revision",
    "`issue-only` label",
    "fails closed to Project-first",
    "Do not add a second hashing path",
  ]) {
    assertIncludes("skills/mono-issue-intake/SKILL.md", required, JSON.stringify(required));
  }

  // mono-idea guard: names the issue-only front door but keeps Project-first as
  // the default and mandatory for the idea path (does not weaken the terminal
  // Project-creation contract).
  for (const required of [
    "Issue-only front door",
    "`mono-issue-intake`",
    "Project creation stays mandatory",
    "Route unmistakably one-PR, projectless issue-only work to the `mono-issue-intake` front door",
  ]) {
    assertIncludes("skills/mono-idea/SKILL.md", required, JSON.stringify(required));
  }

  // mono-issue guard: issue-only create mode does not redirect to handoff and
  // emits no Project/PRD/Tech Spec chips; project-first behavior stays unchanged.
  for (const required of [
    "Issue-only mode",
    "package_kind=issue-only",
    "Intake-authorized draft",
    "make only non-body updates",
    "must not redirect into `mono-handoff`",
    "must not emit or attach Project, PRD, or Tech Spec chips",
    "the default project-first behavior and is unchanged",
  ]) {
    assertIncludes("skills/mono-issue/SKILL.md", required, JSON.stringify(required));
  }

  // mono-check guard: idea/issue modes are issue-only-aware so the two intake
  // entry paths (projectless idea route, self-contained issue-only Issue) do not
  // hit a mandatory false failure from the project-first check modes.
  for (const required of [
    "no Project was created by design",
    "judge it against the issue-only contract",
  ]) {
    assertIncludes("skills/mono-check/SKILL.md", required, JSON.stringify(required));
  }

  // mono-review guard: an issue-only review mode judges the self-contained
  // Issue without requiring Project/PRD/Tech Spec, so the intake review gate is
  // satisfiable for projectless standard work.
  for (const required of [
    "the self-contained Issue is the sole artifact and source of truth",
    "Intake-authorized draft",
  ]) {
    assertIncludes("skills/mono-review/SKILL.md", required, JSON.stringify(required));
  }
  // The mandatory review-output template must offer the issue-only mode so a
  // mono-review issue-only run can state its actual mode and still conform.
  assertIncludes("templates/review-output.md", "issue-only", '"issue-only" in review-output mode enum');

  // artifact-rules: the issue-only approval contract is the whole-body scope
  // fingerprint, produced by the create-then-approve transaction.
  for (const required of [
    "the issue-only lane, package approval is the scope fingerprint",
    "whole-body SHA-256 of the Issue contract",
    "create-then-approve intake transaction",
  ]) {
    assertIncludes("references/artifact-rules.md", required, JSON.stringify(required));
  }
}

function validateDocsAndExamples() {
  for (const [relativePath, texts] of Object.entries({
    "README.md": [
      "mono-implement",
      "mono-preflight",
      "mono-deploy",
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
      "`mono-review` = report-only quality/risk review",
      "`mono-implement` = Delivery Start",
      "`mono-preflight` = local branch readiness",
      "mandatory `autoreview` clean gate",
      "`mono-deploy` = deploy workflow delegation",
      "Keep `mono-review` report-only",
      "Project repos must keep only `.agents/mono-workflow.config.json`",
    ],
    "examples/zeni-dogfood.md": [
      "Risk-Based Review Gate Examples",
      "Zeni keeps only `.agents/mono-workflow.config.json`",
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
    "references/readiness-gates.md": ["`tiny`:", "`standard`:", "`deep`:", "`risky`:", "references/autoreview-routing.md", "Tiny Output Profile"],
    "references/autoreview-routing.md": [
      "`tiny` | `gpt-5.6-luna` | `low`",
      "`standard` | `gpt-5.6-luna` | `medium`",
      "`deep` | `gpt-5.6-sol` | `high`",
      "`risky` | `gpt-5.6-sol` | `high`",
      "`risky` with critical escalation | `gpt-5.6-sol` | `xhigh`",
      "Never rely on the external `autoreview` helper's built-in model default",
      "Do not silently fall back",
      "at least as capable as the code's producer",
      "PROVISIONAL pending live-QA validation of the",
      "hermes-dashboard waves",
      "if live QA surfaces defects that Luna-reviewed code shipped",
      "`standard` re-tiers to `gpt-5.6-sol` / `medium`",
      "`gpt-5.6-sol` (same-model review)",
      "no-test-edits rule",
      "cross-vendor review whenever the worker",
      "Cross-vendor review is deliberately not a code-review requirement",
    ],
    "references/artifact-quality.md": ["## PRD", "## Tech Spec", "## Issue", "## Review Findings", "## Preflight Certificate"],
    "references/human-friendly-output.md": ["## Machine Blocks In Linear Comments", "## Linear Exit Comments"],
    "references/execution-quality.md": ["## PRD Coverage", "## Durable Issue Writing", "## Agent Readiness", "## Bug And Performance Proof", "## Architecture Lens"],
    "references/review-rubric.md": ["Allowed review verdicts:", "`ready`", "`advisory-ready`", "`needs-fixes`", "`blocked`"],
    "references/install.md": [
      "local skill pack",
      ".agents/mono-workflow.config.json",
      "does not vendor `autoreview`",
      "--all-roots",
      "~/.claude/skills",
      ".mono-agent-workflow.lock.json",
      "MONO_WORKFLOW_KNOWN_ROOTS",
      "per-root",
      "references/autoreview-routing.md",
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
      "codex-cli",
      "codex exec resume",
      "--add-dir",
      "workers.json",
      "sandbox_workspace_write.network_access",
      "git worktree add",
    ],
    "references/questioning.md": [
      "`mono-deploy`: ask only for deploy approval",
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
      "references/autoreview-routing.md",
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
  const review = read("skills/mono-review/SKILL.md");
  if (/Final response must include:[\s\S]*PASS/.test(review)) {
    fail("mono-review final response must not use PASS/FAIL/BLOCKED statuses");
  }

  const handoff = read("skills/mono-handoff/SKILL.md");
  if (!handoff.includes("Apply accepted review fixes in `mono-handoff`")) {
    fail("mono-handoff must own accepted review fixes");
  }
  if (!handoff.includes("references/artifact-intake.md")) {
    fail("mono-handoff must use artifact intake before package synthesis");
  }
  for (const required of [
    "`read`",
    "`unavailable`",
    "`stale_or_ignored`",
    "`conflicts`",
    "`decisions_carried_forward`",
    "`confidence_boundary`",
  ]) {
    if (!handoff.includes(required)) fail(`mono-handoff must expose artifact intake field: ${required}`);
  }
  if (!handoff.includes("Artifact intake, one Russian sentence")) {
    fail("mono-handoff final response must carry artifact intake one-sentence Russian rendering");
  }
  if (!handoff.includes("The structured intake record")) {
    fail("mono-handoff final response must reference the structured intake record location");
  }
  if (!handoff.includes("Do not move the Project to Delivery from `mono-handoff`")) {
    fail("mono-handoff must not own Delivery Start");
  }
  if (!handoff.includes("это одновременно approval на старт кода")) {
    fail("mono-handoff option 2 must label the bundled approval");
  }
  if (!handoff.includes("«Решил сам:»")) {
    fail("mono-handoff must include «Решил сам:» ledger in package approval UX");
  }
  if (!handoff.includes("Always-ask list")) {
    fail("mono-handoff rules must reference the Always-ask list in questioning.md");
  }

  const implement = read("skills/mono-implement/SKILL.md");
  for (const required of [
    "Use this skill to own Delivery Start",
    "Run or report `mono-check delivery`",
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
    if (!implement.includes(required)) fail(`mono-implement contract missing: ${required}`);
  }

  const ship = read("skills/mono-ship/SKILL.md");
  if (!ship.includes("`mono-review` is report-only; `mono-ship` owns accepted pre-ship drift sync")) {
    fail("mono-ship must own accepted pre-ship drift sync");
  }
  if (!ship.includes("read the latest `mono-preflight certificate`")) {
    fail("mono-ship must consume the preflight certificate when present");
  }
  if (!ship.includes("If no certificate exists, route to `mono-preflight` before continuing")) {
    fail("mono-ship must require a preflight certificate before ship");
  }
  if (!ship.includes("Linear comments or resources")) {
    fail("mono-ship must recover the preflight certificate from Linear");
  }
  for (const required of ["Documentation workflow", "mono-ship green certificate", "Next: mono-deploy", "Poll interval: 10 minutes"]) {
    if (!ship.includes(required) && !read("references/ship-feedback-loop.md").includes(required)) {
      fail(`mono-ship ladder contract missing: ${required}`);
    }
  }
  if (/Land workflow|configured land workflow|land\/deploy workflow/i.test(ship)) {
    fail("mono-ship must not reference old Land workflow or own deploy");
  }
  if (ship.includes("pr-created")) fail("mono-ship must not keep pr-created as a terminal ship verdict");

  const deploy = read("skills/mono-deploy/SKILL.md");
  for (const required of [
    "Requires `mono-ship green certificate`",
    "Deploy workflow",
    "gstack land-and-deploy",
    "mono-check post-ship",
    "gstack-learnings-log",
    "Do not run `/learn prune`, `/learn export`, `/learn stats`",
    "Do not accept `Land workflow` as a compatibility alias",
    "deployApproval",
    "Готов деплоить",
    "gstack-learnings-search",
    "Learnings consulted:",
    "re-tier review per `references/autoreview-routing.md`",
  ]) {
    if (!deploy.includes(required)) fail(`mono-deploy contract missing: ${required}`);
  }

  const preflight = read("skills/mono-preflight/SKILL.md");
  for (const required of [
    "owns local branch readiness only",
    "`ready`",
    "`blocked`",
    "`drift-candidate`",
    "`needs-human`",
    "mono-preflight certificate",
    "Issue(s): <keys>",
    "Branch: <branch>; commit state: <clean/dirty/committed>",
    "Changed files: <count/list or summary>",
    "Local verification: <commands run + outcome>",
    "Autoreview: <clean|blocked|needs-human|unavailable>; final command: <selected-scope helper command>; clean result: <exit 0 + clean line or none>",
    "Autoreview route: risk=<tiny|standard|deep|risky>; source=<Linear artifact or diff inference>; critical=<none|concrete escalation signal>; model=<gpt-5.6-luna|gpt-5.6-sol>; effort=<low|medium|high|xhigh>; reclassified=<no|summary>",
    "Autoreview loop: <iterations>; accepted findings fixed: <none/list>; residual actionable findings: <none/list, must be none for ready>",
    "Drift candidate: <none/summary>",
    "Not checked: <manual QA/browser/mobile/deploy/etc.>",
    "Next: <mono-ship | mono-handoff | needs-human>",
    "Do not run or claim `mono-review pre-ship`",
    "Do not run or claim `mono-check pre-ship`",
    "Do not create the final PR",
    "Preflight certificate shape",
    "Invoke the installed `autoreview` skill/helper",
    "Do not substitute Compound `ce-code-review`, built-in `/review`, ad hoc self-review, reviewer panels, or a hand-written summary",
    "Treat helper exit 0 plus the clean result",
    "Before emitting `ready`, run one final clean review for the selected durable scope",
    "Pass `--engine codex`, `--model`, and `--thinking` explicitly on every helper invocation",
    "never use GPT-5.5 as a normal route",
    "Reclassify the final risk",
    "then re-select the model and effort from `references/autoreview-routing.md`",
    "or a new or stronger critical signal requires a higher route",
    "the earlier clean result does not count",
    "A clean local dirty-work review alone is not sufficient",
    "Do not cap the review loop at an arbitrary round count",
    "Do not call Compound `ce-code-review` for this gate",
    "Do not silently reject a repeated `autoreview` finding and mark `ready`",
    "Decision needed: <none | точное решение по-русски>",
    "For `tiny` work, follow the Tiny Output Profile in references/readiness-gates.md",
  ]) {
    if (!preflight.includes(required)) fail(`mono-preflight boundary missing: ${required}`);
  }
  const forbiddenRoutingCopies = [
    "`tiny` ->",
    "Luna/low for `tiny`",
    "maps `tiny`/`standard` to explicit GPT-5.6 Luna",
  ];
  for (const relativePath of ["skills/mono-preflight/SKILL.md", "README.md", "CHANGELOG.md", "examples/zeni-dogfood.md"]) {
    const body = read(relativePath);
    for (const duplicate of forbiddenRoutingCopies) {
      if (body.includes(duplicate)) {
        fail(`${relativePath} must not duplicate the canonical autoreview routing table: ${duplicate}`);
      }
    }
  }

  const shipOutput = read("templates/ship-output.md");
  if (!shipOutput.includes("Preflight: <ready/blocked/drift-candidate/needs-human/not run>")) {
    fail("ship output template must preserve preflight status boundary");
  }
  if (shipOutput.includes("pr-created")) fail("ship output template must stay focused on green/needs-human/blocked/timed-out");
  for (const required of ["mono-ship green certificate", "Documentation workflow", "Next: <mono-deploy | needs-human | blocked>"]) {
    if (!shipOutput.includes(required)) fail(`ship output template missing ladder field: ${required}`);
  }

  const deployOutput = read("templates/deploy-output.md");
  for (const required of ["Ship certificate: <found/missing/stale>", "Deploy workflow", "Learnings recorded", "stale certificates"]) {
    if (!deployOutput.includes(required)) fail(`deploy output template missing: ${required}`);
  }

  const check = read("skills/mono-check/SKILL.md");
  if (!check.includes("local branch readiness is known through a `mono-preflight` certificate")) {
    fail("mono-check pre-ship must require the preflight certificate");
  }
  if (!check.includes("project-config")) fail("mono-check must expose project-config mode");
  if (check.includes("generated consumer skills are full executable copies")) {
    fail("mono-check must not enforce the removed generated consumer install contract");
  }

  const dogfood = read("examples/zeni-dogfood.md");
  for (const banned of [
    "Zeni `.agents/skills/mono-*` contains generated full copies from upstream",
    "Zeni `.claude/skills/mono-*` contains tiny discovery wrappers to `.agents`",
    "Zeni stores consumer policy in `.agents/mono-workflow.config.md`",
    "Install generated full skills into Zeni",
  ]) {
    if (dogfood.includes(banned)) fail(`Zeni dogfood example preserves removed install contract: ${banned}`);
  }

  const spec = read("skills/mono-spec/SKILL.md");
  if (spec.includes("mono-review design")) fail("mono-spec must not reference unsupported mono-review design mode");

  const projectTemplate = read("templates/project.md");
  for (const banned of ["# Lifecycle", "# Документы", "# План задач", "# Ревью-гейт", "# Текущий статус"]) {
    if (projectTemplate.includes(banned)) fail(`Project template must not expose workflow dashboard section: ${banned}`);
  }

  const techSpecTemplate = read("templates/tech-spec.md");
  for (const banned of ["## Skill contracts", "## mono-check design", "## Дизайн mono-check", "## Дизайн mono-review"]) {
    if (techSpecTemplate.includes(banned)) fail(`Tech Spec template must not expose workflow mechanics section: ${banned}`);
  }

  // New dual-layer comment contract pins (plan 005)
  if (!preflight.includes("<1-2 предложения по-русски: итог и следующий шаг>")) {
    fail("mono-preflight human comment shape missing Russian human-lead placeholder");
  }
  if (!preflight.includes("The Russian human lead (1-2 sentences) is required")) {
    fail("mono-preflight must require the Russian human lead in Linear comment");
  }

  if (!deploy.includes("Выкатили: <что получили пользователи>; проверено на <среда>.")) {
    fail("mono-deploy closeout shape missing required product-outcome Russian lead");
  }
  if (!deploy.includes("The Russian product-outcome lead is required in Linear")) {
    fail("mono-deploy must require the Russian product-outcome lead");
  }

  const idea = read("skills/mono-idea/SKILL.md");
  if (!idea.includes("Выйди из Plan Mode (или перезапусти /mono-idea в обычном режиме) — я создам Project в статусе Idea.")) {
    fail("mono-idea blocked message missing Russian unblock instruction");
  }
  if (!idea.includes("BLOCKED / INCOMPLETE - mono-idea cannot complete because")) {
    fail("mono-idea blocked message must preserve English marker line");
  }

  const orchestrate = read("skills/mono-orchestrate/SKILL.md");
  for (const required of [
    "control plane",
    "never implement, edit code, fix CI, or rewrite PRs",
    "Single Linear writer",
    "One Issue per worker",
    "no-sub-delegation",
    "scope-drift-needs-handoff",
    "Do not steer an actively progressing worker",
    "«Решил сам:»",
    "references/orchestration.md",
    "templates/orchestrator-dispatch.md",
    "templates/orchestrator-brief.md",
    "templates/orchestrator-report.md",
    "deployApproval",
    "Session verdicts:",
    "timed-out",
    "~/.mono-agent-workflow/orchestrator/<product>/",
    "`mono-implement` owns Delivery Start",
    "codex-cli",
    "workers.json",
    "codex exec resume",
    "orchestration.transport",
    "maxParallelWorkers",
    "Director Discovery",
    "UX checkpoint",
    "Touch the user only at checkpoints",
    "Second Voice",
  ]) {
    if (!orchestrate.includes(required)) fail(`mono-orchestrate contract missing: ${required}`);
  }
  if (!implement.includes("not available in the current runtime")) {
    fail("mono-implement must define the engine runtime-availability fallback");
  }
  if (!ship.includes("not available in the current runtime")) {
    fail("mono-ship must define the workflow runtime-availability fallback");
  }
  assertIncludes("references/questioning.md", "`mono-orchestrate`: ask only for Always-ask escalations");
  assertIncludes("references/questioning.md", "## Orchestrated Mode");
  assertIncludes("references/lifecycle.md", "## Orchestration");
  assertIncludes("references/orchestration.md", "## Director Discovery");
  assertIncludes("references/orchestration.md", "near-production");
  assertIncludes("references/orchestration.md", "never a first draft");
  assertIncludes("references/orchestration.md", "### Second Voice");
  assertIncludes("references/orchestration.md", "a different model family from the orchestrator");
  assertIncludes("references/orchestration.md", "A same-model Second Voice is not an acceptable fallback");
  assertIncludes("references/orchestration.md", "never talks to the user, never writes");
  assertIncludes("references/questioning.md", "Director Discovery");
  assertIncludes("references/questioning.md", "Second Voice");
  assertIncludes("references/lifecycle.md", "Director Discovery");
  assertIncludes("references/lifecycle.md", "Second Voice");
  assertIncludes("templates/orchestrator-brief.md", "UX-чекпоинт");
  assertIncludes("README.md", "director mode");
  assertIncludes("README.md", "Second Voice");
  assertIncludes("README.md", "`mono-orchestrate`: control-plane orchestrator");
  assertIncludes("README.md", "Codex CLI worker");
  assertIncludes("AGENTS.md", "`mono-orchestrate` = product-level control plane");
  assertIncludes("references/install.md", "\"orchestration\"");
  assertIncludes("references/install.md", "maxParallelWorkers");
}

function validateHeartbeatContract() {
  if (!exists("scripts/watch-workers.mjs")) {
    fail("Missing scripts/watch-workers.mjs");
  }
  assertIncludes("scripts/verify.mjs", "watch-workers.mjs", "node --check step for scripts/watch-workers.mjs");

  for (const required of [
    "## Heartbeat",
    "thread.started",
    "< /dev/null",
    "empty `thread_id`",
    "watch-workers.mjs",
    "-a1.jsonl",
    "EVENT:<stall|dead|spawn-fail>",
    "retired Issues' logs are outside its scope",
    "nudge",
    "session rotation",
    "model_reasoning_effort",
  ]) {
    assertIncludes("references/orchestration.md", required);
  }

  for (const required of [
    "watch-workers.mjs",
    "Heartbeat in",
    "before the first spawn",
    "nudge → respawn → session rotation",
    "an empty thread id",
  ]) {
    assertIncludes("skills/mono-orchestrate/SKILL.md", required, `heartbeat contract: ${JSON.stringify(required)}`);
  }
}

function validateWatcherContaminationBehavior() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mono-workflow-watcher-"));
  try {
    const logsDir = path.join(fixtureRoot, "logs");
    fs.mkdirSync(logsDir);

    const contaminated = [
      "Reading additional input from stdin...",
      JSON.stringify({ type: "thread.started", thread_id: "fixture-thread" }),
      "",
    ].join("\n");
    const longEventPrefix = 'Reading additional input from stdin...\n{"type":"thread.started","payload":"';
    const boundaryPadding = (4095 - Buffer.byteLength(longEventPrefix) % 4096 + 4096) % 4096;
    const contaminatedWithBoundarySplit = `${longEventPrefix}${"x".repeat(boundaryPadding)}é"}\n`;
    const fixtures = {
      "MONO-101-mono-implement-a1.jsonl": contaminated,
      "MONO-102-mono-implement-a1.jsonl": contaminatedWithBoundarySplit,
      "MONO-103-mono-implement-a1.jsonl": "Reading additional input from stdin...\n",
      "MONO-104-mono-implement-a1.jsonl": "\n\n",
    };
    const stale = new Date(Date.now() - 181_000);
    for (const [name, body] of Object.entries(fixtures)) {
      const logPath = path.join(logsDir, name);
      fs.writeFileSync(logPath, body);
      fs.utimesSync(logPath, stale, stale);
    }
    fs.writeFileSync(
      path.join(fixtureRoot, "workers.json"),
      JSON.stringify({
        "MONO-101": { transport: "codex-cli", stage: "mono-implement", pid: process.pid, log: path.join(logsDir, "MONO-101-mono-implement-a1.jsonl") },
        "MONO-102": { transport: "codex-cli", stage: "mono-implement", pid: 999_999_999, log: path.join(logsDir, "MONO-102-mono-implement-a1.jsonl") },
        "MONO-103": { transport: "codex-cli", stage: "mono-implement", pid: 999_999_999, log: path.join(logsDir, "MONO-103-mono-implement-a1.jsonl") },
        "MONO-104": { transport: "codex-cli", stage: "mono-implement", pid: 999_999_999, log: path.join(logsDir, "MONO-104-mono-implement-a1.jsonl") },
      })
    );

    const result = spawnSync(
      process.execPath,
      [
        "scripts/watch-workers.mjs",
        "--root",
        fixtureRoot,
        "--stall-sec",
        "90",
        "--once",
      ],
      { cwd: root, encoding: "utf8" }
    );
    const stdout = result.stdout || "";
    const stderr = result.stderr || "";
    if (result.status !== 0) {
      fail(`watcher contamination fixture failed to run: ${stderr || result.error?.message || `exit ${result.status}`}`);
      return;
    }

    if (!stdout.includes("EVENT:stall MONO-101")) {
      fail("contaminated watcher log with a live writer must still emit stall");
    }
    if (!stdout.includes("EVENT:dead MONO-102")) {
      fail("contaminated watcher log with a gone writer must still emit dead");
    }
    if (/EVENT:spawn-fail MONO-10[12]\b/.test(stdout)) {
      fail("contaminated watcher logs with valid JSON events must not emit spawn-fail");
    }
    if (!stdout.includes("EVENT:spawn-fail MONO-103") || !stdout.includes("EVENT:spawn-fail MONO-104")) {
      fail("watcher logs without JSON events, including blank-only output, must emit spawn-fail");
    }
    const contaminationWarnings = stderr.match(/watch-workers: non-JSON contamination before valid JSON events in MONO-10[12]-mono-implement-a1\.jsonl/g) || [];
    if (contaminationWarnings.length !== 2) {
      fail("each contaminated watcher log must emit one diagnostic warning");
    }
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function validateHonestLedgerContract() {
  for (const required of [
    "One event per line",
    "actual moment of writing",
    "`recorded-late`",
    "Corrections are new lines",
    "longer than 5 minutes",
    "## Linear Write Verification",
    "read back the mutated entity",
    "a success response alone is not confirmation",
    "silent success-no-op",
    "marked unverified",
    "## Context Budget",
    "«Контекст: ~N%»",
    "70%",
    "85%",
    "never mid-dispatch",
  ]) {
    assertIncludes("references/orchestration.md", required, JSON.stringify(required));
  }

  for (const required of ["Простои и отклонения:", "Контекст: ~N%", "not blocking notifications"]) {
    assertIncludes("templates/orchestrator-brief.md", required);
  }

  for (const required of ["«Простои и отклонения:»", "«Контекст: ~N%»"]) {
    assertIncludes("skills/mono-orchestrate/SKILL.md", required, `status update contract: ${required}`);
  }
}

function validateLiveQaGateContract() {
  for (const required of [
    "Live QA gate",
    "verify the deployed version matches the certified merged SHA",
    "walk the PRD acceptance criteria of the shipped Issue and check the console for errors",
    "prototype approved at the UX checkpoint",
    "never your own taste",
    "functional smoke alone suffices",
    "immediate hotfix Issue out of queue",
    "fix-forward",
    "only after its own live pass is green",
    "own live verification",
    "verify on clean state before calling something a defect",
    "not a gate failure",
    "verify the delivered artifact live",
    "counts as the live pass",
    "workflows.qa",
    "qaAuth",
    "explicit recorded reason",
  ]) {
    assertIncludes("skills/mono-deploy/SKILL.md", required, JSON.stringify(required));
  }

  for (const required of [
    "verify the deployed version matches the certified merged SHA",
    "live QA sweep on the deployed app for user-facing changes",
    "only after its own live pass is green",
    "immediate hotfix Issue out of queue",
    "fix-forward",
    "may excuse only a sweep that did not run, never a failed one",
  ]) {
    assertIncludes("references/lifecycle.md", required, JSON.stringify(required));
  }

  for (const required of [
    "\"qa\"",
    "`workflows.qa` (optional)",
    "`qaAuth` (optional)",
    "cookie-import",
    "test-account",
    "owner-session",
    "involving the owner",
  ]) {
    assertIncludes("references/install.md", required, JSON.stringify(required));
  }

  for (const required of [
    "Live QA gate",
    "workers have no browser",
    "out of queue",
    "control-plane exception",
    "explicit owner mandate",
    "Feature code NEVER",
  ]) {
    assertIncludes("skills/mono-orchestrate/SKILL.md", required, JSON.stringify(required));
  }

  for (const required of [
    "control-plane exception",
    "explicit owner mandate",
    "deploy scripts, infra config, docs address sweeps",
    "feature code never qualifies",
  ]) {
    assertIncludes("references/orchestration.md", required, JSON.stringify(required));
  }

  assertIncludes("templates/deploy-output.md", "Live QA:", "Live QA line in deploy status block");
}

function validateRealBackendContractSampling() {
  for (const required of [
    "sample of real responses from the deployed instance",
    "not just an endpoint list",
    "spec blocker, not an implementation surprise",
    "contract-verification spike Issue goes first in the wave",
    "When unsure whether a feature qualifies, sample",
  ]) {
    assertIncludes("skills/mono-spec/SKILL.md", required, JSON.stringify(required));
  }
  assertIncludes(
    "templates/tech-spec.md",
    "record the one-line omission reason",
    '"record the one-line omission reason"'
  );

  for (const required of [
    "sample of real responses from the deployed instance",
    "\"Endpoint exists\" is not contract verification",
    "sampling date and deployed SHA/version",
    "contract-verification spike Issue",
  ]) {
    assertIncludes("references/artifact-quality.md", required, JSON.stringify(required));
  }

  for (const required of [
    "домены enum",
    "крайние записи",
    "дата выборки и SHA/версия деплоя",
    "sampled real responses from the deployed instance",
    "An endpoint list alone does not verify the contract",
    "contract-verification spike Issue that goes first in the wave",
  ]) {
    assertIncludes("templates/tech-spec.md", required, JSON.stringify(required));
  }
}

function validateGoalContractBinding() {
  assertIncludes(
    "skills/mono-orchestrate/SKILL.md",
    "wholesale\n     deferral with no `pass` items, is treated as non-green",
    '"wholesale deferral is non-green"'
  );
  // "## Goal Contract" (dispatch) and "\"verification_items\"" (report) are
  // structural pins owned by validateTemplateSections; phrase pins live here.
  for (const required of [
    "the durable end-state",
    "lifted verbatim from",
    "each runnable as written",
    "what must not change or break",
    "judge your own \"done\"",
    "guidance, not a gate",
  ]) {
    assertIncludes("templates/orchestrator-dispatch.md", required, JSON.stringify(required));
  }

  for (const required of [
    "pass | deferred | not-run",
    "optional in shape but mandatory in coverage",
    "enumerate every «Как проверить» item",
    "require a reason in `evidence`",
    "silently missing",
    "replaces the report `status` set",
  ]) {
    assertIncludes("templates/orchestrator-report.md", required, JSON.stringify(required));
  }

  for (const relativePath of ["skills/mono-implement/SKILL.md", "skills/mono-preflight/SKILL.md"]) {
    for (const required of [
      "enumerates every «Как проверить» item",
      "pass | deferred | not-run",
      "verification_items",
      "cannot claim completion while an item is silently missing",
      "only with a recorded reason",
    ]) {
      assertIncludes(relativePath, required, JSON.stringify(required));
    }
  }
}

function validateReviewLoopHygiene() {
  for (const required of [
    "Before the first resolver cycle on a PR, check the review bots' configuration",
    "fixed via configuration or recorded as an environment fact",
    "never burned down with resolver cycles",
    "does not consume the resolver cycle budget and does not restart the quiet period",
    "Resolver cycle budgets count only novel findings",
    "treat it as novel and keep the thread open",
    "Dedup must never become a channel for dismissing real findings",
    "published, not a pending draft",
    "gh api repos/<owner>/<repo>/pulls/<n>/reviews --jq '.[] | select(.state==\"PENDING\")'",
    "Unpublished rationales count as unresolved threads",
    "This submitted-check is a green-certificate precondition",
    "No pending (unsubmitted) review drafts remain for the worker's own reviews",
    "After the authorized final resolver cycle",
    "binds this path too",
    "When in doubt whether a finding is blocking-class, escalate",
    "get deferral replies, filed as a follow-up issue when warranted",
    "proceeds to terminal status",
    "always escalate instead",
  ]) {
    assertIncludes("references/ship-feedback-loop.md", required, JSON.stringify(required));
  }

  for (const required of [
    "Review Bot Configuration Check, Finding Dedup with its fail-safe, Published Replies, and Non-Blocking Convergence rules in `references/ship-feedback-loop.md`",
    "the Published Replies submitted-check is an additional green-certificate precondition",
  ]) {
    assertIncludes("skills/mono-ship/SKILL.md", required, JSON.stringify(required));
  }
}

function validateCostTelemetry() {
  // MONO-7: cost is telemetry, not a gate. Pins anchor the policy text;
  // collection itself is manual agent work and stays judgment, not a pin.
  for (const required of [
    "## Cost Telemetry",
    "LAST `turn.completed` event",
    "sum ACROSS attempts",
    "Review cycles",
    "ship-stage report",
    "Stage wall-clock",
    "ledger at stage close",
    "not a pin-enforceable mechanism",
    "Cost is telemetry, not a gate: no thresholds, no blocking, visibility\nonly.",
    "Never pause, steer, or fail a worker because of cost numbers",
    "never let cost collection delay a stage advance",
  ]) {
    assertIncludes("references/orchestration.md", required, JSON.stringify(required));
  }

  for (const required of [
    "цена: ~N тыс. out-токенов, M циклов ревью",
    "«цена: н/д»",
    "## Цена волны (Wave Cost Summary)",
    "Цена волны:",
    "never blocking, never a gate",
    "Cost Telemetry in `references/orchestration.md`",
  ]) {
    assertIncludes("templates/orchestrator-brief.md", required, JSON.stringify(required));
  }

  for (const required of [
    "Cost telemetry: the per-Issue cost tail in the status table",
    "«Цена волны» block",
    "Cost is telemetry,\n  not a gate: it never blocks, pauses, or pages.",
  ]) {
    assertIncludes("skills/mono-orchestrate/SKILL.md", required, JSON.stringify(required));
  }
}

function validateBriefIntegrity() {
  // MONO-8: brief integrity — board-aligned question IDs, self-identifying
  // option tokens, echo-back before acting, no closure by silence, and the
  // post-approval delta list. Pins anchor the contract prose and the
  // user-facing shapes; decoding an owner's answer stays judgment work.
  for (const required of [
    "## Целостность брифа (Brief Integrity)",
    "mirror board section IDs exactly",
    "section-scoped suffixes",
    "(1a, 1b)",
    "Cross-section renumbering is forbidden",
    "1a-КАРТОЧКА / 1a-МОДАЛКА",
    "valid without its number",
    "вопрос → выбранный вариант (дословно)",
    "numbering fault",
    "one-line re-confirm",
    "never closed by silence",
    "no answer means asked again, not resolved",
    "Изменилось после твоего одобрения:",
    "When in doubt\n  whether a change is user-visible, include it in the delta",
  ]) {
    assertIncludes("templates/orchestrator-brief.md", required, JSON.stringify(required));
  }

  for (const required of [
    "mirror board section IDs exactly",
    "section-scoped suffixes",
    "(1a, 1b)",
    "Cross-section renumbering is forbidden",
    "1a-КАРТОЧКА / 1a-МОДАЛКА",
    "valid without its number",
    "вопрос → выбранный вариант (дословно)",
    "numbering fault",
    "one-line re-confirm",
    "never closed by silence",
    "no answer means asked again, not resolved",
    "Изменилось после твоего одобрения:",
  ]) {
    assertIncludes("references/orchestration.md", required, JSON.stringify(required));
  }
}

function validateOpsLessons() {
  // MONO-9: operational lessons — install-source SHA blocker (MONO-3 deploy
  // incident), gh-only PR state after interruptions (HD-46), and the forced
  // mid-wave resume drill. Pins anchor the contract prose; resolving a bad
  // checkout, reconciling a PR via gh, and running the drill stay judgment
  // and operational work, not pin-enforceable mechanisms.
  for (const relativePath of ["skills/mono-deploy/SKILL.md", "references/install.md"]) {
    for (const required of [
      "the installing checkout's HEAD must equal the expected merge SHA",
      "git rev-parse HEAD",
      "a DEPLOY BLOCKER, not a warning",
    "never from the local checkout",
      "verify SHA → install → `--check`",
    ]) {
      assertIncludes(relativePath, required, JSON.stringify(required));
    }
  }

  for (const required of [
    "exclusively via `gh` commands against the exact head SHA",
    "never from thread memory",
    "state assumed from memory is treated as unverified",
  ]) {
    assertIncludes("skills/mono-ship/SKILL.md", required, JSON.stringify(required));
  }

  for (const required of [
    "Forced mid-wave resume drill",
    "a planned one-time operational act",
    "not a recurring gate",
    "records every reconstruction discrepancy in the ledger",
    "feeds the PRD wave-1 success criteria",
  ]) {
    assertIncludes("references/orchestration.md", required, JSON.stringify(required));
  }
}

validateSkills();
validateTemplateSections();
validateReviewCheckBoundary();
validateLocalInstallBehavior();
validateMultiRootInstallBehavior();
validateProjectConfigBehavior();
validateIssueOnlyLaneBehavior();
validateIssueIntakeContract();
validateDocsAndExamples();
validateAntiPatterns();
validateHeartbeatContract();
validateWatcherContaminationBehavior();
validateHonestLedgerContract();
validateLiveQaGateContract();
validateRealBackendContractSampling();
validateGoalContractBinding();
validateReviewLoopHygiene();
validateCostTelemetry();
validateBriefIntegrity();
validateOpsLessons();

if (failures.length > 0) {
  console.error("Mono workflow validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Mono workflow validation passed (${listSkillNames().length} skills checked).`);
