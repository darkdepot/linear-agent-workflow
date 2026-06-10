#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const CONFIG_RELATIVE_PATH = ".agents/linear-workflow.config.json";
const LEGACY_CONFIG_RELATIVE_PATH = ".agents/linear-workflow.config.md";
const LEGACY_FILES = [
  ".agents/linear-workflow-check.mjs",
  ".agents/linear-workflow.lock.json",
  LEGACY_CONFIG_RELATIVE_PATH,
  ".github/workflows/update-linear-workflow.yml",
  ".github/workflows/update-linear-agent-workflow.yml",
];

function usage() {
  console.error(
    "Usage: node scripts/project-config.mjs --repo /path/to/project [--project-name Name] [--consumer-name LegacyName] [--write] [--clean] [--check] [--print]"
  );
  process.exit(2);
}

function parseArgs(argv) {
  const args = {
    check: false,
    clean: false,
    projectName: "",
    print: false,
    repo: "",
    write: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repo") {
      args.repo = argv[++index] || "";
    } else if (arg === "--project-name" || arg === "--consumer-name") {
      args.projectName = argv[++index] || "";
    } else if (arg === "--write") {
      args.write = true;
    } else if (arg === "--clean") {
      args.clean = true;
    } else if (arg === "--check") {
      args.check = true;
    } else if (arg === "--print") {
      args.print = true;
    } else if (arg === "--help" || arg === "-h") {
      usage();
    } else {
      console.error(`Unknown argument: ${arg}`);
      usage();
    }
  }

  if (!args.repo) usage();
  if (!args.write && !args.clean && !args.check && !args.print) usage();
  args.repo = path.resolve(args.repo);
  return args;
}

function titleize(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeOptionalWorkflow(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || /^none$/i.test(trimmed)) return null;
  return trimmed;
}

function parseList(value) {
  const normalized = normalizeOptionalWorkflow(value);
  if (!normalized) return [];
  return normalized
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function defaultConfig(projectName) {
  return {
    schemaVersion: 1,
    projectName,
    linearTeam: projectName,
    languages: {
      linear: "Russian",
      repo: "English",
    },
    artifactRoots: [],
    workflows: {
      implementation: null,
      ship: null,
      documentation: null,
      reviewFeedback: null,
      deploy: null,
    },
    prerequisites: {
      autoreviewHelper: true,
    },
  };
}

function parseLegacyMarkdownConfig(text, projectName) {
  const config = defaultConfig(projectName);
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*-\s*([^:]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim();

    if (key === "Consumer") config.projectName = value || config.projectName;
    if (key === "Linear team") config.linearTeam = value || config.linearTeam;
    if (key === "Linear-facing Project, PRD, Tech Spec, Issue, and comment language") {
      config.languages.linear = value || config.languages.linear;
    }
    if (key === "Repo docs and code comments language") {
      config.languages.repo = value || config.languages.repo;
    }
    if (key === "Artifact roots") config.artifactRoots = parseList(value);
    if (key === "Implementation workflow") config.workflows.implementation = normalizeOptionalWorkflow(value);
    if (key === "Ship workflow") config.workflows.ship = normalizeOptionalWorkflow(value);
    if (key === "Documentation workflow") config.workflows.documentation = normalizeOptionalWorkflow(value);
    if (key === "Review feedback workflow") config.workflows.reviewFeedback = normalizeOptionalWorkflow(value);
    if (key === "Deploy workflow") config.workflows.deploy = normalizeOptionalWorkflow(value);
    if (key === "Autoreview helper") config.prerequisites.autoreviewHelper = true;
  }
  return config;
}

function readJsonConfig(configPath, failures = []) {
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    failures.push(`Project config is not valid JSON: ${CONFIG_RELATIVE_PATH} (${error.message})`);
    return null;
  }
}

function configFromRepo(repo, projectName) {
  const jsonPath = path.join(repo, CONFIG_RELATIVE_PATH);
  const legacyPath = path.join(repo, LEGACY_CONFIG_RELATIVE_PATH);
  if (fs.existsSync(jsonPath)) {
    const failures = [];
    const config = readJsonConfig(jsonPath, failures);
    if (!config) throw new Error(failures.join("\n"));
    return config;
  }
  if (fs.existsSync(legacyPath)) {
    return parseLegacyMarkdownConfig(fs.readFileSync(legacyPath, "utf8"), projectName);
  }
  return defaultConfig(projectName);
}

function hasPlaceholder(value) {
  if (typeof value === "string") return /<[^>\n]+>/.test(value);
  if (Array.isArray(value)) return value.some((entry) => hasPlaceholder(entry));
  if (value && typeof value === "object") return Object.values(value).some((entry) => hasPlaceholder(entry));
  return false;
}

function validateConfig(config, failures) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    failures.push("Project config must be a JSON object");
    return;
  }
  if (config.schemaVersion !== 1) failures.push("Project config schemaVersion must be 1");
  for (const field of ["projectName", "linearTeam"]) {
    if (typeof config[field] !== "string" || config[field].trim().length === 0) {
      failures.push(`Project config missing ${field}`);
    }
  }
  if (!config.languages || typeof config.languages !== "object") {
    failures.push("Project config missing languages");
  } else {
    for (const field of ["linear", "repo"]) {
      if (typeof config.languages[field] !== "string" || config.languages[field].trim().length === 0) {
        failures.push(`Project config missing languages.${field}`);
      }
    }
  }
  if (!Array.isArray(config.artifactRoots)) {
    failures.push("Project config artifactRoots must be an array");
  } else if (!config.artifactRoots.every((entry) => typeof entry === "string" && entry.trim().length > 0)) {
    failures.push("Project config artifactRoots entries must be non-empty strings");
  }
  if (!config.workflows || typeof config.workflows !== "object") {
    failures.push("Project config missing workflows");
  } else {
    for (const field of ["implementation", "ship", "documentation", "reviewFeedback", "deploy"]) {
      if (!(field in config.workflows)) {
        failures.push(`Project config missing workflows.${field}`);
        continue;
      }
      const value = config.workflows[field];
      if (value !== null && (typeof value !== "string" || value.trim().length === 0)) {
        failures.push(`Project config workflows.${field} must be a string or null`);
      }
    }
  }
  if (!config.prerequisites || config.prerequisites.autoreviewHelper !== true) {
    failures.push("Project config must set prerequisites.autoreviewHelper to true");
  }
  if (hasPlaceholder(config)) {
    failures.push("Project config contains unresolved <...> placeholder");
  }
  if ("landWorkflow" in config || config.workflows?.land) {
    failures.push("Project config must use workflows.deploy, not Land workflow compatibility fields");
  }
}

function scanLegacyProjectFiles(repo) {
  const legacy = [];
  for (const relativePath of LEGACY_FILES) {
    if (fs.existsSync(path.join(repo, relativePath))) legacy.push(relativePath);
  }

  for (const skillsRoot of [".agents/skills", ".claude/skills"]) {
    const absoluteRoot = path.join(repo, skillsRoot);
    if (!fs.existsSync(absoluteRoot)) continue;
    for (const entry of fs.readdirSync(absoluteRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith("linear-")) {
        legacy.push(path.join(skillsRoot, entry.name));
      }
    }
  }

  return legacy.sort();
}

function removeEmptyDir(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    fs.rmdirSync(dir);
  } catch {
    // Directory still has project-owned files.
  }
}

function cleanLegacyProjectFiles(repo) {
  for (const relativePath of LEGACY_FILES) {
    fs.rmSync(path.join(repo, relativePath), { recursive: true, force: true });
  }

  for (const skillsRoot of [".agents/skills", ".claude/skills"]) {
    const absoluteRoot = path.join(repo, skillsRoot);
    if (!fs.existsSync(absoluteRoot)) continue;
    for (const entry of fs.readdirSync(absoluteRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith("linear-")) {
        fs.rmSync(path.join(absoluteRoot, entry.name), { recursive: true, force: true });
      }
    }
    removeEmptyDir(absoluteRoot);
  }

  removeEmptyDir(path.join(repo, ".github", "workflows"));
  removeEmptyDir(path.join(repo, ".github"));
  removeEmptyDir(path.join(repo, ".claude", "skills"));
  removeEmptyDir(path.join(repo, ".claude"));
}

function writeConfig(repo, config) {
  const configPath = path.join(repo, CONFIG_RELATIVE_PATH);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

function checkProject(repo) {
  const failures = [];
  const configPath = path.join(repo, CONFIG_RELATIVE_PATH);
  if (!fs.existsSync(configPath)) {
    failures.push(`Missing project config: ${CONFIG_RELATIVE_PATH}`);
  } else {
    const config = readJsonConfig(configPath, failures);
    if (config) validateConfig(config, failures);
  }

  const legacyFiles = scanLegacyProjectFiles(repo);
  for (const relativePath of legacyFiles) {
    failures.push(`Legacy Linear workflow project install file must be removed: ${relativePath}`);
  }

  if (failures.length > 0) {
    console.error("Linear workflow project config check failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Linear workflow project config check passed for ${repo}`);
}

const args = parseArgs(process.argv.slice(2));
if (!fs.existsSync(args.repo) || !fs.statSync(args.repo).isDirectory()) {
  console.error(`Project repo does not exist: ${args.repo}`);
  process.exit(1);
}

const projectName = args.projectName || titleize(path.basename(args.repo));

if (args.write) {
  let config = null;
  try {
    config = configFromRepo(args.repo, projectName);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  writeConfig(args.repo, config);
  console.log(`Wrote ${CONFIG_RELATIVE_PATH} for ${args.repo}`);
}

if (args.clean) {
  cleanLegacyProjectFiles(args.repo);
  console.log(`Cleaned legacy Linear workflow files for ${args.repo}`);
}

if (args.print) {
  try {
    console.log(JSON.stringify(configFromRepo(args.repo, projectName), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (args.check) {
  checkProject(args.repo);
}
