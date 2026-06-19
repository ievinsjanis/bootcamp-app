import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ReportsPage.css';

function formatDate(str) {
  if (!str) return '—';
  return new Date(str + 'Z').toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function passRate(row) {
  if (!row.total_count) return '—';
  return `${Math.round((row.passed_count / row.total_count) * 100)}%`;
}

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  function fetchReports() {
    setLoading(true);
    setFetchError('');
    fetch('/api/reports')
      .then(r => r.json())
      .then(json => {
        if (json.success) setReports(json.data);
        else setFetchError(json.error || 'Failed to load reports.');
      })
      .catch(() => setFetchError('Could not reach the server.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchReports(); }, []);

  return (
    <div className="rp">
      <div className="rp-header">
        <h1>Reports</h1>
      </div>

      {fetchError && (
        <div className="error-banner--page">
          <p>{fetchError}</p>
          <button className="btn-primary" onClick={fetchReports}>Retry</button>
        </div>
      )}

      {!fetchError && !loading && reports.length === 0 && (
        <div className="empty-state">
          <p className="empty-state__heading">No reports yet.</p>
          <p className="empty-state__body">
            Open a completed{' '}
            <Link to="/test-runs">test run</Link> and click{' '}
            <strong>Generate report</strong> to create your first report.
          </p>
        </div>
      )}

      {!fetchError && (loading || reports.length > 0) && (
        <div className="table-wrap">
          <table className="data-table rp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Suite</th>
                <th>Run</th>
                <th>Pass rate</th>
                <th>Pass / Fail / Skip</th>
                <th>Generated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td><div className="skel skel--short" /></td>
                  <td><div className="skel skel--text" /></td>
                  <td><div className="skel skel--short" /></td>
                  <td><div className="skel skel--short" /></td>
                  <td><div className="skel skel--short" /></td>
                  <td><div className="skel skel--short" /></td>
                  <td />
                </tr>
              ))}
              {!loading && reports.map(r => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/reports/${r.id}`} className="rp-link">#{r.id}</Link>
                  </td>
                  <td className="rp-suite">{r.suite_name}</td>
                  <td>
                    <Link to={`/test-runs/${r.run_id}`} className="rp-link">
                      Run #{r.run_id}
                    </Link>
                  </td>
                  <td className="rp-rate">{passRate(r)}</td>
                  <td className="rp-counts">
                    <span className="rp-pass">{r.passed_count}</span>
                    {' / '}
                    <span className="rp-fail">{r.failed_count}</span>
                    {' / '}
                    <span className="rp-skip">{r.skipped_count}</span>
                  </td>
                  <td className="rp-when">{formatDate(r.generated_at)}</td>
                  <td className="rp-actions">
                    <Link to={`/reports/${r.id}`} className="rp-view-btn">View</Link>
                    <a
                      href={`/api/reports/${r.id}/export/html`}
                      className="rp-dl-btn"
                      download
                    >
                      ↓ HTML
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
