const express = require('express');
const router  = express.Router();
const db      = require('../db');

function handleGetMetrics(req, res) {
  try {
    // Total test cases
    const { total: totalCases } = db.prepare(
      'SELECT COUNT(*) as total FROM test_cases'
    ).get();

    // Pass rate across all completed runs
    const passRow = db.prepare(`
      SELECT
        COALESCE(SUM(pass_count), 0)                              as total_passed,
        COALESCE(SUM(pass_count + fail_count + skip_count), 0)    as total_run
      FROM test_runs_v2
      WHERE status = 'completed'
    `).get();
    const passRate = passRow.total_run > 0
      ? Math.round((passRow.total_passed / passRow.total_run) * 1000) / 10
      : null;

    // Open + reopened bugs
    const { count: openBugs } = db.prepare(
      "SELECT COUNT(*) as count FROM bugs WHERE status IN ('open','reopened')"
    ).get();

    // Average run duration in minutes (completed runs only)
    const durRow = db.prepare(`
      SELECT AVG((julianday(end_time) - julianday(start_time)) * 1440) as avg_mins
      FROM test_runs_v2
      WHERE status = 'completed'
        AND start_time IS NOT NULL
        AND end_time   IS NOT NULL
    `).get();
    const avgDurationMins = durRow.avg_mins != null
      ? Math.round(durRow.avg_mins * 10) / 10
      : null;

    // 10 most recent test runs
    const recentRuns = db.prepare(`
      SELECT id, suite_name, status, pass_count, fail_count, skip_count,
             start_time, end_time, created_at
      FROM test_runs_v2
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    // 10 most recent bug activity items
    const recentActivity = db.prepare(`
      SELECT ba.id, ba.bug_id, ba.action,
             ba.old_value, ba.new_value, ba.message, ba.created_at,
             b.title as bug_title
      FROM bug_activity ba
      JOIN bugs b ON b.id = ba.bug_id
      ORDER BY ba.created_at DESC
      LIMIT 10
    `).all();

    res.json({
      success: true,
      data: {
        metrics: {
          total_test_cases:    totalCases,
          pass_rate:           passRate,
          open_bugs:           openBugs,
          avg_run_duration_mins: avgDurationMins,
        },
        recent_runs:     recentRuns,
        recent_activity: recentActivity,
      },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

router.get('/metrics', handleGetMetrics);
module.exports = router;
