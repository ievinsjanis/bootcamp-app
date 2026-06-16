const express = require('express');
const router  = express.Router();
const db      = require('../db');

const GITHUB_OWNER = 'ievinsjanis';
const GITHUB_REPO  = 'bootcamp-app';

function getRunWithResults(runId) {
  const run = db.prepare('SELECT * FROM test_runs_v2 WHERE id = ?').get(runId);
  if (!run) return null;
  const results = db.prepare(
    'SELECT * FROM test_run_results WHERE run_id = ? ORDER BY id ASC'
  ).all(runId);
  return { ...run, results };
}

async function createGithubIssue(title, body) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
      {
        method:  'POST',
        headers: {
          Authorization:        `Bearer ${token}`,
          'Content-Type':       'application/json',
          Accept:               'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ title, body }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.html_url ?? null;
  } catch {
    return null;
  }
}

function handleListRuns(req, res) {
  try {
    const rows = db.prepare(
      'SELECT * FROM test_runs_v2 ORDER BY created_at DESC'
    ).all();
    res.json({ success: true, data: rows, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleGetRun(req, res) {
  try {
    const run = getRunWithResults(req.params.id);
    if (!run) return res.status(404).json({ success: false, data: null, error: 'Run not found' });
    res.json({ success: true, data: run, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleCreateRun(req, res) {
  try {
    const { suite_id, created_by = 'anonymous' } = req.body;
    if (!suite_id) {
      return res.status(400).json({ success: false, data: null, error: 'suite_id is required.' });
    }
    const suite = db.prepare('SELECT * FROM suites WHERE id = ?').get(suite_id);
    if (!suite) {
      return res.status(404).json({ success: false, data: null, error: 'Suite not found.' });
    }
    const cases = db.prepare(`
      SELECT tc.id, tc.title
      FROM suite_cases sc
      JOIN test_cases tc ON tc.id = sc.test_case_id
      WHERE sc.suite_id = ?
      ORDER BY sc.sort_order ASC
    `).all(suite_id);
    if (cases.length === 0) {
      return res.status(400).json({ success: false, data: null, error: 'Suite has no test cases.' });
    }

    const runResult = db.prepare(`
      INSERT INTO test_runs_v2 (suite_id, suite_name, status, created_by)
      VALUES (?, ?, 'running', ?)
    `).run(suite_id, suite.name, created_by);

    const runId = runResult.lastInsertRowid;
    const ins   = db.prepare(
      'INSERT INTO test_run_results (run_id, test_case_id, test_case_title) VALUES (?, ?, ?)'
    );
    db.transaction(cs => { cs.forEach(c => ins.run(runId, c.id, c.title)); })(cases);

    res.status(201).json({ success: true, data: getRunWithResults(runId), error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

async function handlePatchResult(req, res) {
  try {
    const { id: runId, resultId } = req.params;

    const run = db.prepare('SELECT * FROM test_runs_v2 WHERE id = ?').get(runId);
    if (!run) return res.status(404).json({ success: false, data: null, error: 'Run not found' });

    const existing = db.prepare(
      'SELECT * FROM test_run_results WHERE id = ? AND run_id = ?'
    ).get(resultId, runId);
    if (!existing) return res.status(404).json({ success: false, data: null, error: 'Result not found' });

    const { result, notes, duration_ms } = req.body;
    const VALID = ['passed', 'failed', 'skipped'];
    if (result !== undefined && !VALID.includes(result)) {
      return res.status(400).json({
        success: false, data: null,
        error: `result must be one of: ${VALID.join(', ')}.`,
      });
    }

    const newResult   = result      !== undefined ? result          : existing.result;
    const newNotes    = notes       !== undefined ? (notes || null) : existing.notes;
    const newDuration = duration_ms !== undefined ? duration_ms     : existing.duration_ms;

    // GitHub issue: open when first marking as failed
    let githubIssueUrl = existing.github_issue_url;
    if (newResult === 'failed' && existing.result !== 'failed') {
      const issueBody = [
        `## Test Failure`,
        ``,
        `**Test case:** ${existing.test_case_title}`,
        `**Run:** #${runId}`,
        newNotes ? `**Notes:** ${newNotes}` : null,
        ``,
        `*Filed automatically by the test run executor.*`,
      ].filter(l => l !== null).join('\n');
      githubIssueUrl = await createGithubIssue(existing.test_case_title, issueBody);
    } else if (newResult !== 'failed') {
      githubIssueUrl = null;
    }

    // failed_at: set on first fail, cleared if result changes away
    let newFailedAt = existing.failed_at;
    if (newResult === 'failed' && !existing.failed_at) {
      newFailedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
    } else if (newResult !== 'failed') {
      newFailedAt = null;
    }

    db.prepare(`
      UPDATE test_run_results
      SET result = ?, notes = ?, duration_ms = ?, failed_at = ?,
          github_issue_url = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newResult, newNotes, newDuration, newFailedAt, githubIssueUrl, resultId);

    // Recompute run counts and status
    const all      = db.prepare('SELECT result FROM test_run_results WHERE run_id = ?').all(runId);
    const passCount = all.filter(r => r.result === 'passed').length;
    const failCount = all.filter(r => r.result === 'failed').length;
    const skipCount = all.filter(r => r.result === 'skipped').length;
    const done      = passCount + failCount + skipCount;
    const completed = done === all.length;
    const endTime   = completed
      ? (run.end_time ?? new Date().toISOString().replace('T', ' ').slice(0, 19))
      : null;

    db.prepare(`
      UPDATE test_runs_v2
      SET pass_count = ?, fail_count = ?, skip_count = ?, status = ?, end_time = ?
      WHERE id = ?
    `).run(passCount, failCount, skipCount, completed ? 'completed' : 'running', endTime, runId);

    res.json({ success: true, data: getRunWithResults(runId), error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

router.get('/',                        handleListRuns);
router.get('/:id',                     handleGetRun);
router.post('/',                       handleCreateRun);
router.patch('/:id/results/:resultId', handlePatchResult);

module.exports = router;
