#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const UPSTREAM_REPO = "darkdepot/linear-agent-workflow";
const LOCKFILE_NAME = ".linear-agent-workflow.lock.json";
const GENERATED_MARKER = `Installed from ${UPSTREAM_REPO}`;

function usage() {
  console.error(
    "Usage: node scripts/install-local.mjs [--skills-root /path/to/skills] [--check] [--remove-stale]"
  );
  process.exit(2);
}

function parseArgs(argv) {
  const args = {
    check: false,
    removeStale: false,
    skillsRoot: path.join(os.homedir(), ".codex", "skills"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--skills-root") {
      args.skillsRoot = argv[++index] || "";
    } else if (arg === "--check") {
      args.check = true;
    } else if (arg === "--remove-stale") {
      args.removeStale = true;
    } else if (arg === "--help" || arg === "-h") {
      usage();
    } else {
      console.error(`Unknown argument: ${arg}`);
      usage();
    }
  }

  if (!args.skillsRoot) usage();
  args.skillsRoot = path.resolve(args.skillsRoot);
  return args;
}

function command(cwd, commandName, args) {
  try {
    return execFileSync(commandName, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const detail = error.stderr?.toString().trim() || error.message;
    throw new Error(`${commandName} ${args.join(" ")} failed in ${cwd}: ${detail}`);
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readVersion(root) {
  const versionPath = path.join(root, "VERSION");
  if (!fs.existsSync(versionPath)) return "";
  return fs.readFileSync(versionPath, "utf8").trim();
}

function listSourceSkills(root) {
  return fs
    .readdirSync(path.join(root, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("linear-"))
    .map((entry) => entry.name)
    .sort();
}

function listFilesRecursive(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const files = [];
  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.isFile()) {
        files.push(path.relative(rootDir, entryPath));
      }
    }
  }
  walk(rootDir);
  return files.sort();
}

function directoryManifest(rootDir) {
  return listFilesRecursive(rootDir).map((relativePath) => ({
    path: relativePath,
    sha256: sha256(fs.readFileSync(path.join(rootDir, relativePath))),
  }));
}

function copyDirectory(source, destination) {
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function installedSkillBody(sourceText, commit, dirty) {
  const marker = dirty ? `${commit} dirty` : commit;
  const metadata = `<!-- ${GENERATED_MARKER} @ ${marker}. Do not edit manually. -->`;
  let body = sourceText.replace(/`skills\/(linear-[^`]+\/SKILL\.md)`/g, "`../$1`");

  const lines = body.split("\n");
  const h1Index = lines.findIndex((line) => line.startsWith("# "));
  if (h1Index >= 0) {
    lines.splice(
      h1Index + 1,
      0,
      "",
      "Installed local note: read the active project's `.agents/linear-workflow.config.json` when present for Linear team, language, artifact roots, and workflow policy. Shared `references/` and `templates/` are copied into this skill directory."
    );
    body = lines.join("\n");
  }

  const trimmedBody = body.trimEnd();
  const frontmatter = trimmedBody.match(/^(---\n[\s\S]*?\n---\n?)([\s\S]*)$/);
  if (frontmatter) {
    return `${frontmatter[1].trimEnd()}\n\n${metadata}\n${frontmatter[2].trimStart().trimEnd()}\n`;
  }

  return `${metadata}\n${trimmedBody}\n`;
}

function plannedInstall(root, skillsRoot, commit, dirty) {
  const skills = listSourceSkills(root);
  const files = [];

  for (const skill of skills) {
    const sourcePath = path.join(root, "skills", skill, "SKILL.md");
    const skillDir = path.join(skillsRoot, skill);
    const body = installedSkillBody(fs.readFileSync(sourcePath, "utf8"), commit, dirty);
    files.push({
      name: skill,
      dir: skillDir,
      skillPath: path.join(skillDir, "SKILL.md"),
      body,
      sha256: sha256(body),
    });
  }

  return {
    skills,
    files,
    assets: {
      agents: sha256(fs.readFileSync(path.join(root, "AGENTS.md"))),
      references: directoryManifest(path.join(root, "references")),
      templates: directoryManifest(path.join(root, "templates")),
    },
    lockPath: path.join(skillsRoot, LOCKFILE_NAME),
  };
}

function compareCopiedAssets(installedDir, label, expectedAssets, failures) {
  if (!fs.existsSync(installedDir)) {
    failures.push(`Missing copied ${label}`);
    return;
  }

  const installedFiles = listFilesRecursive(installedDir);
  const expectedSet = new Set(expectedAssets.map((asset) => asset.path));
  const installedSet = new Set(installedFiles);

  for (const asset of expectedAssets) {
    const installedPath = path.join(installedDir, asset.path);
    if (!installedSet.has(asset.path)) {
      failures.push(`Missing copied ${label} file: ${asset.path}`);
      continue;
    }
    if (sha256(fs.readFileSync(installedPath)) !== asset.sha256) {
      failures.push(`Copied ${label} file is stale or edited: ${asset.path}`);
    }
  }

  for (const relativePath of installedFiles) {
    if (!expectedSet.has(relativePath)) {
      failures.push(`Unexpected copied ${label} file: ${relativePath}`);
    }
  }
}

function readLock(lockPath, failures = []) {
  if (!fs.existsSync(lockPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(lockPath, "utf8"));
  } catch (error) {
    failures.push(`Lockfile is corrupted: ${lockPath} (${error.message})`);
    return null;
  }
}

function isGeneratedLinearSkillDir(skillDir) {
  const skillPath = path.join(skillDir, "SKILL.md");
  if (!fs.existsSync(skillPath)) return false;
  return fs.readFileSync(skillPath, "utf8").includes(GENERATED_MARKER);
}

function removeStaleFromPreviousLock(lock, expectedSkills, skillsRoot) {
  if (!lock) return;
  for (const skill of lock.installedSkills || []) {
    if (!skill.name || expectedSkills.has(skill.name)) continue;
    const skillDir = path.join(skillsRoot, skill.name);
    if (isGeneratedLinearSkillDir(skillDir)) {
      fs.rmSync(skillDir, { recursive: true, force: true });
    }
  }
}

function removeGeneratedStaleLinearDirs(skillsRoot, expectedSkills) {
  if (!fs.existsSync(skillsRoot)) return;
  for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("linear-")) continue;
    if (expectedSkills.has(entry.name)) continue;
    const skillDir = path.join(skillsRoot, entry.name);
    if (isGeneratedLinearSkillDir(skillDir)) {
      fs.rmSync(skillDir, { recursive: true, force: true });
    }
  }
}

function sync(root, skillsRoot, commit, dirty, version, removeStale) {
  fs.mkdirSync(skillsRoot, { recursive: true });
  const plan = plannedInstall(root, skillsRoot, commit, dirty);
  const expectedSkills = new Set(plan.skills);
  const previousLock = readLock(plan.lockPath);

  removeStaleFromPreviousLock(previousLock, expectedSkills, skillsRoot);
  if (removeStale) removeGeneratedStaleLinearDirs(skillsRoot, expectedSkills);

  const manifestSkills = [];
  for (const file of plan.files) {
    fs.rmSync(file.dir, { recursive: true, force: true });
    fs.mkdirSync(file.dir, { recursive: true });
    fs.writeFileSync(file.skillPath, file.body);
    fs.copyFileSync(path.join(root, "AGENTS.md"), path.join(file.dir, "AGENTS.md"));
    copyDirectory(path.join(root, "references"), path.join(file.dir, "references"));
    copyDirectory(path.join(root, "templates"), path.join(file.dir, "templates"));
    manifestSkills.push({
      name: file.name,
      path: path.relative(skillsRoot, file.skillPath),
      sha256: file.sha256,
    });
  }

  const manifest = {
    schemaVersion: 2,
    upstreamRepo: UPSTREAM_REPO,
    upstreamVersion: version,
    upstreamCommit: commit,
    upstreamDirty: dirty,
    installedAt: new Date().toISOString(),
    skillsRoot,
    assets: plan.assets,
    installedSkills: manifestSkills,
  };
  fs.writeFileSync(plan.lockPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`Installed ${manifestSkills.length} Linear workflow skills into ${skillsRoot}`);
}

function check(root, skillsRoot, commit, dirty) {
  const failures = [];
  const plan = plannedInstall(root, skillsRoot, commit, dirty);
  const lock = readLock(plan.lockPath, failures);

  for (const file of plan.files) {
    if (!fs.existsSync(file.skillPath)) {
      failures.push(`Missing installed skill: ${path.relative(skillsRoot, file.skillPath)}`);
      continue;
    }
    const text = fs.readFileSync(file.skillPath, "utf8");
    if (text !== file.body) {
      failures.push(`Installed skill is stale or edited: ${path.relative(skillsRoot, file.skillPath)}`);
    }
    const agentsPath = path.join(file.dir, "AGENTS.md");
    if (!fs.existsSync(agentsPath)) {
      failures.push(`Missing copied AGENTS.md for ${file.name}`);
    } else if (sha256(fs.readFileSync(agentsPath)) !== plan.assets.agents) {
      failures.push(`Copied AGENTS.md is stale or edited for ${file.name}`);
    }
    compareCopiedAssets(path.join(file.dir, "references"), `references for ${file.name}`, plan.assets.references, failures);
    compareCopiedAssets(path.join(file.dir, "templates"), `templates for ${file.name}`, plan.assets.templates, failures);
  }

  if (!lock) {
    failures.push(`Missing lockfile: ${path.relative(skillsRoot, plan.lockPath)}`);
  } else {
    if (lock.schemaVersion !== 2) failures.push("Lockfile schemaVersion must be 2");
    if (lock.upstreamRepo !== UPSTREAM_REPO) failures.push("Lockfile upstreamRepo mismatch");
    if (lock.upstreamCommit !== commit) failures.push("Lockfile upstreamCommit mismatch");
    if (lock.upstreamDirty !== dirty) failures.push("Lockfile upstreamDirty mismatch");
    if (JSON.stringify(lock.assets || {}) !== JSON.stringify(plan.assets)) {
      failures.push("Lockfile copied asset hashes mismatch");
    }
    const lockedSkills = new Map((lock.installedSkills || []).map((skill) => [skill.name, skill]));
    for (const file of plan.files) {
      const locked = lockedSkills.get(file.name);
      if (!locked) {
        failures.push(`Lockfile missing skill: ${file.name}`);
        continue;
      }
      if (locked.path !== path.relative(skillsRoot, file.skillPath)) {
        failures.push(`Lockfile path mismatch for ${file.name}`);
      }
      if (locked.sha256 !== file.sha256) {
        failures.push(`Lockfile sha256 mismatch for ${file.name}`);
      }
    }
  }

  if (failures.length > 0) {
    console.error("Linear workflow local install check failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Linear workflow local install check passed for ${skillsRoot}`);
}

const args = parseArgs(process.argv.slice(2));
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");

let commit = "";
let dirty = false;
try {
  commit = command(root, "git", ["rev-parse", "HEAD"]);
  dirty = command(root, "git", ["status", "--short"]).length > 0;
} catch (error) {
  console.error(`Upstream must be a git checkout: ${root}`);
  console.error(error.message);
  process.exit(1);
}

if (args.check) {
  check(root, args.skillsRoot, commit, dirty);
} else {
  sync(root, args.skillsRoot, commit, dirty, readVersion(root), args.removeStale);
}
