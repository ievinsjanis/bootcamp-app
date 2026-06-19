import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './TestRunsPage.css';

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

  function fetchRuns() {
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
  }

  useEffect(() => { fetchRuns(); }, []);

  return (
    <div className="trp">
      <div className="trp-header">
        <h1>Test Runs</h1>
      </div>

      {fetchError && (
        <div className="error-banner--page">
          <p>{fetchError}</p>
          <button className="btn-primary" onClick={fetchRuns}>Retry</button>
        </div>
      )}

      {!fetchError && (
        <div className="table-wrap">
          <table className="data-table trp-table">
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
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td><div className="skel skel--short" /></td>
                  <td><div className="skel skel--text" /></td>
                  <td><div className="skel skel--short" /></td>
                  <td><div className="skel skel--short" /></td>
                  <td><div className="skel skel--short" /></td>
                  <td><div className="skel skel--short" /></td>
                  <td><div className="skel skel--short" /></td>
                  <td><div className="skel skel--short" /></td>
                </tr>
              ))}
              {!loading && runs.length === 0 && (
                <tr><td colSpan={8} className="trp-empty">No test runs yet. Start one from a suite.</td></tr>
              )}
              {!loading && runs.map(run => (
                <tr key={run.id}>
                  <td className="trp-id">
                    <Link to={`/test-runs/${run.id}`}>#{run.id}</Link>
                  </td>
                  <td className="trp-suite">
                    <Link to={`/test-runs/${run.id}`}>{run.suite_name}</Link>
                  </td>
                  <td>
                    <span className={`badge badge--${run.status}`}>{run.status}</span>
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
      )}

      <p className="trp-count-line">{runs.length} run{runs.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
