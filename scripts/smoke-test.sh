#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/linear-workflow-smoke.XXXXXX")"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

SOURCE="$TMP_DIR/source"
CONSUMER="$TMP_DIR/consumer"
RETRY_CONSUMER="$TMP_DIR/retry-consumer"

mkdir -p "$SOURCE" "$CONSUMER" "$RETRY_CONSUMER"
rsync -a \
  --exclude ".git" \
  --exclude ".agents" \
  --exclude ".claude" \
  "$REPO_ROOT/" "$SOURCE/"

git -C "$SOURCE" init --quiet
git -C "$SOURCE" config user.email "linear-workflow-smoke@example.com"
git -C "$SOURCE" config user.name "Linear Workflow Smoke"
git -C "$SOURCE" add .
git -C "$SOURCE" commit --quiet -m "Initial smoke source"
git -C "$SOURCE" tag v0.1.0

"$SOURCE/scripts/install.sh" --mode self --target "$SOURCE"
"$SOURCE/scripts/check.sh" --mode self --target "$SOURCE"

git -C "$CONSUMER" init --quiet
git -C "$CONSUMER" config user.email "linear-workflow-smoke@example.com"
git -C "$CONSUMER" config user.name "Linear Workflow Smoke"
git -C "$CONSUMER" commit --allow-empty --quiet -m "Initial consumer"
git -C "$CONSUMER" switch -c linear-workflow-update --quiet

git -C "$RETRY_CONSUMER" init --quiet
git -C "$RETRY_CONSUMER" config user.email "linear-workflow-smoke@example.com"
git -C "$RETRY_CONSUMER" config user.name "Linear Workflow Smoke"
git -C "$RETRY_CONSUMER" commit --allow-empty --quiet -m "Initial retry consumer"
if "$SOURCE/scripts/update.sh" \
  --mode consumer \
  --target "$RETRY_CONSUMER" \
  --source "$SOURCE" \
  --repository "$SOURCE" \
  --version v9.9.9 \
  --branch linear-workflow-retry >"$TMP_DIR/retry-missing-tag.log" 2>&1; then
  echo "Expected update with missing tag to fail" >&2
  exit 1
fi
test "$(git -C "$RETRY_CONSUMER" branch --show-current)" = "linear-workflow-retry"
"$SOURCE/scripts/update.sh" \
  --mode consumer \
  --target "$RETRY_CONSUMER" \
  --source "$SOURCE" \
  --repository "$SOURCE" \
  --version v0.1.0 \
  --branch linear-workflow-retry
"$SOURCE/scripts/check.sh" --mode consumer --target "$RETRY_CONSUMER" --source "$SOURCE"

"$SOURCE/scripts/install.sh" \
  --mode consumer \
  --target "$CONSUMER" \
  --source "$SOURCE" \
  --repository "$SOURCE" \
  --version v0.1.0
"$SOURCE/scripts/check.sh" --mode consumer --target "$CONSUMER" --source "$SOURCE" --latest

printf "0.2.0\n" > "$SOURCE/VERSION"
git -C "$SOURCE" add VERSION
git -C "$SOURCE" commit --quiet -m "Release 0.2.0"
git -C "$SOURCE" tag v0.2.0

"$SOURCE/scripts/check.sh" --mode consumer --target "$CONSUMER" --source "$SOURCE" --latest >"$TMP_DIR/stale.log"
grep -q "STALE" "$TMP_DIR/stale.log"

"$SOURCE/scripts/update.sh" \
  --mode consumer \
  --target "$CONSUMER" \
  --source "$SOURCE" \
  --repository "$SOURCE" \
  --version v0.2.0
"$SOURCE/scripts/check.sh" --mode consumer --target "$CONSUMER" --source "$SOURCE" --latest

mkdir -p "$SOURCE/skills/linear-new"
cat > "$SOURCE/skills/linear-new/SKILL.md" <<'EOF'
---
name: linear-new
description: New skill introduced after v0.2.0.
---

# Linear New
EOF
printf "0.3.0\n" > "$SOURCE/VERSION"
git -C "$SOURCE" add .
git -C "$SOURCE" commit --quiet -m "Release 0.3.0"
git -C "$SOURCE" tag v0.3.0

"$SOURCE/scripts/install.sh" \
  --mode consumer \
  --target "$CONSUMER" \
  --source "$SOURCE" \
  --repository "$SOURCE" \
  --version v0.2.0
python3 - "$CONSUMER/.agents/linear-workflow.lock.json" <<'PY'
import json
import sys

with open(sys.argv[1]) as fh:
    lock = json.load(fh)
assert "linear-new" not in lock["adapter"]["skills"]
PY
test ! -e "$CONSUMER/.agents/skills/linear-new/SKILL.md"
test ! -e "$CONSUMER/.claude/skills/linear-new/SKILL.md"

"$SOURCE/scripts/update.sh" \
  --mode consumer \
  --target "$CONSUMER" \
  --source "$SOURCE" \
  --repository "$SOURCE" \
  --version v0.3.0
"$SOURCE/scripts/check.sh" --mode consumer --target "$CONSUMER" --source "$SOURCE"
test -e "$CONSUMER/.agents/skills/linear-new/SKILL.md"
test -e "$CONSUMER/.claude/skills/linear-new/SKILL.md"

rm -rf "$SOURCE/skills/linear-new"
printf "0.4.0\n" > "$SOURCE/VERSION"
git -C "$SOURCE" add .
git -C "$SOURCE" commit --quiet -m "Release 0.4.0"
git -C "$SOURCE" tag v0.4.0

printf "\nmanual edit\n" >> "$CONSUMER/.claude/skills/linear-new/SKILL.md"
if "$SOURCE/scripts/update.sh" \
  --mode consumer \
  --target "$CONSUMER" \
  --source "$SOURCE" \
  --repository "$SOURCE" \
  --version v0.4.0 >"$TMP_DIR/partial-delete.log" 2>&1; then
  echo "Expected modified stale wrapper cleanup to fail before deleting any stale wrappers" >&2
  exit 1
fi
grep -q "refusing to remove modified generated wrapper" "$TMP_DIR/partial-delete.log"
test -e "$CONSUMER/.agents/skills/linear-new/SKILL.md"
test -e "$CONSUMER/.claude/skills/linear-new/SKILL.md"

"$SOURCE/scripts/install.sh" \
  --mode consumer \
  --target "$CONSUMER" \
  --source "$SOURCE" \
  --repository "$SOURCE" \
  --version v0.3.0
"$SOURCE/scripts/update.sh" \
  --mode consumer \
  --target "$CONSUMER" \
  --source "$SOURCE" \
  --repository "$SOURCE" \
  --version v0.4.0
"$SOURCE/scripts/check.sh" --mode consumer --target "$CONSUMER" --source "$SOURCE"
python3 - "$CONSUMER/.agents/linear-workflow.lock.json" <<'PY'
import json
import sys

with open(sys.argv[1]) as fh:
    lock = json.load(fh)
assert "linear-new" not in lock["adapter"]["skills"]
PY
test ! -e "$CONSUMER/.agents/skills/linear-new/SKILL.md"
test ! -e "$CONSUMER/.claude/skills/linear-new/SKILL.md"

mkdir -p "$CONSUMER/.agents/skills/linear-orphan"
cat > "$CONSUMER/.agents/skills/linear-orphan/SKILL.md" <<'EOF'
---
name: linear-orphan
description: Orphaned generated wrapper.
---

<!-- GENERATED by linear-agent-workflow scripts. Mode: consumer. Do not edit directly. -->
EOF
if "$SOURCE/scripts/check.sh" --mode consumer --target "$CONSUMER" --source "$SOURCE" >"$TMP_DIR/orphan.log" 2>&1; then
  echo "Expected orphan generated wrapper check to fail" >&2
  exit 1
fi
grep -q "unexpected generated wrapper" "$TMP_DIR/orphan.log"
rm -rf "$CONSUMER/.agents/skills/linear-orphan"

REMOVED_PATH="$(
  python3 - "$CONSUMER/.agents/linear-workflow.lock.json" <<'PY'
import json
import sys

path = sys.argv[1]
with open(path) as fh:
  lock = json.load(fh)
removed = lock["adapter"]["generatedFiles"].pop()
with open(path, "w") as fh:
  fh.write(json.dumps(lock, indent=2) + "\n")
print(removed["path"])
PY
)"
rm -f "$CONSUMER/$REMOVED_PATH"
if "$SOURCE/scripts/check.sh" --mode consumer --target "$CONSUMER" --source "$SOURCE" >"$TMP_DIR/coverage.log" 2>&1; then
  echo "Expected generated file coverage check to fail" >&2
  exit 1
fi
grep -q "generatedFiles does not match" "$TMP_DIR/coverage.log"

"$SOURCE/scripts/install.sh" \
  --mode consumer \
  --target "$CONSUMER" \
  --source "$SOURCE" \
  --repository "$SOURCE" \
  --version v0.2.0

python3 - "$CONSUMER/.agents/linear-workflow.lock.json" <<'PY'
import json
import sys

path = sys.argv[1]
with open(path) as fh:
    lock = json.load(fh)
del lock["adapter"]["generatorVersion"]
with open(path, "w") as fh:
    fh.write(json.dumps(lock, indent=2) + "\n")
PY
if "$SOURCE/scripts/check.sh" --mode consumer --target "$CONSUMER" --source "$SOURCE" >"$TMP_DIR/generator-version.log" 2>&1; then
  echo "Expected missing generatorVersion check to fail" >&2
  exit 1
fi
grep -q "adapter.generatorVersion" "$TMP_DIR/generator-version.log"

"$SOURCE/scripts/install.sh" \
  --mode consumer \
  --target "$CONSUMER" \
  --source "$SOURCE" \
  --repository "$SOURCE" \
  --version v0.2.0

printf "\nmanual edit\n" >> "$CONSUMER/.agents/skills/linear-check/SKILL.md"
if "$SOURCE/scripts/check.sh" --mode consumer --target "$CONSUMER" --source "$SOURCE" >"$TMP_DIR/drift.log" 2>&1; then
  echo "Expected drift check to fail" >&2
  exit 1
fi
grep -q "DRIFT" "$TMP_DIR/drift.log"

"$SOURCE/scripts/install.sh" \
  --mode consumer \
  --target "$CONSUMER" \
  --source "$SOURCE" \
  --repository "$SOURCE" \
  --version v0.2.0
mkdir -p "$CONSUMER/.agents/skills/linear-check/references"
printf "\nmanual edit\n" >> "$CONSUMER/.agents/skills/linear-check/SKILL.md"
if "$SOURCE/scripts/check.sh" --mode consumer --target "$CONSUMER" --source "$SOURCE" >"$TMP_DIR/copied.log" 2>&1; then
  echo "Expected copied workflow truth and drift check to fail" >&2
  exit 1
fi
grep -q "must not copy workflow truth" "$TMP_DIR/copied.log"
grep -q "hash mismatch" "$TMP_DIR/copied.log"

echo "PASS: fixture smoke covered self install/check, consumer install/update/check, retryable branch updates, pinned commit generation, removed-skill cleanup, orphan detection, coverage, schema, stale, drift, and copied truth detection"
