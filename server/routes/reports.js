const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ── Helpers ───────────────────────────────────────────────

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(str) {
  if (!str) return '—';
  try {
    return new Date(str.includes('T') ? str : str + 'Z').toLocaleString('en-GB', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return str; }
}

function sevClass(sev) {
  if (!sev) return 'sev-trivial';
  return 'sev-' + sev.toLowerCase();
}

function generateHtml(report) {
  const passRate = report.total_count > 0
    ? Math.round((report.passed_count / report.total_count) * 100)
    : 0;

  const resultRows = report.results.map((r, i) => {
    const cls      = r.result ?? 'pending';
    const label    = r.result ?? 'not run';
    const title    = escapeHtml(r.test_case_title);
    const sev      = r.severity ? escapeHtml(r.severity) : null;
    const expected = r.expected_result ? escapeHtml(r.expected_result) : null;
    const notes    = r.notes ? escapeHtml(r.notes) : null;
    const issueHtml = r.github_issue_url
      ? ` <a class="issue-link" href="${escapeHtml(r.github_issue_url)}" target="_blank">↗ Issue</a>`
      : '';
    return `          <tr class="row-${cls}">
            <td class="col-num">${i + 1}</td>
            <td class="col-title">${title}${issueHtml}</td>
            <td class="col-status"><span class="badge b-${cls}">${label}</span></td>
            <td class="col-sev">${sev ? `<span class="badge ${sevClass(sev)}">${sev}</span>` : '<span class="muted">—</span>'}</td>
            <td class="col-expected">${expected ?? '<span class="muted">—</span>'}</td>
            <td class="col-notes">${notes ?? '<span class="muted">—</span>'}</td>
          </tr>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report — ${escapeHtml(report.suite_name)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 14px;
      color: #111827;
      background: #f3f4f6;
      line-height: 1.5;
    }
    .page { max-width: 980px; margin: 0 auto; padding: 2.5rem 1.5rem; }

    /* ── Report header card */
    .rh {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 1.75rem 2rem;
      margin-bottom: 1.1rem;
    }
    .rh-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .rh-project {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #9ca3af;
      margin-bottom: 0.4rem;
    }
    .rh-title {
      font-size: 1.45rem;
      font-weight: 800;
      color: #111827;
      line-height: 1.2;
      margin-bottom: 0.3rem;
    }
    .rh-suite {
      font-size: 0.95rem;
      color: #4b5563;
      font-weight: 500;
    }
    .rh-meta {
      text-align: right;
      font-size: 0.79rem;
      color: #6b7280;
      line-height: 1.95;
      flex-shrink: 0;
    }
    .rh-meta strong { color: #111827; }
    .rh-divider { height: 1px; background: #f3f4f6; margin-top: 1.25rem; }

    /* ── Summary cards */
    .summary {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0.8rem;
      margin-bottom: 1rem;
    }
    .card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      border-top-width: 3px;
      padding: 0.9rem 1rem;
      text-align: center;
    }
    .card-num {
      font-size: 1.9rem;
      font-weight: 800;
      line-height: 1;
      color: #111827;
    }
    .card-label {
      font-size: 0.67rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #9ca3af;
      margin-top: 0.3rem;
    }
    .card-total { border-top-color: #e5e7eb; }
    .card-pass  { border-top-color: #22c55e; }
    .card-pass  .card-num { color: #166534; }
    .card-fail  { border-top-color: #ef4444; }
    .card-fail  .card-num { color: #991b1b; }
    .card-skip  { border-top-color: #94a3b8; }
    .card-skip  .card-num { color: #475569; }
    .card-rate  { border-top-color: #3b82f6; }
    .card-rate  .card-num { color: #1d4ed8; }

    /* ── Progress bar */
    .prog-track {
      background: #e5e7eb;
      border-radius: 4px;
      height: 6px;
      margin-bottom: 1.5rem;
      overflow: hidden;
    }
    .prog-fill { height: 100%; background: #22c55e; border-radius: 4px; min-width: 0; }

    /* ── Section label */
    .section-label {
      font-size: 0.73rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b7280;
      margin-bottom: 0.55rem;
    }

    /* ── Results table */
    .table-wrap {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 2rem;
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.845rem; }
    thead { background: #f9fafb; }
    th {
      padding: 0.6rem 0.9rem;
      text-align: left;
      font-weight: 600;
      font-size: 0.75rem;
      color: #374151;
      border-bottom: 1px solid #e5e7eb;
      letter-spacing: 0.01em;
      white-space: nowrap;
    }
    td {
      padding: 0.65rem 0.9rem;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
      color: #374151;
      line-height: 1.45;
    }
    tr:last-child td { border-bottom: none; }
    .col-num { width: 36px; color: #9ca3af; font-size: 0.75rem; text-align: center; vertical-align: middle; }
    .col-title { font-weight: 500; color: #111827; }
    .col-status { width: 88px; vertical-align: middle; }
    .col-sev { width: 82px; vertical-align: middle; }
    .col-expected { width: 22%; font-size: 0.8rem; color: #4b5563; }
    .col-notes { width: 22%; font-size: 0.8rem; color: #374151; }

    /* Row tints */
    .row-passed  td { background: #f0fdf4; }
    .row-failed  td { background: #fff8f8; }
    .row-skipped td { background: #f8fafc; }
    .row-pending td { background: #fafafa; }

    /* ── Status badges */
    .badge {
      display: inline-block;
      padding: 0.18rem 0.5rem;
      border-radius: 999px;
      font-size: 0.67rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }
    .b-passed  { background: #dcfce7; color: #166534; }
    .b-failed  { background: #fee2e2; color: #991b1b; }
    .b-skipped { background: #f1f5f9; color: #475569; }
    .b-draft   { background: #f3f4f6; color: #6b7280; }
    .b-ready   { background: #eff6ff; color: #1d4ed8; }
    .b-pending { background: #f3f4f6; color: #9ca3af; }

    /* ── Severity badges */
    .sev-critical { background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }
    .sev-major    { background: #fff7ed; color: #9a3412; border: 1px solid #fdba74; }
    .sev-minor    { background: #fffbeb; color: #92400e; border: 1px solid #fcd34d; }
    .sev-trivial  { background: #f9fafb; color: #6b7280; border: 1px solid #e5e7eb; }

    a.issue-link { color: #1d4ed8; text-decoration: none; font-size: 0.78rem; white-space: nowrap; margin-left: 0.4rem; }
    a.issue-link:hover { text-decoration: underline; }
    .muted { color: #d1d5db; }

    /* ── Footer */
    .report-footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 1.1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .rf-left  { font-size: 0.78rem; color: #6b7280; }
    .rf-right { font-size: 0.73rem; color: #9ca3af; text-align: right; }
    .rf-brand { font-weight: 700; color: #374151; }

    /* ── Print */
    @media print {
      @page { margin: 1.4cm 1.5cm; size: A4 portrait; }
      body { background: white; font-size: 11px; }
      .page { max-width: none; padding: 0; }
      .rh { border: none; border-radius: 0; padding: 0 0 0.9rem 0; border-bottom: 2px solid #e5e7eb; margin-bottom: 0.9rem; }
      .table-wrap { border-radius: 0; border-left: none; border-right: none; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
      .rh-title { font-size: 1.1rem; }
      .summary { page-break-after: avoid; gap: 0.5rem; }
      .card { padding: 0.65rem 0.75rem; }
      .card-num { font-size: 1.5rem; }
      .row-passed  td { background: #f0fdf4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .row-failed  td { background: #fff8f8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .row-skipped td { background: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge, .card, .prog-fill {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .prog-fill { background: #22c55e !important; }
      .b-passed  { background: #dcfce7 !important; }
      .b-failed  { background: #fee2e2 !important; }
      .b-skipped { background: #f1f5f9 !important; }
      .sev-critical { background: #fef2f2 !important; }
      .sev-major    { background: #fff7ed !important; }
      .sev-minor    { background: #fffbeb !important; }
    }
  </style>
</head>
<body>
  <div class="page">

    <div class="rh">
      <div class="rh-top">
        <div>
          <div class="rh-project">QA Command Center</div>
          <h1 class="rh-title">Test Execution Report</h1>
          <div class="rh-suite">${escapeHtml(report.suite_name)}</div>
        </div>
        <div class="rh-meta">
          <div>Run &nbsp;<strong>#${report.run_id}</strong></div>
          <div>Run date &nbsp;<strong>${fmtDate(report.run_date)}</strong></div>
          <div>Generated &nbsp;<strong>${fmtDate(report.generated_at)}</strong></div>
        </div>
      </div>
      <div class="rh-divider"></div>
    </div>

    <div class="summary">
      <div class="card card-total">
        <div class="card-num">${report.total_count}</div>
        <div class="card-label">Total</div>
      </div>
      <div class="card card-pass">
        <div class="card-num">${report.passed_count}</div>
        <div class="card-label">Passed</div>
      </div>
      <div class="card card-fail">
        <div class="card-num">${report.failed_count}</div>
        <div class="card-label">Failed</div>
      </div>
      <div class="card card-skip">
        <div class="card-num">${report.skipped_count}</div>
        <div class="card-label">Skipped</div>
      </div>
      <div class="card card-rate">
        <div class="card-num">${passRate}%</div>
        <div class="card-label">Pass rate</div>
      </div>
    </div>

    <div class="prog-track">
      <div class="prog-fill" style="width: ${passRate}%"></div>
    </div>

    <p class="section-label">Test Results &mdash; ${report.total_count} case${report.total_count === 1 ? '' : 's'}</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="col-num">#</th>
            <th>Test Case</th>
            <th class="col-status">Status</th>
            <th class="col-sev">Severity</th>
            <th class="col-expected">Expected Result</th>
            <th class="col-notes">Notes / Actual</th>
          </tr>
        </thead>
        <tbody>
${resultRows}
        </tbody>
      </table>
    </div>

    <div class="report-footer">
      <div class="rf-left">Generated on <strong>${escapeHtml(fmtDate(report.generated_at))}</strong></div>
      <div class="rf-right"><span class="rf-brand">QA Command Center</span> &middot; Generated by the QA App reporting tool</div>
    </div>

  </div>
</body>
</html>`;
}

// ── Route handlers ────────────────────────────────────────

function handleListReports(req, res) {
  try {
    const rows = db.prepare(`
      SELECT id, run_id, suite_name, run_date,
             total_count, passed_count, failed_count, skipped_count,
             generated_at
      FROM reports
      ORDER BY generated_at DESC
    `).all();
    res.json({ success: true, data: rows, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleGetReport(req, res) {
  try {
    const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, data: null, error: 'Report not found.' });
    res.json({
      success: true,
      data: { ...row, results: JSON.parse(row.results) },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleCreateReport(req, res) {
  try {
    const { run_id } = req.body;
    if (!run_id) {
      return res.status(400).json({ success: false, data: null, error: 'run_id is required.' });
    }
    const run = db.prepare('SELECT * FROM test_runs_v2 WHERE id = ?').get(run_id);
    if (!run) {
      return res.status(404).json({ success: false, data: null, error: 'Test run not found.' });
    }
    const results = db.prepare(`
      SELECT trr.*, tc.severity, tc.expected_result
      FROM test_run_results trr
      LEFT JOIN test_cases tc ON tc.id = trr.test_case_id
      WHERE trr.run_id = ?
      ORDER BY trr.id ASC
    `).all(run_id);

    const total   = results.length;
    const passed  = results.filter(r => r.result === 'passed').length;
    const failed  = results.filter(r => r.result === 'failed').length;
    const skipped = results.filter(r => r.result === 'skipped').length;

    const info = db.prepare(`
      INSERT INTO reports
        (run_id, suite_name, run_date, total_count, passed_count, failed_count, skipped_count, results)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(run_id, run.suite_name, run.start_time, total, passed, failed, skipped, JSON.stringify(results));

    const created = db.prepare('SELECT * FROM reports WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({
      success: true,
      data: { ...created, results: JSON.parse(created.results) },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleExportHtml(req, res) {
  try {
    const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, data: null, error: 'Report not found.' });
    const report = { ...row, results: JSON.parse(row.results) };
    const slug   = report.suite_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="report-${report.id}-${slug}.html"`);
    res.send(generateHtml(report));
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

router.get('/',                    handleListReports);
router.post('/',                   handleCreateReport);
router.get('/:id',                 handleGetReport);
router.get('/:id/export/html',     handleExportHtml);

module.exports = router;
