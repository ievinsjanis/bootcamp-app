#!/usr/bin/env bash
# UserPromptSubmit hook: blocks prompts that mention TODO without a ticket reference.
#
# Allowed references: QA-123, BUG-45, ISSUE-9, #123
# (any WORD-digits pattern or #digits)
#
# Exit 0  — allow the prompt
# Exit 2  — block the prompt and show the warning

set -uo pipefail

input=$(cat)

# Extract prompt text from the hook JSON payload
if command -v jq &>/dev/null; then
  prompt=$(echo "$input" | jq -r '.prompt // ""')
else
  prompt=$(python3 -c "
import sys, json
d = json.loads(sys.stdin.read())
print(d.get('prompt', ''))
" <<< "$input" 2>/dev/null || echo "")
fi

# No TODO — nothing to check
echo "$prompt" | grep -qiE '\bTODO\b' || exit 0

# TODO present — require a ticket/reference number
# Accepts: WORD-digits (QA-123, BUG-45, ISSUE-9) or #digits (#123)
if echo "$prompt" | grep -qE '([A-Za-z]+-[0-9]+|#[0-9]+)'; then
  exit 0
fi

# TODO without a ticket — block
echo ""
echo "⚠️  TODO mentioned without a ticket/reference number."
echo "   Add a ticket ID before continuing, for example:"
echo "     QA-123  BUG-45  ISSUE-9  #123"
echo ""
exit 2
