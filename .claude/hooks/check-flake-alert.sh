#!/usr/bin/env bash
# PostToolUse hook — fires after every Bash call.
# If the call wrote a test result, checks for new flakes and posts a Discord alert.
# Always exits 0 — analysis failure must never block saving a result.

set -euo pipefail

# ── 1. Parse stdin ─────────────────────────────────────────
INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -re '.tool_name' 2>/dev/null) || exit 0
[[ "$TOOL_NAME" == "Bash" ]] || exit 0

COMMAND=$(echo "$INPUT" | jq -re '.tool_input.command' 2>/dev/null) || exit 0

# ── 2. Filter: only PATCH /api/test-runs/.../results/... ───
if ! echo "$COMMAND" | grep -qE "/api/test-runs/[0-9]+/results/[0-9]+"; then
  exit 0
fi
if ! echo "$COMMAND" | grep -qi "PATCH\|--request.*PATCH\|-X.*PATCH"; then
  exit 0
fi

# ── 3. Check the response was successful ───────────────────
STDOUT=$(echo "$INPUT" | jq -re '.tool_response.stdout' 2>/dev/null) || exit 0

SUCCESS=$(echo "$STDOUT" | jq -re '.success' 2>/dev/null) || exit 0
[[ "$SUCCESS" == "true" ]] || exit 0

# ── 4. Extract result fields ───────────────────────────────
# PATCH /api/test-runs/:runId/results/:resultId returns the full run object.
# run_id is at .data.id; the specific result is inside .data.results[].
RUN_ID=$(echo "$STDOUT" | jq -re '.data.id' 2>/dev/null) || exit 0

# Pull resultId from the end of the URL path
RESULT_ID=$(echo "$COMMAND" | grep -oE '/results/[0-9]+' | grep -oE '[0-9]+$') || exit 0
[[ "$RESULT_ID" =~ ^[0-9]+$ ]] || exit 0

TC_ID=$(echo "$STDOUT"  | jq -re ".data.results[] | select(.id == ($RESULT_ID|tonumber)) | .test_case_id" 2>/dev/null) || exit 0
RESULT=$(echo "$STDOUT" | jq -re ".data.results[] | select(.id == ($RESULT_ID|tonumber)) | .result"       2>/dev/null) || exit 0

[[ "$RESULT" == "skipped" ]] && exit 0
[[ "$RESULT" == "null"    ]] && exit 0

[[ "$TC_ID"  =~ ^[0-9]+$ ]] || exit 0
[[ "$RUN_ID" =~ ^[0-9]+$ ]] || exit 0

echo "FLAKE CHECK: test_case_id=${TC_ID}, run_id=${RUN_ID}"

# ── 5. Call the check endpoint ─────────────────────────────
CHECK=$(curl -s --max-time 5 \
  "http://localhost:3001/api/flaky-tests/check?test_case_id=${TC_ID}&run_id=${RUN_ID}" \
  2>/dev/null) || { echo "FLAKE CHECK: server unreachable"; exit 0; }

IS_NEWLY=$(echo "$CHECK" | jq -re '.data.is_newly_flaky' 2>/dev/null) || exit 0

if [[ "$IS_NEWLY" != "true" ]]; then
  EXISTING_ALERT=$(echo "$CHECK" | jq -re '.data' 2>/dev/null)
  echo "FLAKE STATUS: is_newly_flaky=false"
  exit 0
fi

echo "FLAKE STATUS: is_newly_flaky=true"

# ── 6. Build Discord message ───────────────────────────────
TC_TITLE=$(echo "$CHECK"  | jq -re '.data.test_case_title' 2>/dev/null)  || TC_TITLE="Unknown test"
PASS_CNT=$(echo "$CHECK"  | jq -re '.data.pass_count'      2>/dev/null)  || PASS_CNT="?"
FAIL_CNT=$(echo "$CHECK"  | jq -re '.data.fail_count'      2>/dev/null)  || FAIL_CNT="?"
ELIG=$(echo "$CHECK"      | jq -re '.data.eligible_runs'   2>/dev/null)  || ELIG="?"
HYPOTHESIS=$(echo "$CHECK"| jq -re '.data.hypothesis'      2>/dev/null)  || HYPOTHESIS=""

# Build recent pattern string
PATTERN_RAW=$(echo "$CHECK" | jq -r '.data.recent_pattern[]?.result' 2>/dev/null) || PATTERN_RAW=""
PATTERN_STR=""
while IFS= read -r r; do
  [[ -z "$r" ]] && continue
  if [[ "$r" == "passed" ]]; then
    PATTERN_STR="${PATTERN_STR}🟢P "
  else
    PATTERN_STR="${PATTERN_STR}🔴F "
  fi
done <<< "$PATTERN_RAW"
PATTERN_STR="${PATTERN_STR% }"

# Compute transitions from run stats for the score line
TRANSITIONS=$(echo "$CHECK" | jq -re '.data.transitions' 2>/dev/null) || TRANSITIONS="?"

# Truncate hypothesis to 200 chars
if [[ -n "$HYPOTHESIS" && "$HYPOTHESIS" != "null" ]]; then
  HYPO_LINE="${HYPOTHESIS:0:200}"
  [[ ${#HYPOTHESIS} -gt 200 ]] && HYPO_LINE="${HYPO_LINE}…"
  HYPO_BLOCK=$'\n'"Hypothesis: ${HYPO_LINE}"
else
  HYPO_BLOCK=$'\n'"No hypothesis yet — run 'analyze flaky tests' in Claude Code"
fi

# Production vs local URL
if [[ -n "${RENDER:-}" ]]; then
  BASE_URL="https://qa-command-center.onrender.com"
else
  BASE_URL="http://localhost:3000"
fi

MESSAGE="⚠️ **New flaky test detected**

**${TC_TITLE}**
Recent pattern: ${PATTERN_STR:-"(no pattern yet)"} (last 5 eligible runs)
Passes: ${PASS_CNT} · Fails: ${FAIL_CNT} · Total: ${ELIG}${HYPO_BLOCK}

🔗 ${BASE_URL}/flaky-tests"

# ── 7. Load env vars from .env if not already set ─────────
if [[ -z "${DISCORD_BOT_TOKEN:-}" || -z "${DISCORD_CHANNEL_ID:-}" ]]; then
  # Walk up from hook location to find .env
  ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../.env"
  if [[ -f "$ENV_FILE" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      [[ -z "$line" || "$line" =~ ^# ]] && continue
      key="${line%%=*}"
      val="${line#*=}"
      [[ -z "${!key:-}" ]] && export "$key"="$val"
    done < "$ENV_FILE"
  fi
fi

if [[ -z "${DISCORD_BOT_TOKEN:-}" || -z "${DISCORD_CHANNEL_ID:-}" ]]; then
  echo "DISCORD: skipped — DISCORD_BOT_TOKEN or DISCORD_CHANNEL_ID not set"
  exit 0
fi

# ── 8. POST to Discord REST API ────────────────────────────
PAYLOAD=$(jq -nc --arg content "$MESSAGE" '{"content":$content}')

HTTP_STATUS=$(curl -s -o /tmp/discord_resp.json -w "%{http_code}" \
  --max-time 10 \
  -X POST "https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages" \
  -H "Authorization: ${DISCORD_BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" 2>/dev/null) || { echo "DISCORD: curl failed"; exit 0; }

if [[ "$HTTP_STATUS" == "200" ]]; then
  echo "DISCORD: sent to channel ${DISCORD_CHANNEL_ID} (HTTP 200)"
else
  echo "DISCORD: unexpected HTTP ${HTTP_STATUS}" >&2
  cat /tmp/discord_resp.json >&2 2>/dev/null || true
fi

exit 0
