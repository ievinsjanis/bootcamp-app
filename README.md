# QA Command Center

QA management app — test cases, bugs, test suites, test runs, and reports.

Built with Express + React + Vite. SQLite for storage.

## Local development

```bash
npm install          # installs root, server, and client deps via postinstall
npm run dev          # starts Express on :3001 and Vite on :3000
```

---

## DEPLOY

**Platform: [Render](https://render.com)** — free tier, no credit card required.

Render runs Express as a persistent Node.js process, which is required for SQLite to work correctly. The free tier spins down after 15 minutes of inactivity; the first request after sleep takes roughly 30 seconds to respond.

Demo data (test cases, bugs, a test suite, a test run, and a report) is seeded automatically on first start. Data persists for the lifetime of the deployment; it resets to seed data on each new deploy.

### Prerequisites

**1. Push the repo to GitHub** (Render deploys from a Git remote):

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

# Windows / Linux — download the binary for your OS from:
# https://github.com/render-oss/cli/releases
```

### Deploy (single command)

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

`render login` opens your browser for sign-in on first run. After you authorise, the service is created and the build starts automatically (~2 minutes). The service URL (`https://qa-command-center-xxxx.onrender.com`) appears in the CLI output or in the Render dashboard under your new service.

### Optional: link GitHub issues

To enable GitHub issue URLs in test-run reports, add a personal access token in the Render dashboard:

Dashboard → **qa-command-center** → **Environment** → add `GITHUB_TOKEN` → Save Changes → Redeploy.

The token needs the `repo` (read) scope.

### Redeploy

Push to `main`. Render redeploys automatically.