#!/bin/bash

# Defer automatic compaction until the orchestrator reaches a safe boundary.
# Pass the orchestrator root as argv[1] or MONO_ORCHESTRATOR_ROOT.

NODE_BIN="${NODE_BIN:-node}"
INPUT="$(cat)"
TRIGGER="auto"
if PARSED_TRIGGER="$(printf '%s' "$INPUT" | "$NODE_BIN" -e '
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  const event = JSON.parse(input);
  process.stdout.write(typeof event.trigger === "string" ? event.trigger : "manual");
});
' 2>/dev/null)"; then
  TRIGGER="$PARSED_TRIGGER"
fi

emit_allow() {
  printf '{}\n'
}

emit_block() {
  reason="$1"
  if MONO_COMPACTION_REASON="$reason" "$NODE_BIN" -e '
process.stdout.write(`${JSON.stringify({ decision: "block", reason: process.env.MONO_COMPACTION_REASON })}\n`);
' 2>/dev/null; then
    return
  fi
  printf '{"decision":"block","reason":"Auto-compaction deferred; the hook could not encode its detailed reason."}\n'
}

if [ "$TRIGGER" != "auto" ]; then
  emit_allow
  exit 0
fi

ORCHESTRATOR_ROOT="${1:-${MONO_ORCHESTRATOR_ROOT:-}}"
if [ -z "$ORCHESTRATOR_ROOT" ]; then
  emit_block "Auto-compaction deferred because the orchestrator root was not provided."
  exit 0
fi

SENTINEL="$ORCHESTRATOR_ROOT/compaction-safe"
COUNTER="$ORCHESTRATOR_ROOT/.compact-block-count"
FRESHNESS_WINDOW_SECONDS="${MONO_COMPACTION_FRESHNESS_SECONDS:-300}"
MAX_DEFERRALS="${MONO_COMPACTION_MAX_DEFERRALS:-3}"

get_mtime() {
  target="$1"
  style="${MONO_COMPACTION_STAT_STYLE:-auto}"
  case "$style" in
    bsd)
      stat -f %m "$target"
      ;;
    gnu)
      stat -c %Y "$target"
      ;;
    auto)
      if value="$(stat -f %m "$target" 2>/dev/null)"; then
        case "$value" in
          ''|*[!0-9]*) ;;
          *) printf '%s\n' "$value"; return 0 ;;
        esac
      fi
      stat -c %Y "$target"
      ;;
    *)
      return 1
      ;;
  esac
}

COUNT="$(cat "$COUNTER" 2>/dev/null || printf '0\n')"
case "$COUNT" in
  ''|*[!0-9]*) COUNT=0 ;;
esac

if [ "$COUNT" -ge "$MAX_DEFERRALS" ]; then
  printf '0\n' > "$COUNTER"
  emit_allow
  exit 0
fi

if [ -f "$SENTINEL" ]; then
  MTIME="$(get_mtime "$SENTINEL" 2>/dev/null || true)"
  case "$MTIME" in
    ''|*[!0-9]*) ;;
    *)
      AGE=$(( $(date +%s) - MTIME ))
      if [ "$AGE" -ge 0 ] && [ "$AGE" -lt "$FRESHNESS_WINDOW_SECONDS" ]; then
        printf '0\n' > "$COUNTER"
        emit_allow
        exit 0
      fi
      ;;
  esac
fi

COUNT=$((COUNT + 1))
printf '%s\n' "$COUNT" > "$COUNTER"
emit_block "Auto-compaction deferred to a safe orchestrator boundary. Bring the ledger current, touch $SENTINEL, then compaction may proceed (deferral $COUNT of $MAX_DEFERRALS; the next attempt after $MAX_DEFERRALS consecutive deferrals is allowed regardless)."
