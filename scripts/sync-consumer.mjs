#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const UPSTREAM_REPO = "darkdepot/linear-agent-workflow";
const REDIRECT_PATTERNS = [
  /thin adapter/i,
  /Resolve and follow/i,
  /LINEAR_AGENT_WORKFLOW_HOME/,
  /\.\.\/linear-agent-workflow/,
  /github\.com\/darkdepot\/linear-agent-workflow\/blob/i,
  /reusable workflow source in this order/i,
];

function usage() {
  console.error("Usage: node scripts/sync-consumer.mjs --repo /path/to/consumer [--consumer-name Name] [--check]");
  process.exit(2);
}

function parseArgs(argv) {
  const args = { check: false, repo: "", consumerName: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repo") {
      args.repo = argv[++index] || "";
    } else if (arg === "--consumer-name") {
      args.consumerName = argv[++index] || "";
    } else if (arg === "--check") {
      args.check = true;
    } else if (arg === "--help" || arg === "-h") {
      usage();
    } else {
      console.error(`Unknown argument: ${arg}`);
      usage();
    }
  }
  if (!args.repo) usage();
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

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function readVersion(root) {
  const versionPath = path.join(root, "VERSION");
  if (!fs.existsSync(versionPath)) return "";
  return fs.readFileSync(versionPath, "utf8").trim();
}

function titleize(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function readSkillMeta(text, fallbackName) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { name: fallbackName, description: `Installed ${fallbackName} skill.` };
  const frontmatter = match[1];
  const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim() || fallbackName;
  const description =
    frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim() ||
    `Installed ${name} skill.`;
  return { name, description };
}

function installBody(sourceText, commit, dirty) {
  const marker = dirty ? `${commit} dirty` : commit;
  const metadata = `<!-- Generated from ${UPSTREAM_REPO} @ ${marker}. Do not edit manually. -->`;
  let body = sourceText
    .replace(/`AGENTS\.md`/g, "`../../../AGENTS.md`")
    .replace(/`skills\/(linear-[^`]+\/SKILL\.md)`/g, "`../$1`");

  const lines = body.split("\n");
  const h1Index = lines.findIndex((line) => line.startsWith("# "));
  if (h1Index >= 0) {
    lines.splice(
      h1Index + 1,
      0,
      "",
      "Installed consumer note: read `../../linear-workflow.config.md` when present for repo-specific Linear team, language, and ship-workflow policy. Shared `references/` and `templates/` are copied into this skill directory."
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

function wrapperBody(sourceText, skillName) {
  const meta = readSkillMeta(sourceText, skillName);
  const title = titleize(meta.name.replace(/^linear-/, "linear "));
  return `---\nname: ${meta.name}\ndescription: ${meta.description}\n---\n\n# ${title}\n\nThis Claude Code project skill is a discovery wrapper for \`.agents/skills/${meta.name}/SKILL.md\`.\n\nOpen and follow \`.agents/skills/${meta.name}/SKILL.md\`.\n`;
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

function compareCopiedAssets(installedDir, label, expectedAssets, failures) {
  if (!fs.existsSync(installedDir)) {
    failures.push(`Missing copied ${label}`);
    return;
  }

  const installedFiles = listFilesRecursive(installedDir);
  const expectedFiles = expectedAssets.map((asset) => asset.path);
  const expectedSet = new Set(expectedFiles);
  const installedSet = new Set(installedFiles);

  for (const asset of expectedAssets) {
    const relativePath = asset.path;
    const installedPath = path.join(installedDir, relativePath);
    if (!installedSet.has(relativePath)) {
      failures.push(`Missing copied ${label} file: ${relativePath}`);
      continue;
    }
    if (sha256(fs.readFileSync(installedPath)) !== asset.sha256) {
      failures.push(`Copied ${label} file is stale or edited: ${relativePath}`);
    }
  }

  for (const relativePath of installedFiles) {
    if (!expectedSet.has(relativePath)) {
      failures.push(`Unexpected copied ${label} file: ${relativePath}`);
    }
  }
}

function checkerBody() {
  return `#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = path.join(repo, ".agents", "linear-workflow.lock.json");
const failures = [];
const REDIRECT_PATTERNS = [
  /thin adapter/i,
  /Resolve and follow/i,
  /LINEAR_AGENT_WORKFLOW_HOME/,
  /\\.\\.\\/linear-agent-workflow/,
  /github\\.com\\/darkdepot\\/linear-agent-workflow\\/blob/i,
  /reusable workflow source in this order/i,
];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
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

function checkHash(relativePath, expectedHash, label) {
  const absolutePath = path.join(repo, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push("Missing " + label + ": " + relativePath);
    return "";
  }
  const text = fs.readFileSync(absolutePath);
  const actualHash = sha256(text);
  if (actualHash !== expectedHash) {
    failures.push("Stale or edited " + label + ": " + relativePath);
  }
  return text.toString("utf8");
}

function checkCopiedAssets(skill, assetType, expectedAssets) {
  const skillDir = path.dirname(path.join(repo, skill.agentsPath));
  const installedDir = path.join(skillDir, assetType);
  if (!fs.existsSync(installedDir)) {
    failures.push("Missing copied " + assetType + " for " + skill.name);
    return;
  }

  const installedFiles = listFilesRecursive(installedDir);
  const expectedFiles = expectedAssets.map((asset) => asset.path);
  const installedSet = new Set(installedFiles);
  const expectedSet = new Set(expectedFiles);

  for (const asset of expectedAssets) {
    const installedPath = path.join(installedDir, asset.path);
    if (!installedSet.has(asset.path)) {
      failures.push("Missing copied " + assetType + " for " + skill.name + " file: " + asset.path);
      continue;
    }
    if (sha256(fs.readFileSync(installedPath)) !== asset.sha256) {
      failures.push("Copied " + assetType + " for " + skill.name + " file is stale or edited: " + asset.path);
    }
  }

  for (const relativePath of installedFiles) {
    if (!expectedSet.has(relativePath)) {
      failures.push("Unexpected copied " + assetType + " for " + skill.name + " file: " + relativePath);
    }
  }
}

function checkUnexpectedLinearDirs(rootDir, expectedSkills, label) {
  if (!fs.existsSync(rootDir)) return;
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("linear-")) continue;
    if (!expectedSkills.has(entry.name)) {
      failures.push("Unexpected unmanaged " + label + ": " + path.relative(repo, path.join(rootDir, entry.name)));
    }
  }
}

if (!fs.existsSync(lockPath)) {
  failures.push("Missing lockfile: .agents/linear-workflow.lock.json");
} else {
  let lock = null;
  try {
    lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  } catch (error) {
    failures.push("Lockfile is corrupted: " + error.message);
  }

  if (lock) {
    const references = lock.copiedAssets?.references || [];
    const templates = lock.copiedAssets?.templates || [];
    const expectedSkills = new Set((lock.installedSkills || []).map((skill) => skill.name));
    if (references.length === 0) failures.push("Lockfile missing copied reference hashes");
    if (templates.length === 0) failures.push("Lockfile missing copied template hashes");
    if (lock.checkerPath && lock.checkerSha256) {
      checkHash(lock.checkerPath, lock.checkerSha256, "local install checker");
    } else {
      failures.push("Lockfile missing local checker hash");
    }

    for (const skill of lock.installedSkills || []) {
      const skillText = checkHash(skill.agentsPath, skill.sha256, "installed skill");
      if (skillText) {
        if (!skillText.startsWith("---\\n")) {
          failures.push("Installed skill must keep YAML frontmatter first: " + skill.agentsPath);
        }
        if (!skillText.slice(0, 1200).includes("Generated from " + lock.upstreamRepo + " @ ")) {
          failures.push("Missing generated metadata near top: " + skill.agentsPath);
        }
        for (const pattern of REDIRECT_PATTERNS) {
          if (pattern.test(skillText)) {
            failures.push("Redirect-stub pattern " + pattern + " found in " + skill.agentsPath);
          }
        }
        if (skillText.length < 1000) {
          failures.push("Installed skill looks too small to be executable: " + skill.agentsPath);
        }
      }

      if (skill.wrapperSha256) {
        checkHash(skill.claudePath, skill.wrapperSha256, "Claude wrapper");
      } else if (!fs.existsSync(path.join(repo, skill.claudePath))) {
        failures.push("Missing Claude wrapper: " + skill.claudePath);
      }

      checkCopiedAssets(skill, "references", references);
      checkCopiedAssets(skill, "templates", templates);
    }

    checkUnexpectedLinearDirs(path.join(repo, ".agents", "skills"), expectedSkills, "Linear skill");
    checkUnexpectedLinearDirs(path.join(repo, ".claude", "skills"), expectedSkills, "Claude Linear wrapper");
  }
}

if (failures.length > 0) {
  console.error("Linear workflow local install check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Linear workflow local install check passed for " + repo);
`;
}

function writeIfMissing(filePath, contents) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents);
    return true;
  }
  return false;
}

function defaultConfig(consumerName) {
  const isZeni = consumerName.toLowerCase() === "zeni";
  return `# Linear Workflow Consumer Config

This file is local consumer policy for generated \`linear-*\` skills.

- Consumer: ${consumerName}
- Linear team: ${isZeni ? "Zeni" : "<set team name>"}
- Linear-facing Project, PRD, Tech Spec, Issue, and comment language: ${isZeni ? "Russian" : "<set language>"}
- Repo docs and code comments language: English
- Linear is the planning, spec, and task source of truth.
- GitHub is branch, PR, review, CI, deploy, and merge history only.
- Main workflow: \`linear-idea\` -> discovery/reviews -> \`linear-handoff\` -> risk-based \`linear-review\` gate -> approved Issue(s) -> implementation/ship.
- Ship workflow: ${isZeni ? "gstack ship" : "<set consumer ship workflow>"}
- Review feedback workflow: ${isZeni ? "compound-engineering:ce-resolve-pr-feedback" : "<optional review feedback workflow>"}
- Land workflow: ${isZeni ? "gstack land-and-deploy" : "<optional land/deploy workflow>"}
`;
}

function listSourceSkills(root) {
  return fs
    .readdirSync(path.join(root, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("linear-"))
    .map((entry) => entry.name)
    .sort();
}

function plannedInstall(root, repo, consumerName, commit, dirty) {
  const skills = listSourceSkills(root);
  const files = [];
  const generatedChecker = checkerBody();
  for (const skill of skills) {
    const sourcePath = path.join(root, "skills", skill, "SKILL.md");
    const sourceText = fs.readFileSync(sourcePath, "utf8");
    const installed = installBody(sourceText, commit, dirty);
    const wrapper = wrapperBody(sourceText, skill);
    files.push({
      skill,
      sourcePath,
      agentsPath: path.join(repo, ".agents", "skills", skill, "SKILL.md"),
      claudePath: path.join(repo, ".claude", "skills", skill, "SKILL.md"),
      installed,
      wrapper,
      hash: sha256(installed),
      wrapperHash: sha256(wrapper),
    });
  }
  return {
    skills,
    files,
    copiedAssets: {
      references: directoryManifest(path.join(root, "references")),
      templates: directoryManifest(path.join(root, "templates")),
    },
    configPath: path.join(repo, ".agents", "linear-workflow.config.md"),
    configText: defaultConfig(consumerName),
    checkerPath: path.join(repo, ".agents", "linear-workflow-check.mjs"),
    checkerText: generatedChecker,
    checkerHash: sha256(generatedChecker),
    lockPath: path.join(repo, ".agents", "linear-workflow.lock.json"),
  };
}

function removeOrphanedLinearSkillDirs(rootDir, expectedSkills) {
  if (!fs.existsSync(rootDir)) return;
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith("linear-")) continue;
    if (expectedSkills.has(entry.name)) continue;
    fs.rmSync(path.join(rootDir, entry.name), { recursive: true, force: true });
  }
}

function sync(root, repo, consumerName, commit, dirty, version) {
  const plan = plannedInstall(root, repo, consumerName, commit, dirty);
  const agentsSkillsRoot = path.join(repo, ".agents", "skills");
  const claudeSkillsRoot = path.join(repo, ".claude", "skills");
  fs.mkdirSync(agentsSkillsRoot, { recursive: true });
  fs.mkdirSync(claudeSkillsRoot, { recursive: true });
  const expectedSkills = new Set(plan.skills);
  removeOrphanedLinearSkillDirs(agentsSkillsRoot, expectedSkills);
  removeOrphanedLinearSkillDirs(claudeSkillsRoot, expectedSkills);

  const installedAt = new Date().toISOString();
  const manifestSkills = [];

  for (const file of plan.files) {
    const skillDir = path.dirname(file.agentsPath);
    fs.rmSync(skillDir, { recursive: true, force: true });
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(file.agentsPath, file.installed);
    copyDirectory(path.join(root, "references"), path.join(skillDir, "references"));
    copyDirectory(path.join(root, "templates"), path.join(skillDir, "templates"));

    fs.mkdirSync(path.dirname(file.claudePath), { recursive: true });
    fs.writeFileSync(file.claudePath, file.wrapper);

    manifestSkills.push({
      name: file.skill,
      agentsPath: path.relative(repo, file.agentsPath),
      claudePath: path.relative(repo, file.claudePath),
      sha256: file.hash,
      wrapperSha256: file.wrapperHash,
    });
  }

  writeIfMissing(plan.configPath, plan.configText);
  fs.writeFileSync(plan.checkerPath, plan.checkerText);

  const manifest = {
    schemaVersion: 1,
    upstreamRepo: UPSTREAM_REPO,
    upstreamVersion: version,
    upstreamCommit: commit,
    upstreamDirty: dirty,
    installedAt,
    consumerName,
    checkerPath: path.relative(repo, plan.checkerPath),
    checkerSha256: plan.checkerHash,
    copiedAssets: plan.copiedAssets,
    installedSkills: manifestSkills,
  };
  fs.writeFileSync(plan.lockPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`Synced ${manifestSkills.length} Linear skills into ${repo}`);
}

function check(root, repo, consumerName, commit, dirty) {
  const lockPath = path.join(repo, ".agents", "linear-workflow.lock.json");
  const failures = [];
  let lock = null;
  let checkConsumerName = consumerName;
  let checkCommit = commit;
  let checkDirty = dirty;
  if (fs.existsSync(lockPath)) {
    try {
      lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    } catch (error) {
      failures.push(`Lockfile is corrupted: ${path.relative(repo, lockPath)} (${error.message})`);
    }
    if (lock) {
      if (lock.consumerName) checkConsumerName = lock.consumerName;
      if (lock.upstreamCommit) checkCommit = lock.upstreamCommit;
      if (typeof lock.upstreamDirty === "boolean") checkDirty = lock.upstreamDirty;
    }
  }

  const plan = plannedInstall(root, repo, checkConsumerName, checkCommit, checkDirty);
  const expectedSkills = new Set(plan.skills);

  for (const file of plan.files) {
    if (!fs.existsSync(file.agentsPath)) {
      failures.push(`Missing installed skill: ${path.relative(repo, file.agentsPath)}`);
      continue;
    }
    const text = fs.readFileSync(file.agentsPath, "utf8");
    const relativeAgentsPath = path.relative(repo, file.agentsPath);
    const relativeClaudePath = path.relative(repo, file.claudePath);
    if (!text.startsWith("---\n")) {
      failures.push(`Installed skill must keep YAML frontmatter first: ${relativeAgentsPath}`);
    }
    if (!text.slice(0, 1200).includes(`Generated from ${UPSTREAM_REPO} @ `)) {
      failures.push(`Missing generated metadata near top: ${relativeAgentsPath}`);
    }
    for (const pattern of REDIRECT_PATTERNS) {
      if (pattern.test(text)) {
        failures.push(`Redirect-stub pattern ${pattern} found in ${relativeAgentsPath}`);
      }
    }
    if (text !== file.installed) {
      failures.push(`Installed skill is stale or edited: ${relativeAgentsPath}`);
    }
    if (text.length < 1000) {
      failures.push(`Installed skill looks too small to be executable: ${relativeAgentsPath}`);
    }
    const installedSkillDir = path.dirname(file.agentsPath);
    compareCopiedAssets(
      path.join(installedSkillDir, "references"),
      `references for ${file.skill}`,
      plan.copiedAssets.references,
      failures
    );
    compareCopiedAssets(
      path.join(installedSkillDir, "templates"),
      `templates for ${file.skill}`,
      plan.copiedAssets.templates,
      failures
    );
    if (!fs.existsSync(file.claudePath)) {
      failures.push(`Missing Claude wrapper: ${relativeClaudePath}`);
    } else {
      const wrapperText = fs.readFileSync(file.claudePath, "utf8");
      if (wrapperText !== file.wrapper) {
        failures.push(`Claude wrapper is stale or edited: ${relativeClaudePath}`);
      }
    }
  }

  if (!fs.existsSync(plan.checkerPath)) {
    failures.push(`Missing local install checker: ${path.relative(repo, plan.checkerPath)}`);
  } else {
    const checkerText = fs.readFileSync(plan.checkerPath, "utf8");
    if (checkerText !== plan.checkerText) {
      failures.push(`Local install checker is stale or edited: ${path.relative(repo, plan.checkerPath)}`);
    }
  }

  const agentsSkillsRoot = path.join(repo, ".agents", "skills");
  if (fs.existsSync(agentsSkillsRoot)) {
    for (const entry of fs.readdirSync(agentsSkillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith("linear-")) continue;
      if (!expectedSkills.has(entry.name)) {
        failures.push(`Unexpected unmanaged Linear skill: ${path.relative(repo, path.join(agentsSkillsRoot, entry.name))}`);
      }
    }
  }

  const claudeSkillsRoot = path.join(repo, ".claude", "skills");
  if (fs.existsSync(claudeSkillsRoot)) {
    for (const entry of fs.readdirSync(claudeSkillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith("linear-")) continue;
      if (!expectedSkills.has(entry.name)) {
        failures.push(`Unexpected unmanaged Claude Linear wrapper: ${path.relative(repo, path.join(claudeSkillsRoot, entry.name))}`);
      }
    }
  }

  if (!fs.existsSync(plan.configPath)) {
    failures.push(`Missing consumer config: ${path.relative(repo, plan.configPath)}`);
  }

  if (!fs.existsSync(plan.lockPath)) {
    failures.push(`Missing lockfile: ${path.relative(repo, plan.lockPath)}`);
  } else if (lock) {
    const lockedSkills = new Map((lock.installedSkills || []).map((skill) => [skill.name, skill]));
    for (const file of plan.files) {
      const locked = lockedSkills.get(file.skill);
      if (!locked) {
        failures.push(`Lockfile missing skill: ${file.skill}`);
        continue;
      }
      if (locked.agentsPath !== path.relative(repo, file.agentsPath)) {
        failures.push(`Lockfile agentsPath mismatch for ${file.skill}`);
      }
      if (locked.claudePath !== path.relative(repo, file.claudePath)) {
        failures.push(`Lockfile claudePath mismatch for ${file.skill}`);
      }
      if (locked.sha256 !== file.hash) {
        failures.push(`Lockfile sha256 mismatch for ${file.skill}`);
      }
      if (locked.wrapperSha256 !== file.wrapperHash) {
        failures.push(`Lockfile wrapperSha256 mismatch for ${file.skill}`);
      }
    }
    if (lock.checkerPath !== path.relative(repo, plan.checkerPath)) {
      failures.push("Lockfile checkerPath mismatch");
    }
    if (lock.checkerSha256 !== plan.checkerHash) {
      failures.push("Lockfile checkerSha256 mismatch");
    }
    if (JSON.stringify(lock.copiedAssets || {}) !== JSON.stringify(plan.copiedAssets)) {
      failures.push("Lockfile copiedAssets mismatch");
    }
  }

  if (failures.length > 0) {
    console.error("Linear workflow install check failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Linear workflow install check passed for ${repo}`);
}

const args = parseArgs(process.argv.slice(2));
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const repo = path.resolve(args.repo);
const consumerName = args.consumerName || titleize(path.basename(repo));

if (!fs.existsSync(repo) || !fs.statSync(repo).isDirectory()) {
  console.error(`Consumer repo does not exist: ${repo}`);
  process.exit(1);
}

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
  check(root, repo, consumerName, commit, dirty);
} else {
  sync(root, repo, consumerName, commit, dirty, readVersion(root));
}
