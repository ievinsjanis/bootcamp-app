#!/usr/bin/env bash
# PostToolUse hook: warns when a res.json() call in server/routes/ does not
# include the { success, data, error } envelope required by CLAUDE.md.

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

# Only care about Write and Edit tools
case "$tool_name" in
  Write|Edit) ;;
  *) exit 0 ;;
esac

# Only care about files inside server/routes/
[[ "$file_path" == */server/routes/* ]] || exit 0
[[ -f "$file_path" ]]                   || exit 0

# For each res.json( call, check the next 6 lines for the word 'success'.
# Six lines covers the typical multi-line envelope:
#   res.json({        <- matched line
#     success: true,
#     data: ...,
#     error: null
#   });
violations=()
while IFS=: read -r lineno _; do
  end=$((lineno + 6))
  context=$(sed -n "${lineno},${end}p" "$file_path")
  if ! grep -q "success" <<< "$context"; then
    snippet=$(sed -n "${lineno}p" "$file_path" | sed 's/^[[:space:]]*//')
    violations+=("  Line ${lineno}: ${snippet}")
  fi
done < <(grep -n "res\.json(\s*{" "$file_path")

if [[ ${#violations[@]} -gt 0 ]]; then
  echo ""
  echo "⚠️  Response envelope warning: ${file_path}"
  echo "   The following res.json() call(s) may be missing the { success, data, error } shape:"
  for v in "${violations[@]}"; do
    echo "$v"
  done
  echo "   Required shape (CLAUDE.md):"
  echo "     { success: true,  data: <any>,  error: null }"
  echo "     { success: false, data: null,   error: \"message\" }"
  echo ""
fi

exit 0
