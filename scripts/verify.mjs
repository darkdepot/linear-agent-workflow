#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  console.error(
    "Usage: node scripts/verify.mjs [--install-check] [--help|-h]"
  );
  console.error("");
  console.error("Options:");
  console.error("  --install-check  Also run node scripts/install-local.mjs --check");
  console.error("                   (machine-specific; only valid on maintainer machine)");
  console.error("  --help, -h       Show this help and exit");
  process.exit(2);
}

function parseArgs(argv) {
  const args = { installCheck: false };
  for (const arg of argv) {
    if (arg === "--install-check") {
      args.installCheck = true;
    } else if (arg === "--help" || arg === "-h") {
      usage();
    } else {
      console.error(`Unknown argument: ${arg}`);
      usage();
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const steps = [
  { label: "git diff --check", cmd: "git", cmdArgs: ["diff", "--check"] },
  { label: "node --check scripts/install-local.mjs", cmd: "node", cmdArgs: ["--check", "scripts/install-local.mjs"] },
  { label: "node --check scripts/project-config.mjs", cmd: "node", cmdArgs: ["--check", "scripts/project-config.mjs"] },
  { label: "node --check scripts/lint-linear-artifacts.mjs", cmd: "node", cmdArgs: ["--check", "scripts/lint-linear-artifacts.mjs"] },
  { label: "node --check scripts/validate-workflow.mjs", cmd: "node", cmdArgs: ["--check", "scripts/validate-workflow.mjs"] },
  { label: "node --check scripts/verify.mjs", cmd: "node", cmdArgs: ["--check", "scripts/verify.mjs"] },
  { label: "node scripts/lint-linear-artifacts.mjs", cmd: "node", cmdArgs: ["scripts/lint-linear-artifacts.mjs"] },
  { label: "node scripts/validate-workflow.mjs", cmd: "node", cmdArgs: ["scripts/validate-workflow.mjs"] },
];

if (args.installCheck) {
  steps.push({ label: "node scripts/install-local.mjs --check", cmd: "node", cmdArgs: ["scripts/install-local.mjs", "--check"] });
}

const failures = [];

for (const step of steps) {
  try {
    execFileSync(step.cmd, step.cmdArgs, {
      cwd: root,
      stdio: "pipe",
    });
    console.log(`PASS ${step.label}`);
  } catch (err) {
    console.log(`FAIL ${step.label}`);
    const output = [err.stdout, err.stderr]
      .map((b) => (b ? b.toString().trimEnd() : ""))
      .filter(Boolean)
      .join("\n");
    if (output) {
      for (const line of output.split("\n")) {
        console.log(`  ${line}`);
      }
    }
    failures.push(step.label);
  }
}

const total = steps.length;
if (failures.length === 0) {
  console.log(`Verification passed (${total} checks).`);
  process.exit(0);
} else {
  console.log(`Verification failed: ${failures.length} of ${total} checks failed.`);
  process.exit(1);
}
