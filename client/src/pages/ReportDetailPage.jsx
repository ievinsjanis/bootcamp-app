import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './ReportDetailPage.css';

function formatDate(str) {
  if (!str) return '—';
  return new Date(str + 'Z').toLocaleString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ROW_CLASS = {
  passed:  'rdp-row-passed',
  failed:  'rdp-row-failed',
  skipped: 'rdp-row-skipped',
};

export default function ReportDetailPage() {
  const { id } = useParams();
  const [report, setReport]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');

  function fetchReport() {
    setLoading(true);
    setFetchError('');
    fetch(`/api/reports/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setReport(json.data);
        else setFetchError(json.error || 'Failed to load report.');
      })
      .catch(() => setFetchError('Could not reach the server.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchReport(); }, [id]);

  if (loading) return (
    <div className="rdp">
      <div className="skel skel--text" style={{ width: '6rem', marginBottom: 'var(--sp-6)' }} />
      <div className="rdp-header">
        <div className="rdp-title-row">
          <div className="skel skel--num" style={{ width: '22rem' }} />
        </div>
        <div className="rdp-meta" style={{ marginTop: 'var(--sp-3)' }}>
          <div className="skel skel--text" style={{ width: '16rem' }} />
        </div>
      </div>
    </div>
  );

  if (fetchError) return (
    <div className="rdp">
      <Link to="/reports" className="detail-back">← Reports</Link>
      <div className="error-banner--page">
        <p>{fetchError}</p>
        <button className="btn-primary" onClick={fetchReport}>Retry</button>
      </div>
    </div>
  );

  const { passed_count, failed_count, skipped_count, total_count } = report;
  const passRate = total_count > 0 ? Math.round((passed_count / total_count) * 100) : 0;

  return (
    <div className="rdp">
      <Link to="/reports" className="detail-back">← Reports</Link>

      <div className="rdp-header">
        <div className="rdp-title-row">
          <h1 className="detail-title">Report #{report.id} — {report.suite_name}</h1>
        </div>
        <div className="rdp-meta">
          <span>Run <Link to={`/test-runs/${report.run_id}`} className="rdp-run-link">#{report.run_id}</Link></span>
          <span>Run date: {formatDate(report.run_date)}</span>
          <span>Generated: {formatDate(report.generated_at)}</span>
        </div>
      </div>

      <div className="rdp-summary">
        <div className="rdp-pill rdp-pass-pill">
          <span className="rdp-pill-num">{passed_count}</span>
          <span className="rdp-pill-label">Passed</span>
        </div>
        <div className="rdp-pill rdp-fail-pill">
          <span className="rdp-pill-num">{failed_count}</span>
          <span className="rdp-pill-label">Failed</span>
        </div>
        <div className="rdp-pill rdp-skip-pill">
          <span className="rdp-pill-num">{skipped_count}</span>
          <span className="rdp-pill-label">Skipped</span>
        </div>
        <div className="rdp-pill rdp-total-pill">
          <span className="rdp-pill-num">{total_count}</span>
          <span className="rdp-pill-label">Total</span>
        </div>
        <div className="rdp-pill rdp-rate-pill">
          <span className="rdp-pill-num">{passRate}%</span>
          <span className="rdp-pill-label">Pass rate</span>
        </div>
      </div>

      <div className="rdp-progress-bar">
        <div className="rdp-progress-fill" style={{ width: `${passRate}%` }} />
      </div>

      <div className="table-wrap rdp-table-margin">
        <table className="data-table rdp-table">
          <thead>
            <tr>
              <th>Test Case</th>
              <th className="rdp-th-result">Result</th>
              <th className="rdp-th-notes">Notes</th>
              <th className="rdp-th-issue">Issue</th>
            </tr>
          </thead>
          <tbody>
            {report.results.map(r => (
              <tr key={r.id} className={ROW_CLASS[r.result] ?? ''}>
                <td className="rdp-tc-title">{r.test_case_title}</td>
                <td>
                  <span className={`badge badge--${r.result ?? 'not-run'}`}>
                    {r.result ?? 'not run'}
                  </span>
                </td>
                <td className="rdp-notes">{r.notes || <span className="rdp-muted">—</span>}</td>
                <td>
                  {r.github_issue_url
                    ? <a className="rdp-issue-link" href={r.github_issue_url} target="_blank" rel="noreferrer">↗ Issue</a>
                    : <span className="rdp-muted">—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rdp-actions">
        <a
          href={`/api/reports/${report.id}/export/html`}
          className="btn-primary rdp-action-btn"
          download
        >
          ↓ Download HTML
        </a>
        <button
          className="btn-secondary rdp-action-btn"
          onClick={() => window.print()}
        >
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
