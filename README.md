# QA Command Center

QA management app with a built-in Claude Code toolkit. Manage test cases, bugs, test suites, test runs, and reports — and use the plugin to generate tests, review features, summarize transcripts, and detect flaky tests.

Built with Express + React + Vite. SQLite for storage.

---

## Local development

```bash
npm install          # installs root, server, and client deps via postinstall
npm run dev          # starts Express on :3001 and Vite on :3000
```

---

## What this plugin does

The plugin solves the routine, error-prone parts of a QA workflow that Claude Code can do faster and more consistently than typing from scratch.

**Structured test case generation.** The `test-generator` skill and `test-writer` agent apply ISTQB boundary-value analysis and equivalence partitioning to any feature description. They produce test cases in the exact field format required by this project — Title (with `[FeatureArea]` prefix), Preconditions, Steps, Expected result, Severity, Status — covering happy path, boundary values, negative cases, and edge cases in one pass.

**Feature review from a tester's perspective.** The `qa-review` skill and `qa-reviewer` agent work through nine categories: missing validation, missing error handling, user messages, confirmation dialogs, accessibility, edge cases, API response shape, severity/status consistency, and CLAUDE.md drift. Findings are grouped by Critical / Major / Minor / Trivial with a specific fix and test-coverage suggestion for each.

**Transcript and meeting-note summarization.** The `transcript-summarizer` skill and agent turn unstructured call notes, interview recordings, or meeting transcripts into a structured summary with key points, decisions, action items, open questions, and risks — without adding facts that were not in the source.

**Project standards enforcement through hooks.** Four hooks run automatically on every Claude Code action:
- `check-response-shape.sh` — verifies every edited file uses the `{ success, data, error }` API envelope.
- `check-severity-enum.sh` — rejects any severity value that does not match `Critical / Major / Minor / Trivial` exactly.
- `check-todo-ticket.sh` — reminds you to reference a ticket number on every prompt submission.
- `check-flake-alert.sh` — detects newly-flaky test cases after a result is saved and posts a Discord alert with the pattern, counts, and a link to the leaderboard.

**Flaky-test analysis.** The `flake-analyzer` agent fetches the live flakiness leaderboard, writes an Observed / Hypothesis entry per test using only signals present in the data, stores each via the API, and posts a summary to Discord. Invoke it when you need a first-pass root-cause explanation for unstable tests.

**Slash commands for common QA tasks.** Three commands guide Claude Code through creating a structured bug report file (`/bug-report`), a manual test case file (`/new-test`), and a pre-validation ticket checklist (`/ticket-checklist`).

---

## Install

### Prerequisites

- [Claude Code](https://claude.ai/code) installed and authenticated
- Node.js 18 or later
- npm 9 or later

### 1. Clone the repository

```bash
git clone https://github.com/ievinsjanis/bootcamp-app.git
cd bootcamp-app
```

### 2. Install app dependencies

```bash
npm install
```

### 3. Load the plugin in Claude Code

Open Claude Code from the repository root. The `.claude/` directory is automatically picked up. Commands, skills, and agents are available immediately — no separate install step.

To verify:

```bash
# Commands — type / in Claude Code and look for:
/new-test
/bug-report
/ticket-checklist

# Agents — available via the Agent tool or by description match:
test-writer, qa-reviewer, transcript-summarizer, flake-analyzer

# Skills — auto-triggered by matching phrases, or explicitly by name:
test-generator, qa-review, transcript-summarizer
```

### 4. Wire up the hooks

Copy the hooks configuration into your project settings:

```bash
# The hooks fragment is at .claude/hooks/hooks-settings.json
# Merge the "hooks" key into .claude/settings.json
# The existing settings.json already contains this configuration.
# For a fresh installation, copy hooks-settings.json content into settings.json.
```

Verify all hook files are executable:

```bash
ls -la .claude/hooks/*.sh
# All four files should show -rwxr-xr-x permissions.
# If not:
chmod +x .claude/hooks/*.sh
```

### 5. Configure optional integrations

The following integrations require local configuration that is **not included** in the plugin. Do not commit tokens to the repository.

**Discord alerts (flake detection hook + flake-analyzer agent)**

Create a `.env` file at the repository root (already in `.gitignore`):

```bash
DISCORD_BOT_TOKEN=your-discord-bot-token-here
DISCORD_CHANNEL_ID=your-channel-id-here
```

The hook reads these at runtime. Without them, the hook exits cleanly with a skip message and never blocks result saving.

**GitHub issue linking**

Add a `GITHUB_TOKEN` environment variable (personal access token with `repo` read scope). For local development, add it to `.env`. For Render deployments, add it in the Render dashboard under Environment.

**Discord MCP server (flake-analyzer agent)**

The agent uses `mcp__discord__discord_send_message`. To enable it, ensure your `.mcp.json` contains:

```json
{
  "mcpServers": {
    "discord": { "command": "npx", "args": ["-y", "discord-mcp"] }
  }
}
```

Then authenticate the Discord MCP server in Claude Code. The `.mcp.json` in this repository already contains this entry.

**GitHub MCP server**

`.mcp.json` also contains the GitHub MCP entry, which requires a `GITHUB_TOKEN` environment variable or the GitHub Copilot OAuth flow. See the Claude Code MCP documentation for setup details.

---

## Examples

Two worked examples show exactly what prompts were typed and what happened:

- [`examples/test-generation-workflow.md`](examples/test-generation-workflow.md) — Generating a full set of manual test cases for a signup form using ISTQB boundary-value analysis. Shows the exact prompt, what the `test-writer` agent did step by step, and an excerpt of the generated output in project format.

- [`examples/qa-review-workflow.md`](examples/qa-review-workflow.md) — Running a QA review on the test suite feature. Shows the exact prompt, how the `qa-reviewer` agent worked through all nine review categories, and the actual findings by severity with suggested fixes and test coverage.

---

## What's inside

### Commands

| Path | Purpose | When to use |
|---|---|---|
| `.claude/commands/new-test.md` | Guided creation of a manual test case file at `tests/manual/` | When you want to capture a test case through a question-and-answer flow rather than writing it from scratch |
| `.claude/commands/bug-report.md` | Guided creation of a structured bug report file at `tests/bugs/` | When you have rough observations from a testing session and want them filed consistently |
| `.claude/commands/ticket-checklist.md` | Guided creation of a pre-validation checklist at `tests/checklists/` | Before you start testing a ticket — captures acceptance criteria, risk areas, and a standard validation checklist |

### Skills

| Path | Purpose | When to use |
|---|---|---|
| `.claude/skills/test-generator/SKILL.md` | ISTQB-compliant test case generation with boundary-value analysis and equivalence partitioning | Automatically triggered by "write test cases for", "generate tests", "what should I test" — or invoked by the `test-writer` agent |
| `.claude/skills/qa-review/SKILL.md` | Nine-category feature review covering validation, error handling, accessibility, API shape, and CLAUDE.md drift | Automatically triggered by "QA review", "what could break", "review from a tester's perspective" — or invoked by the `qa-reviewer` agent |
| `.claude/skills/transcript-summarizer/SKILL.md` | Structured summarization of transcripts and meeting notes with decisions, action items, and open questions | Automatically triggered by "summarize this transcript", "clean up these meeting notes" — or invoked by the `transcript-summarizer` agent |

### Agents

| Path | Purpose | When to use |
|---|---|---|
| `.claude/agents/test-writer.md` | Reads `CLAUDE.md` and `test-generator/SKILL.md`, then produces a complete test set | When you want a full test set saved to a file, or need the agent to run as a subagent in a larger workflow |
| `.claude/agents/qa-reviewer.md` | Reads `CLAUDE.md` and `qa-review/SKILL.md`, then reviews a feature or set of files | When you want an independent QA perspective before merging a feature, or as part of a review pipeline |
| `.claude/agents/transcript-summarizer.md` | Reads a source file or pasted text, then writes a structured summary | When you have call notes, an interview recording transcript, or sprint-planning notes to turn into something usable |
| `.claude/agents/flake-analyzer.md` | Fetches the live flakiness leaderboard, writes Observed / Hypothesis entries, stores via API, posts to Discord | When flaky tests appear in the leaderboard and you want a first-pass explanation without manually reading the data |

### Hooks

| Path | Purpose | When it fires |
|---|---|---|
| `.claude/hooks/check-response-shape.sh` | Verifies the `{ success, data, error }` API envelope is present in any file Claude writes or edits | PostToolUse on `Write` or `Edit` |
| `.claude/hooks/check-severity-enum.sh` | Rejects severity values that do not match `Critical / Major / Minor / Trivial` exactly | PostToolUse on `Write` or `Edit` |
| `.claude/hooks/check-flake-alert.sh` | Calls `/api/flaky-tests/check` after a test result is PATCHed; posts a Discord alert if the test is newly flaky | PostToolUse on `Bash` when the command PATCHes `/api/test-runs/*/results/*` |
| `.claude/hooks/check-todo-ticket.sh` | Reminds you to reference a ticket number when submitting a prompt | UserPromptSubmit |
| `.claude/hooks/hooks-settings.json` | Portable settings fragment — merge into `.claude/settings.json` to install all hooks | Used at install time |

### How the pieces work together

- **`test-writer` agent → `test-generator` skill**: The agent reads `CLAUDE.md` and then delegates the generation logic entirely to the skill. You get consistent, project-compliant test cases whether you invoke the agent directly or the skill auto-triggers from a phrase.
- **`qa-reviewer` agent → `qa-review` skill**: The agent reads `CLAUDE.md` and then follows the nine-category checklist from the skill. The skill can also auto-trigger without the agent for quick inline reviews.
- **`transcript-summarizer` agent → `transcript-summarizer` skill**: Same delegation pattern. The agent handles file I/O (reading a file path, optionally saving output); the skill enforces the output structure.
- **`flake-analyzer` agent → Discord MCP**: The agent fetches live data from the Express API, stores hypotheses back via API, and posts a summary through the Discord MCP server — no manual copy-paste required.
- **Hooks → project standards**: The shape and enum hooks run silently on every file write, catching drift immediately. The flake hook wires the CI result path into Discord alerting without any application code change. The ticket hook creates a lightweight process checkpoint.

---

## Deploy

**Platform: [Render](https://render.com)** — free tier, no credit card required.

Render runs Express as a persistent Node.js process, which is required for SQLite to work correctly. The free tier spins down after 15 minutes of inactivity; the first request after sleep takes roughly 30 seconds.

Demo data (test cases, bugs, a test suite, a test run, and a report) is seeded automatically on first start. Data persists for the lifetime of the deployment; it resets to seed data on each new deploy.

### Prerequisites

**1. Push the repo to GitHub:**

```bash
# If you haven't created a remote yet:
gh repo create bootcamp-app --public --source=. --remote=origin --push

# If you already have a remote:
git push -u origin main
```

**2. Install the Render CLI:**

```bash
# macOS
brew install render

# Windows / Linux — download from https://github.com/render-oss/cli/releases
```

### Deploy

```bash
render login && render services create \
  --name qa-command-center \
  --type web_service \
  --repo "$(git remote get-url origin)" \
  --runtime node \
  --plan free \
  --region oregon \
  --branch main \
  --build-command "npm install && npm run build" \
  --start-command "npm start"
```

### Optional: link GitHub issues

Add `GITHUB_TOKEN` in the Render dashboard → **qa-command-center** → **Environment** → Save Changes → Redeploy. Needs the `repo` (read) scope.

### Redeploy

Push to `main`. Render redeploys automatically.
