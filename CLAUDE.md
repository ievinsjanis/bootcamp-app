# bootcamp-app

## Stack
Express (Node.js) server on port 3001, React + Vite frontend on port 3000, proxied via Vite dev server.

## Severity levels
- **Critical** — authentication, payments, data loss, or core feature completely broken.
- **Major** — important feature broken but a workaround exists.
- **Minor** — non-core feature broken or behaviour is confusing but low impact.
- **Trivial** — cosmetic issue, typo, or negligible impact.

## Test case fields
| Field | Notes |
|---|---|
| Title | Short, clear description of what is being tested. Must start with the feature area in square brackets, e.g. [Login], [Checkout], [Profile] |
| Preconditions | What must be true before the test starts (omit if none) |
| Steps | Numbered list of exact actions |
| Expected result | What should happen |
| Severity | Critical / Major / Minor / Trivial |
| Status | draft / ready / passed / failed / skipped |

## Bug report fields
| Field | Notes |
|---|---|
| Title | Short description of what is broken |
| Steps to reproduce | Numbered list of exact actions |
| Expected result | What should have happened |
| Actual result | What actually happened |
| Severity | Critical / Major / Minor / Trivial |
| Status | open / in-progress / resolved / closed / reopened |

## API response shape
Every endpoint returns the same envelope:
```json
{ "success": true, "data": <any>, "error": null }
{ "success": false, "data": null, "error": "message" }
```

## File naming
- **Files and folders** — `kebab-case` (e.g. `user-profile.js`, `tests/manual/`)
- **React components** — `PascalCase` (e.g. `UserProfile.jsx`)
- **API route handlers** — `handleVerbNoun` (e.g. `handleGetUser`, `handleCreateOrder`)

## Voice
Write test cases and bug reports in clear, direct English. Say exactly what happens and what should happen. No buzzwords, no filler, no passive constructions where active ones work. If a step can be cut, cut it.
