import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './TestRunsPage.css';

const STATUS_STYLES = {
  running:   { background: '#dbeafe', color: '#1e40af' },
  completed: { background: '#dcfce7', color: '#166534' },
  aborted:   { background: '#fee2e2', color: '#991b1b' },
};

function formatDate(str) {
  if (!str) return '—';
  return new Date(str + 'Z').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function duration(start, end) {
  if (!start || !end) return '—';
  const ms = new Date(end + 'Z') - new Date(start + 'Z');
  if (ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function TestRunsPage() {
  const [runs, setRuns]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    setLoading(true);
    setFetchError('');
    fetch('/api/test-runs')
      .then(r => r.json())
      .then(json => {
        if (json.success) setRuns(json.data);
        else setFetchError(json.error || 'Failed to load runs.');
      })
      .catch(() => setFetchError('Failed to load runs — check your connection and refresh.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="trp">
      <div className="trp-header">
        <h1>Test Runs</h1>
      </div>

      <div className="trp-table-wrap">
        <table className="trp-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Suite</th>
              <th>Status</th>
              <th className="trp-th-count">Pass</th>
              <th className="trp-th-count">Fail</th>
              <th className="trp-th-count">Skip</th>
              <th>Duration</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="trp-empty">Loading…</td></tr>
            )}
            {!loading && fetchError && (
              <tr><td colSpan={8} className="trp-empty trp-error">{fetchError}</td></tr>
            )}
            {!loading && !fetchError && runs.length === 0 && (
              <tr><td colSpan={8} className="trp-empty">No test runs yet. Start one from a suite.</td></tr>
            )}
            {!loading && !fetchError && runs.map(run => (
              <tr key={run.id}>
                <td className="trp-id">
                  <Link to={`/test-runs/${run.id}`}>#{run.id}</Link>
                </td>
                <td className="trp-suite">
                  <Link to={`/test-runs/${run.id}`}>{run.suite_name}</Link>
                </td>
                <td>
                  <span className="badge" style={STATUS_STYLES[run.status]}>{run.status}</span>
                </td>
                <td className="trp-count trp-pass">{run.pass_count}</td>
                <td className="trp-count trp-fail">{run.fail_count}</td>
                <td className="trp-count trp-skip">{run.skip_count}</td>
                <td className="trp-dur">{duration(run.start_time, run.end_time)}</td>
                <td className="trp-date">{formatDate(run.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="trp-count-line">{runs.length} run{runs.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
