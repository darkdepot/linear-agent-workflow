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
  "linear-orchestrate",
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

function validateIssueOnlyLaneBehavior() {
  // String pins: the doc fixes the marker line, the five marker fields, the
  // 5-field contract, the marker ≠ route-record boundary, and the fail-closed
  // invariant.
  for (const pin of [
    "linear-issue-only marker",
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
  ]) {
    assertIncludes("references/issue-only-lane.md", pin);
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "linear-workflow-issue-only-"));
  try {
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
      ].join("\n")
    );

    const writeMarker = (fields) =>
      fs.writeFileSync(markerPath, `${["linear-issue-only marker", ...fields].join("\n")}\n`);

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

    // Fixture 2 — happy: a valid marker resolves the five fields correctly.
    writeMarker([
      "Marker version: 1",
      `Scope fingerprint: ${fingerprint}`,
      "Acceptance IDs: AC1, AC2",
      "Risk class: standard",
      `Approval: ${fingerprint} (approved by owner)`,
    ]);
    const happy = JSON.parse(runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath]));
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

    // Guard (must-fix #3): the fingerprint binds the FULL Issue contract, not
    // just acceptance + verify. Mutating the scope or the non-goals section must
    // change the fingerprint, so an approval can never survive a contract change.
    const emitFingerprint = (issueFile) =>
      runNode(["scripts/resolve-issue-context.mjs", "--issue", issueFile, "--emit-fingerprint"]).trim();
    const fullBody = fs.readFileSync(issuePath, "utf8");
    for (const [sentinel, label] of [
      ["SCOPE_SENTINEL", "scope/what-to-do"],
      ["NONGOALS_SENTINEL", "non-goals"],
    ]) {
      const mutatedPath = path.join(dir, `issue-mutated-${sentinel}.md`);
      fs.writeFileSync(mutatedPath, fullBody.replace(sentinel, `${sentinel}_MUTATED`));
      if (emitFingerprint(mutatedPath) === fingerprint) {
        fail(`resolve-issue-context fingerprint must cover the ${label} section`);
      }
    }

    // Fixture 3 — missing-marker: a marker source without the marker line is
    // fail-closed to project-first (never silently issue-only).
    const emptyMarkerPath = path.join(dir, "empty.md");
    fs.writeFileSync(emptyMarkerPath, "no marker here\n");
    const missing = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", emptyMarkerPath])
    );
    if (missing.package_kind !== "project-first") fail("resolve-issue-context missing marker must fail closed to project-first");

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

    // Guard: the Phase-1 eligibility envelope is executable — a structurally
    // valid marker recording deep or risky falls back to project-first, never
    // silently issue-only (deep/risky keeps full ceremony until Phase 3).
    for (const ineligible of ["deep", "risky"]) {
      writeMarker([
        "Marker version: 1",
        `Scope fingerprint: ${fingerprint}`,
        "Acceptance IDs: AC1, AC2",
        `Risk class: ${ineligible}`,
        `Approval: ${fingerprint}`,
      ]);
      const outOfEnvelope = JSON.parse(
        runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath])
      );
      if (outOfEnvelope.package_kind !== "project-first") {
        fail(`resolve-issue-context must fall back to project-first for an out-of-envelope ${ineligible} marker`);
      }
    }

    // Guard: integrity is checked BEFORE the eligibility fallback — a deep/risky
    // marker with a stale fingerprint still hard-fails, it does not slip into a
    // silent project-first.
    writeMarker([
      "Marker version: 1",
      "Scope fingerprint: deadbeef12ab",
      "Acceptance IDs: AC1, AC2",
      "Risk class: deep",
      "Approval: none",
    ]);
    expectCommandFailure(
      "resolve-issue-context corrupt deep marker fixture",
      () => runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath]),
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

    // Guard: stale approval is reachable and does not block resolution. Uses an
    // in-envelope class (standard) so the case exercises stale approval, not the
    // deep/risky project-first fallback.
    writeMarker([
      "Marker version: 1",
      `Scope fingerprint: ${fingerprint}`,
      "Acceptance IDs: AC1, AC2",
      "Risk class: standard",
      "Approval: 0000deadbeef (approved by owner for an older scope)",
    ]);
    const staleApproval = JSON.parse(runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath]));
    if (staleApproval.approval_status !== "stale") {
      fail("resolve-issue-context must report stale approval when the approved fingerprint is superseded");
    }
    if (staleApproval.risk_class !== "standard") fail("resolve-issue-context must read the recorded risk class verbatim");

    // Guard: config opt-out forces project-first even with a valid marker.
    writeMarker([
      "Marker version: 1",
      `Scope fingerprint: ${fingerprint}`,
      "Acceptance IDs: AC1, AC2",
      "Risk class: standard",
      `Approval: ${fingerprint}`,
    ]);
    const configPath = path.join(dir, "config.json");
    fs.writeFileSync(configPath, `${JSON.stringify({ schemaVersion: 1, issueOnlyLane: { enabled: false } }, null, 2)}\n`);
    const disabled = JSON.parse(
      runNode(["scripts/resolve-issue-context.mjs", "--issue", issuePath, "--marker", markerPath, "--config", configPath])
    );
    if (disabled.package_kind !== "project-first") {
      fail("resolve-issue-context must fail closed to project-first when the lane is disabled by config");
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
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
      ".agents/linear-workflow.config.json",
      "does not vendor `autoreview`",
      "--all-roots",
      "~/.claude/skills",
      ".linear-agent-workflow.lock.json",
      "LINEAR_WORKFLOW_KNOWN_ROOTS",
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
    "re-tier review per `references/autoreview-routing.md`",
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
    "Autoreview route: risk=<tiny|standard|deep|risky>; source=<Linear artifact or diff inference>; critical=<none|concrete escalation signal>; model=<gpt-5.6-luna|gpt-5.6-sol>; effort=<low|medium|high|xhigh>; reclassified=<no|summary>",
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
    if (!preflight.includes(required)) fail(`linear-preflight boundary missing: ${required}`);
  }
  const forbiddenRoutingCopies = [
    "`tiny` ->",
    "Luna/low for `tiny`",
    "maps `tiny`/`standard` to explicit GPT-5.6 Luna",
  ];
  for (const relativePath of ["skills/linear-preflight/SKILL.md", "README.md", "CHANGELOG.md", "examples/zeni-dogfood.md"]) {
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

  const orchestrate = read("skills/linear-orchestrate/SKILL.md");
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
    "~/.linear-agent-workflow/orchestrator/<product>/",
    "`linear-implement` owns Delivery Start",
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
    if (!orchestrate.includes(required)) fail(`linear-orchestrate contract missing: ${required}`);
  }
  if (!implement.includes("not available in the current runtime")) {
    fail("linear-implement must define the engine runtime-availability fallback");
  }
  if (!ship.includes("not available in the current runtime")) {
    fail("linear-ship must define the workflow runtime-availability fallback");
  }
  assertIncludes("references/questioning.md", "`linear-orchestrate`: ask only for Always-ask escalations");
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
  assertIncludes("README.md", "`linear-orchestrate`: control-plane orchestrator");
  assertIncludes("README.md", "Codex CLI worker");
  assertIncludes("AGENTS.md", "`linear-orchestrate` = product-level control plane");
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
    assertIncludes("skills/linear-orchestrate/SKILL.md", required, `heartbeat contract: ${JSON.stringify(required)}`);
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
    assertIncludes("skills/linear-orchestrate/SKILL.md", required, `status update contract: ${required}`);
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
    assertIncludes("skills/linear-deploy/SKILL.md", required, JSON.stringify(required));
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
    assertIncludes("skills/linear-orchestrate/SKILL.md", required, JSON.stringify(required));
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
    assertIncludes("skills/linear-spec/SKILL.md", required, JSON.stringify(required));
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
    "skills/linear-orchestrate/SKILL.md",
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

  for (const relativePath of ["skills/linear-implement/SKILL.md", "skills/linear-preflight/SKILL.md"]) {
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
    assertIncludes("skills/linear-ship/SKILL.md", required, JSON.stringify(required));
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
    assertIncludes("skills/linear-orchestrate/SKILL.md", required, JSON.stringify(required));
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
  for (const relativePath of ["skills/linear-deploy/SKILL.md", "references/install.md"]) {
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
    assertIncludes("skills/linear-ship/SKILL.md", required, JSON.stringify(required));
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
validateDocsAndExamples();
validateAntiPatterns();
validateHeartbeatContract();
validateHonestLedgerContract();
validateLiveQaGateContract();
validateRealBackendContractSampling();
validateGoalContractBinding();
validateReviewLoopHygiene();
validateCostTelemetry();
validateBriefIntegrity();
validateOpsLessons();

if (failures.length > 0) {
  console.error("Linear workflow validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Linear workflow validation passed (${listSkillNames().length} skills checked).`);
