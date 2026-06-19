const express = require('express');
const db      = require('../db');

const router = express.Router();

// CTE with window functions — requires SQLite ≥ 3.25 (shipped with better-sqlite3 on Node 20)
const FLAKY_SQL = `
  WITH ordered AS (
    SELECT test_case_id, test_case_title, result,
      ROW_NUMBER() OVER (PARTITION BY test_case_id ORDER BY created_at) AS rn
    FROM test_run_results
    WHERE result IN ('passed', 'failed')
  ),
  with_lag AS (
    SELECT test_case_id, test_case_title, result,
      LAG(result) OVER (PARTITION BY test_case_id ORDER BY rn) AS prev_result
    FROM ordered
  ),
  stats AS (
    SELECT test_case_id, test_case_title,
      COUNT(*) AS eligible_runs,
      SUM(CASE WHEN result = 'failed' THEN 1 ELSE 0 END) AS fail_count,
      SUM(CASE WHEN result = 'passed' THEN 1 ELSE 0 END) AS pass_count,
      SUM(CASE WHEN prev_result IS NOT NULL AND result != prev_result THEN 1 ELSE 0 END) AS transitions
    FROM with_lag
    GROUP BY test_case_id, test_case_title
    HAVING eligible_runs >= 3 AND fail_count >= 1 AND pass_count >= 1
  )
  SELECT
    s.test_case_id,
    s.test_case_title,
    s.eligible_runs,
    s.fail_count,
    s.pass_count,
    s.transitions,
    CAST(s.fail_count AS REAL) / s.eligible_runs AS fail_rate,
    (CAST(s.transitions AS REAL) / (s.eligible_runs - 1))
      + (CAST(MIN(s.pass_count, s.fail_count) AS REAL) / s.eligible_runs * 0.5) AS flakiness_score,
    h.hypothesis,
    h.updated_at AS hypothesis_updated_at
  FROM stats s
  LEFT JOIN flake_hypotheses h ON h.test_case_id = s.test_case_id
  ORDER BY flakiness_score DESC, s.transitions DESC, s.eligible_runs DESC
  LIMIT 10
`;

const getRecent = db.prepare(`
  SELECT result, run_id
  FROM test_run_results
  WHERE test_case_id = ? AND result IN ('passed', 'failed')
  ORDER BY created_at DESC
  LIMIT 5
`);

function handleGetFlakyTests(_req, res) {
  try {
    const rows = db.prepare(FLAKY_SQL).all();
    const data = rows.map(r => ({
      ...r,
      recent_pattern: getRecent.all(r.test_case_id).reverse(),
    }));
    res.json({ success: true, data, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleCheckFlake(req, res) {
  const tcId  = parseInt(req.query.test_case_id);
  const runId = parseInt(req.query.run_id);

  if (!tcId || !runId || tcId < 1 || runId < 1) {
    return res.json({ success: true, data: { is_newly_flaky: false }, error: null });
  }

  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) AS eligible_runs,
        SUM(CASE WHEN result = 'failed' THEN 1 ELSE 0 END) AS fail_count,
        SUM(CASE WHEN result = 'passed' THEN 1 ELSE 0 END) AS pass_count,
        MAX(test_case_title) AS test_case_title
      FROM test_run_results
      WHERE test_case_id = ? AND result IN ('passed', 'failed')
    `).get(tcId);

    if (!stats || stats.eligible_runs < 3 || stats.fail_count === 0 || stats.pass_count === 0) {
      return res.json({ success: true, data: { is_newly_flaky: false }, error: null });
    }

    const existing = db.prepare(
      'SELECT last_alert_run_id, hypothesis FROM flake_hypotheses WHERE test_case_id = ?'
    ).get(tcId);

    if (existing && existing.last_alert_run_id === runId) {
      return res.json({ success: true, data: { is_newly_flaky: false }, error: null });
    }

    // Newly flaky — update last_alert_run_id atomically
    db.prepare(`
      INSERT INTO flake_hypotheses (test_case_id, last_alert_run_id, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(test_case_id) DO UPDATE SET
        last_alert_run_id = excluded.last_alert_run_id,
        updated_at        = excluded.updated_at
    `).run(tcId, runId);

    const recent = getRecent.all(tcId).reverse();

    return res.json({
      success: true,
      data: {
        is_newly_flaky:   true,
        test_case_title:  stats.test_case_title,
        eligible_runs:    stats.eligible_runs,
        fail_count:       stats.fail_count,
        pass_count:       stats.pass_count,
        recent_pattern:   recent,
        hypothesis:       existing?.hypothesis || null,
      },
      error: null,
    });
  } catch (err) {
    return res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handlePostHypothesis(req, res) {
  const tcId = parseInt(req.params.testCaseId);
  if (!tcId || tcId < 1) {
    return res.status(400).json({ success: false, data: null, error: 'Invalid testCaseId' });
  }

  const { hypothesis, flakiness_score, eligible_runs, fail_count, transitions } = req.body;
  if (!hypothesis || typeof hypothesis !== 'string' || !hypothesis.trim()) {
    return res.status(400).json({ success: false, data: null, error: 'hypothesis is required' });
  }

  try {
    db.prepare(`
      INSERT INTO flake_hypotheses
        (test_case_id, hypothesis, flakiness_score, eligible_runs, fail_count, transitions, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(test_case_id) DO UPDATE SET
        hypothesis      = excluded.hypothesis,
        flakiness_score = excluded.flakiness_score,
        eligible_runs   = excluded.eligible_runs,
        fail_count      = excluded.fail_count,
        transitions     = excluded.transitions,
        updated_at      = excluded.updated_at
    `).run(tcId, hypothesis.trim(), flakiness_score ?? null, eligible_runs ?? null, fail_count ?? null, transitions ?? null);

    const row = db.prepare('SELECT * FROM flake_hypotheses WHERE test_case_id = ?').get(tcId);
    res.json({ success: true, data: row, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

router.get('/check',         handleCheckFlake);
router.get('/',              handleGetFlakyTests);
router.post('/:testCaseId/hypothesis', handlePostHypothesis);

module.exports = router;
