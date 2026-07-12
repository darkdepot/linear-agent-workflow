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

// Pack-private shared directory at the skills root (a sibling of LOCKFILE_NAME).
// It holds workflow runtime scripts the installed skills invoke at delivery time
// — today the issue-only lane resolver the create-then-approve intake runs. It is
// hidden (leading dot) so it is never mistaken for an installed `linear-*` skill
// directory by discovery or stale-cleanup, which scan for `linear-` prefixes.
const RUNTIME_DIR = ".linear-agent-workflow";
const RUNTIME_SCRIPTS_SUBDIR = "scripts";
// Upstream scripts/ files published into
// <skills-root>/.linear-agent-workflow/scripts/. The resolver imports only Node
// built-ins, so it has no sibling-script dependencies; add any future sibling it
// imports here so the whole runtime dependency set is installed together.
const RUNTIME_SCRIPTS = ["resolve-issue-context.mjs"];

function usage() {
  console.error(
    "Usage: node scripts/install-local.mjs [--all-roots | --skills-root /path/to/skills] [--check] [--remove-stale]"
  );
  console.error("");
  console.error(`Default mode is --all-roots: discover every installed skills root (a directory holding ${LOCKFILE_NAME})`);
  console.error("among the known roots (~/.codex/skills, ~/.claude/skills, roots recorded in discovered lockfiles,");
  console.error("or the LINEAR_WORKFLOW_KNOWN_ROOTS override) and sync/check each of them in one run.");
  process.exit(2);
}

function parseArgs(argv) {
  const args = {
    check: false,
    removeStale: false,
    allRoots: false,
    skillsRoot: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--skills-root") {
      args.skillsRoot = argv[++index] || "";
      if (!args.skillsRoot) usage();
    } else if (arg === "--all-roots") {
      args.allRoots = true;
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

  if (args.allRoots && args.skillsRoot) {
    console.error("--all-roots cannot be combined with --skills-root; pass one root selection mode.");
    process.exit(2);
  }
  if (args.check && args.removeStale) {
    console.error("--remove-stale has no effect in --check mode; run without --check to sync and remove stale skills.");
    process.exit(2);
  }
  if (args.skillsRoot) {
    args.skillsRoot = path.resolve(args.skillsRoot);
  } else {
    args.allRoots = true;
  }
  return args;
}

function knownRootCandidates() {
  const envValue = process.env.LINEAR_WORKFLOW_KNOWN_ROOTS;
  if (envValue !== undefined) {
    return envValue
      .split(path.delimiter)
      .filter(Boolean)
      .map((entry) => path.resolve(entry));
  }
  return [
    path.join(os.homedir(), ".codex", "skills"),
    path.join(os.homedir(), ".claude", "skills"),
  ];
}

function discoverInstalledRoots(candidates) {
  const queue = [...candidates];
  const seen = new Set();
  const installed = [];

  while (queue.length > 0) {
    const candidate = path.resolve(queue.shift());
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    if (!fs.existsSync(path.join(candidate, LOCKFILE_NAME))) continue;
    installed.push(candidate);
    const lock = readLock(path.join(candidate, LOCKFILE_NAME));
    if (typeof lock?.skillsRoot === "string" && lock.skillsRoot) {
      queue.push(lock.skillsRoot);
    }
  }

  return installed;
}

function installedRootVersion(skillsRoot) {
  const lock = readLock(path.join(skillsRoot, LOCKFILE_NAME));
  return lock?.upstreamVersion || "unknown";
}

function resolveTargetRoots(args) {
  if (!args.allRoots) return [args.skillsRoot];

  const candidates = knownRootCandidates();
  const installed = discoverInstalledRoots(candidates);

  if (installed.length > 0) {
    console.log(`Discovered ${installed.length} installed skills root(s):`);
    for (const skillsRoot of installed) {
      console.log(`- ${skillsRoot} (version ${installedRootVersion(skillsRoot)})`);
    }
    return installed;
  }

  if (args.check) {
    console.error(`No installed skills roots found (checked: ${candidates.join(", ") || "none"}).`);
    console.error("Run node scripts/install-local.mjs first, or pass --skills-root.");
    process.exit(1);
  }

  if (candidates.length === 0) {
    console.error("No known skills roots to install into; pass --skills-root.");
    process.exit(2);
  }
  console.log(`No installed skills roots found; installing into default root ${candidates[0]}`);
  return [candidates[0]];
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

// The pack-private runtime scripts to publish into
// <skills-root>/.linear-agent-workflow/scripts/. `relativePath` is skills-root
// relative (the lockfile and --check key); `destPath` is the absolute install
// target; `sourcePath` is the upstream file copied verbatim.
function plannedRuntimeScripts(root, skillsRoot) {
  return RUNTIME_SCRIPTS.map((name) => {
    const sourcePath = path.join(root, "scripts", name);
    const relativePath = path.join(RUNTIME_DIR, RUNTIME_SCRIPTS_SUBDIR, name);
    return {
      name,
      sourcePath,
      destPath: path.join(skillsRoot, relativePath),
      relativePath,
      sha256: sha256(fs.readFileSync(sourcePath)),
    };
  });
}

// The lockfile shape for the runtime scripts: skills-root-relative path + hash,
// so sync() records and check() compares the same canonical structure.
function runtimeScriptsManifest(plan) {
  return plan.runtimeScripts.map((script) => ({ path: script.relativePath, sha256: script.sha256 }));
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
    runtimeScripts: plannedRuntimeScripts(root, skillsRoot),
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

  // Publish the pack-private runtime scripts (the issue-only resolver + any
  // sibling it imports) into <skills-root>/.linear-agent-workflow/scripts/, the
  // canonical location the installed skills invoke at delivery time. The whole
  // .linear-agent-workflow/ directory is installer-owned and fully rewritten each
  // sync, so a removed upstream script — or any file planted anywhere under it —
  // leaves no copy behind. (The lockfile sits beside this directory, not inside
  // it, so it is untouched.)
  const packDir = path.join(skillsRoot, RUNTIME_DIR);
  const runtimeDir = path.join(packDir, RUNTIME_SCRIPTS_SUBDIR);
  fs.rmSync(packDir, { recursive: true, force: true });
  fs.mkdirSync(runtimeDir, { recursive: true });
  for (const script of plan.runtimeScripts) {
    fs.copyFileSync(script.sourcePath, script.destPath);
  }

  const manifest = {
    schemaVersion: 3,
    upstreamRepo: UPSTREAM_REPO,
    upstreamVersion: version,
    upstreamCommit: commit,
    upstreamDirty: dirty,
    installedAt: new Date().toISOString(),
    skillsRoot,
    assets: plan.assets,
    runtimeScripts: runtimeScriptsManifest(plan),
    installedSkills: manifestSkills,
  };
  fs.writeFileSync(plan.lockPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`Installed ${manifestSkills.length} Linear workflow skills into ${skillsRoot} (version ${version || "unknown"})`);
}

function check(root, skillsRoot, commit, dirty, version) {
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

  // The pack-private runtime scripts must be installed, current, and free of
  // extras, so the create-then-approve intake finds the resolver at the
  // canonical path in every synced root. The extra-file scan walks the WHOLE
  // .linear-agent-workflow/ root (not just scripts/), so a file planted one level
  // up — e.g. .linear-agent-workflow/evil.mjs — is flagged too. The lockfile
  // lives beside this root, not inside it, so nothing here should exist outside
  // the expected runtime-script set.
  const packDir = path.join(skillsRoot, RUNTIME_DIR);
  const expectedRuntime = new Set(plan.runtimeScripts.map((script) => script.relativePath));
  for (const script of plan.runtimeScripts) {
    if (!fs.existsSync(script.destPath)) {
      failures.push(`Missing installed runtime script: ${script.relativePath}`);
      continue;
    }
    if (sha256(fs.readFileSync(script.destPath)) !== script.sha256) {
      failures.push(`Installed runtime script is stale or edited: ${script.relativePath}`);
    }
  }
  for (const relativePath of listFilesRecursive(packDir)) {
    const rooted = path.join(RUNTIME_DIR, relativePath);
    if (!expectedRuntime.has(rooted)) {
      failures.push(`Unexpected installed runtime script: ${rooted}`);
    }
  }

  if (!lock) {
    failures.push(`Missing lockfile: ${path.relative(skillsRoot, plan.lockPath)}`);
  } else {
    if (lock.schemaVersion !== 3) failures.push("Lockfile schemaVersion must be 3");
    if (lock.upstreamVersion !== version) {
      failures.push(`Lockfile upstreamVersion is ${lock.upstreamVersion || "unknown"} but upstream is ${version || "unknown"}`);
    }
    if (lock.upstreamRepo !== UPSTREAM_REPO) failures.push("Lockfile upstreamRepo mismatch");
    if (lock.upstreamCommit !== commit) failures.push("Lockfile upstreamCommit mismatch");
    if (lock.upstreamDirty !== dirty) failures.push("Lockfile upstreamDirty mismatch");
    if (JSON.stringify(lock.assets || {}) !== JSON.stringify(plan.assets)) {
      failures.push("Lockfile copied asset hashes mismatch");
    }
    if (JSON.stringify(lock.runtimeScripts || []) !== JSON.stringify(runtimeScriptsManifest(plan))) {
      failures.push("Lockfile runtime script hashes mismatch");
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

  return failures;
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

const version = readVersion(root);
const targetRoots = resolveTargetRoots(args);

if (args.check) {
  let failed = false;
  for (const skillsRoot of targetRoots) {
    const failures = check(root, skillsRoot, commit, dirty, version);
    if (failures.length > 0) {
      failed = true;
      console.error(`Linear workflow local install check failed for ${skillsRoot}:`);
      for (const failure of failures) console.error(`- ${failure}`);
    } else {
      console.log(`Linear workflow local install check passed for ${skillsRoot} (version ${installedRootVersion(skillsRoot)})`);
    }
  }
  process.exit(failed ? 1 : 0);
} else {
  for (const skillsRoot of targetRoots) {
    sync(root, skillsRoot, commit, dirty, version, args.removeStale);
  }
}
