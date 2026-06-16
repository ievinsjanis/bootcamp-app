import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './DashboardPage.css';

const REFRESH_MS = 30_000;

function formatDate(str) {
  if (!str) return '—';
  return new Date(str + 'Z').toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(mins) {
  if (mins == null) return null;
  if (mins < 1)    return '<1 min';
  if (mins < 60)   return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatActivity(item) {
  const ref = `Bug #${item.bug_id}`;
  if (item.action === 'status_change') {
    if (!item.old_value) return `${ref} reported as ${item.new_value}`;
    return `${ref} marked ${item.new_value}`;
  }
  if (item.action === 'comment') {
    return item.message ? `${ref} — ${item.message}` : `${ref} — comment added`;
  }
  return `${ref} updated`;
}

const RUN_STATUS_STYLE = {
  running:   { background: '#dbeafe', color: '#1e40af' },
  completed: { background: '#dcfce7', color: '#166534' },
  aborted:   { background: '#fee2e2', color: '#991b1b' },
};

// ── Skeleton ──────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="db-metric-card db-skeleton-card">
      <div className="db-skel db-skel-num" />
      <div className="db-skel db-skel-label" />
    </div>
  );
}

function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}><div className="db-skel db-skel-text" /></td>
      ))}
    </tr>
  );
}

// ── Section empty state ────────────────────────────────────

function SectionEmpty({ message, cta }) {
  return (
    <div className="db-empty-section">
      <p className="db-empty-section-msg">{message}</p>
      {cta && <p className="db-empty-section-cta">{cta}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch('/api/dashboard/metrics');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setError('');
      } else {
        setError(json.error || 'Failed to load dashboard.');
      }
    } catch {
      setError('Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(timer);
  }, [fetchData]);

  // ── Loading skeleton
  if (loading) {
    return (
      <div className="db">
        <div className="db-header">
          <h1 className="db-title">Dashboard</h1>
        </div>
        <div className="db-metrics-grid">
          {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="db-section">
          <h2 className="db-section-title">Recent Test Runs</h2>
          <div className="db-table-wrap">
            <table className="db-table">
              <tbody>{[0, 1, 2].map(i => <SkeletonRow key={i} cols={5} />)}</tbody>
            </table>
          </div>
        </div>
        <div className="db-section">
          <h2 className="db-section-title">Recent Activity</h2>
          <ul className="db-activity-list">
            {[0, 1, 2].map(i => (
              <li key={i} className="db-activity-item">
                <span className="db-activity-dot" />
                <div className="db-skel db-skel-activity" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // ── Error state
  if (error) {
    return (
      <div className="db">
        <div className="db-header">
          <h1 className="db-title">Dashboard</h1>
        </div>
        <div className="db-error">
          <p className="db-error-msg">{error}</p>
          <button className="btn-primary" onClick={fetchData}>Retry</button>
        </div>
      </div>
    );
  }

  const { metrics, recent_runs, recent_activity } = data;
  const noTestCases = metrics.total_test_cases === 0;
  const noRuns      = recent_runs.length === 0;
  const noActivity  = recent_activity.length === 0;
  const isBlank     = noTestCases && noRuns;

  // ── Whole-page empty: brand-new app, nothing at all
  if (isBlank) {
    return (
      <div className="db">
        <div className="db-header">
          <h1 className="db-title">Dashboard</h1>
        </div>
        <div className="db-empty-page">
          <p className="db-empty-page-heading">Nothing here yet.</p>
          <p className="db-empty-page-body">
            Start by creating{' '}
            <Link to="/test-cases">test cases</Link>, group them into a{' '}
            <Link to="/test-suites">test suite</Link>, then run the suite to
            see results here.
          </p>
          <p className="db-empty-page-body">
            You can also <Link to="/bugs">file bugs</Link> as you find them —
            they'll show up in the activity feed.
          </p>
          <div className="db-empty-page-actions">
            <Link to="/test-cases" className="btn-primary">Create a test case</Link>
            <Link to="/bugs" className="btn-secondary">File a bug</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Metric cards — sub text and dim state vary by whether data is available
  const passRateDim  = metrics.pass_rate == null;
  const durationDim  = metrics.avg_run_duration_mins == null;
  const durationFmt  = formatDuration(metrics.avg_run_duration_mins);

  const metricCards = [
    {
      label:  'Test Cases',
      value:  metrics.total_test_cases,
      sub:    null,
      link:   '/test-cases',
      dim:    false,
    },
    {
      label:  'Pass Rate',
      value:  passRateDim ? '—' : `${metrics.pass_rate}%`,
      sub:    passRateDim
        ? 'Run tests to calculate this'
        : 'across all completed runs',
      link:   '/test-runs',
      dim:    passRateDim,
    },
    {
      label:  'Open Bugs',
      value:  metrics.open_bugs,
      sub:    metrics.open_bugs === 0 ? 'none open' : 'need attention',
      link:   '/bugs',
      urgent: metrics.open_bugs > 0,
      dim:    false,
    },
    {
      label:  'Avg Run Duration',
      value:  durationFmt ?? '—',
      sub:    durationDim
        ? 'No completed runs yet'
        : 'per completed run',
      link:   '/test-runs',
      dim:    durationDim,
    },
  ];

  return (
    <div className="db">
      <div className="db-header">
        <h1 className="db-title">Dashboard</h1>
        <span className="db-refresh-note">auto-refreshes every 30 s</span>
      </div>

      {/* ── Metric cards */}
      <div className="db-metrics-grid">
        {metricCards.map(card => (
          <Link
            key={card.label}
            to={card.link}
            className={[
              'db-metric-card',
              card.urgent ? 'db-metric-urgent' : '',
              card.dim    ? 'db-metric-dim'    : '',
            ].filter(Boolean).join(' ')}
          >
            <span className="db-metric-value">{card.value}</span>
            <span className="db-metric-label">{card.label}</span>
            {card.sub && <span className="db-metric-sub">{card.sub}</span>}
          </Link>
        ))}
      </div>

      {/* ── Recent test runs */}
      <div className="db-section">
        <div className="db-section-header">
          <h2 className="db-section-title">Recent Test Runs</h2>
          <Link to="/test-runs" className="db-section-link">View all →</Link>
        </div>
        {noRuns ? (
          <SectionEmpty
            message="No test runs yet."
            cta={
              <>
                Go to <Link to="/test-suites">Test Suites</Link> and click{' '}
                <strong>▶ New Run</strong> to start your first run.
              </>
            }
          />
        ) : (
          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Suite</th>
                  <th>Status</th>
                  <th>Pass / Fail</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {recent_runs.map(run => (
                  <tr key={run.id}>
                    <td>
                      <Link to={`/test-runs/${run.id}`} className="db-run-link">
                        #{run.id}
                      </Link>
                    </td>
                    <td>{run.suite_name}</td>
                    <td>
                      <span className="db-badge" style={RUN_STATUS_STYLE[run.status]}>
                        {run.status}
                      </span>
                    </td>
                    <td className="db-passfail">
                      <span className="db-pass">{run.pass_count}</span>
                      {' / '}
                      <span className="db-fail">{run.fail_count}</span>
                    </td>
                    <td className="db-when">{formatDate(run.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Recent activity */}
      <div className="db-section">
        <div className="db-section-header">
          <h2 className="db-section-title">Recent Activity</h2>
          <Link to="/bugs" className="db-section-link">View bugs →</Link>
        </div>
        {noActivity ? (
          <SectionEmpty
            message="No activity yet."
            cta={
              <>
                <Link to="/bugs">File a bug</Link> or update a test case to
                see activity here.
              </>
            }
          />
        ) : (
          <ul className="db-activity-list">
            {recent_activity.map(item => (
              <li key={item.id} className="db-activity-item">
                <span className="db-activity-dot" />
                <div className="db-activity-body">
                  <span className="db-activity-text">{formatActivity(item)}</span>
                  <span className="db-activity-time">{formatDate(item.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
