#!/usr/bin/env bash
# PostToolUse hook: warns when a JS/TS/React file contains severity words that
# do not match the CLAUDE.md enum: Critical | Major | Minor | Trivial
#
# Flagged words: high, medium, low, blocker, cosmetic
# Two detection patterns:
#   1. Exact quoted value  — 'high', "medium", `low`, etc.
#   2. Severity key context — severity: high  /  severity = "blocker"

set -uo pipefail

input=$(cat)

# Parse tool name and file path from the hook JSON payload
if command -v jq &>/dev/null; then
  tool_name=$(echo "$input" | jq -r '.tool_name // ""')
  file_path=$(echo "$input" | jq -r '.tool_input.file_path // ""')
else
  tool_name=$(python3 -c "
import sys, json
d = json.loads(sys.stdin.read())
print(d.get('tool_name', ''))
" <<< "$input" 2>/dev/null || echo "")
  file_path=$(python3 -c "
import sys, json
d = json.loads(sys.stdin.read())
print(d.get('tool_input', {}).get('file_path', ''))
" <<< "$input" 2>/dev/null || echo "")
fi

# Only for Write and Edit tools
case "$tool_name" in
  Write|Edit) ;;
  *) exit 0 ;;
esac

# Only for JS/TS/React files
case "$file_path" in
  *.js|*.ts|*.jsx|*.tsx) ;;
  *) exit 0 ;;
esac

[[ -f "$file_path" ]] || exit 0

WRONG="high|medium|low|blocker|cosmetic"

# Pattern 1: wrong word as an exact quoted/backtick string literal
# Catches: severity: 'high'  /  { severity: "blocker" }  /  severity: `low`
PAT1="['\"\`]($WRONG)['\"\`]"

# Pattern 2: wrong word as an unquoted value after a severity key
# Catches: severity: high  /  severity = medium
PAT2="severity\s*[=:]\s*($WRONG)\b"

hits=$(grep -inE "($PAT1|$PAT2)" "$file_path" | head -20)

if [[ -n "$hits" ]]; then
  echo ""
  echo "⚠️  Severity enum warning: $file_path"
  echo "   Found severity-like word(s) that don't match the CLAUDE.md enum:"
  while IFS= read -r line; do
    echo "   $line"
  done <<< "$hits"
  echo "   Valid severities: Critical | Major | Minor | Trivial"
  echo ""
fi

exit 0
