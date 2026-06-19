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

function fmtWeekLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function handleGetTrends(req, res) {
  try {
    // ── 1. Pass rate trend — last 10 completed runs, chronological
    const rawRuns = db.prepare(`
      SELECT id, suite_name, start_time,
             pass_count,
             (pass_count + fail_count + skip_count) AS total
      FROM   test_runs_v2
      WHERE  status = 'completed'
      ORDER  BY start_time DESC
      LIMIT  10
    `).all().reverse();

    const passRateTrend = rawRuns.map(r => ({
      run_id:    r.id,
      label:     r.start_time ? fmtWeekLabel(r.start_time.slice(0, 10)) : `#${r.id}`,
      pass_rate: r.total > 0 ? Math.round((r.pass_count / r.total) * 100) : 0,
    }));

    // ── 2. Bugs opened vs closed — last 8 weeks (Monday-aligned, UTC throughout)
    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dowUtc   = (todayUtc.getUTCDay() + 6) % 7; // 0 = Mon
    const thisMondayUtc = new Date(todayUtc);
    thisMondayUtc.setUTCDate(todayUtc.getUTCDate() - dowUtc);

    const weekStarts = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(thisMondayUtc);
      d.setUTCDate(thisMondayUtc.getUTCDate() - i * 7);
      weekStarts.push(d.toISOString().slice(0, 10));
    }
    const cutoff = weekStarts[0];

    const mondayExpr = `date(created_at, '-' || ((cast(strftime('%w', created_at) AS integer) + 6) % 7) || ' days')`;

    const openedRows = db.prepare(`
      SELECT ${mondayExpr} AS week_start, COUNT(*) AS count
      FROM   bugs
      WHERE  created_at >= ?
      GROUP  BY week_start
    `).all(cutoff);

    const closedRows = db.prepare(`
      SELECT ${mondayExpr} AS week_start, COUNT(*) AS count
      FROM   bug_activity
      WHERE  action    = 'status_change'
        AND  new_value IN ('resolved', 'closed')
        AND  created_at >= ?
      GROUP  BY week_start
    `).all(cutoff);

    const openedMap = Object.fromEntries(openedRows.map(r => [r.week_start, r.count]));
    const closedMap = Object.fromEntries(closedRows.map(r => [r.week_start, r.count]));

    const bugsByWeek = weekStarts.map(monday => ({
      week:   monday,
      label:  fmtWeekLabel(monday),
      opened: openedMap[monday] || 0,
      closed: closedMap[monday] || 0,
    }));

    // ── 3. Test coverage by status
    const coverageByStatus = db.prepare(`
      SELECT status, COUNT(*) AS count
      FROM   test_cases
      GROUP  BY status
      ORDER  BY status ASC
    `).all();

    res.json({
      success: true,
      data: {
        pass_rate_trend:    passRateTrend,
        bugs_by_week:       bugsByWeek,
        coverage_by_status: coverageByStatus,
      },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

router.get('/metrics', handleGetMetrics);
router.get('/trends',  handleGetTrends);
module.exports = router;
