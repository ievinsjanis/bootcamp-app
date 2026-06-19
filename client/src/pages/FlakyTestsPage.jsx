import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import './FlakyTestsPage.css';

function formatDate(str) {
  if (!str) return '—';
  return new Date(str + 'Z').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function avg(arr, key) {
  if (!arr.length) return 0;
  return arr.reduce((s, t) => s + t[key], 0) / arr.length;
}

function featurePrefix(title) {
  const m = title.match(/^\[([^\]]+)\]/);
  return m ? m[1] : null;
}

function insightNote(tests) {
  if (!tests.length) return null;

  const prefixes = tests.map(t => featurePrefix(t.test_case_title)).filter(Boolean);
  if (prefixes.length) {
    const counts = {};
    for (const p of prefixes) counts[p] = (counts[p] || 0) + 1;
    const [top, cnt] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (cnt / tests.length >= 0.6) {
      return `${cnt} of the top flaky tests are in the [${top}] area. Shared state or environment setup in that feature is the most likely common cause.`;
    }
  }

  const avgFail = avg(tests, 'fail_rate');
  if (avgFail > 0.65) {
    return 'Most flaky tests lean toward failing. This may indicate a recently broken dependency rather than intermittent instability.';
  }
  if (avgFail >= 0.40 && avgFail <= 0.60) {
    return 'The top tests alternate near 50/50, which is consistent with timing sensitivity, test ordering, or shared mutable state.';
  }
  return 'Prioritise tests with the highest transition count — they are the most unpredictable and most in need of isolation.';
}

function ScoreMeter({ score }) {
  const pct       = Math.min((score / 1.5) * 100, 100);
  const fillClass = score > 0.9
    ? 'ft-score-bar-fill--high'
    : score >= 0.5
    ? 'ft-score-bar-fill--mid'
    : 'ft-score-bar-fill--low';

  return (
    <div className="ft-score-wrap">
      <div className="ft-score-num-row">
        <span className="ft-score-num">{score.toFixed(3)}</span>
        <span className="ft-score-unit">/ 1.5</span>
      </div>
      <div
        className="ft-score-bar-track"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={1.5}
        aria-label={`Flakiness score ${score.toFixed(3)} out of 1.5`}
      >
        <div
          className={`ft-score-bar-fill ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PatternPills({ pattern }) {
  return (
    <div className="ft-pills" aria-label="Recent result pattern">
      {pattern.map((r, i) => (
        <span
          key={i}
          className={`ft-pill ft-pill--${r.result}`}
          title={`Run #${r.run_id}: ${r.result}`}
        >
          {r.result === 'passed' ? 'P' : 'F'}
        </span>
      ))}
    </div>
  );
}

function HypothesisCell({ hypothesis, updatedAt, expanded, onToggle }) {
  if (!hypothesis) {
    return (
      <span
        className="ft-no-hyp"
        title="Run 'analyze flaky tests' in Claude Code to generate a hypothesis"
      >
        No hypothesis yet
      </span>
    );
  }

  const observedLine = hypothesis.split('Hypothesis:')[0].replace(/^Observed:\s*/i, '').trim();
  const hypothesisLine = hypothesis.split('Hypothesis:')[1]?.trim() || '';
  const summary = observedLine.slice(0, 60) + (observedLine.length > 60 ? '…' : '');

  return (
    <details open={expanded} onToggle={onToggle} className="ft-hyp-details">
      <summary className="ft-hyp-summary">{summary}</summary>
      <div className="ft-hyp-body">
        {observedLine && <p className="ft-hyp-observed">{observedLine}</p>}
        {hypothesisLine && <p className="ft-hyp-inference">{hypothesisLine}</p>}
        {updatedAt && <p className="ft-hyp-date">Updated {formatDate(updatedAt)}</p>}
      </div>
    </details>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[20, 200, 80, 100, 110, 140].map((w, i) => (
        <td key={i}><div className="skel skel--text" style={{ width: w }} /></td>
      ))}
    </tr>
  );
}

export default function FlakyTestsPage() {
  const [tests,      setTests]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [expanded,   setExpanded]   = useState({});
  const [copied,     setCopied]     = useState(false);
  const copyTimer = useRef(null);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res  = await fetch('/api/flaky-tests');
      const json = await res.json();
      if (json.success) {
        setTests(json.data);
      } else {
        setFetchError(json.error || 'Failed to load flaky tests.');
      }
    } catch {
      setFetchError('Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  function handleToggle(id, e) {
    setExpanded(prev => ({ ...prev, [id]: e.target.open }));
  }

  function handleCopyPrompt() {
    navigator.clipboard.writeText('analyze flaky tests').then(() => {
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="ft">
        <div className="ft-header">
          <h1 className="ft-title">Flaky Tests</h1>
        </div>
        <div className="ft-metrics-grid">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="ft-metric-card ft-skeleton-card">
              <div className="skel skel--num" />
              <div className="skel skel--label" />
            </div>
          ))}
        </div>
        <div className="ft-section">
          <div className="ft-table-wrap">
            <table className="ft-table">
              <tbody>{[0, 1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}</tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="ft">
        <div className="ft-header">
          <h1 className="ft-title">Flaky Tests</h1>
        </div>
        <div className="error-banner--page">
          <p>{fetchError}</p>
          <button className="btn-primary" onClick={fetchTests}>Retry</button>
        </div>
      </div>
    );
  }

  if (!tests.length) {
    return (
      <div className="ft">
        <div className="ft-header">
          <h1 className="ft-title">Flaky Tests</h1>
        </div>
        <div className="empty-state">
          <p className="empty-state__heading">No flaky tests found.</p>
          <p className="empty-state__body">
            All test cases with 3 or more eligible runs have consistent results.
            Run more test cycles to continue tracking reliability.
          </p>
        </div>
      </div>
    );
  }

  const avgScore = avg(tests, 'flakiness_score');
  const mostTransitions = tests.reduce((a, b) => a.transitions >= b.transitions ? a : b);
  const lastAnalysis = tests.reduce((latest, t) => {
    if (!t.hypothesis_updated_at) return latest;
    return !latest || t.hypothesis_updated_at > latest ? t.hypothesis_updated_at : latest;
  }, null);
  const note = insightNote(tests);

  const metricCards = [
    { label: 'Flaky tests',       value: tests.length },
    { label: 'Avg score',         value: avgScore.toFixed(2) },
    { label: 'Most transitions',  value: mostTransitions.transitions, sub: featurePrefix(mostTransitions.test_case_title) || mostTransitions.test_case_title.slice(0, 30) },
    { label: 'Last analysis',     value: formatDate(lastAnalysis) },
  ];

  return (
    <div className="ft">
      <div className="ft-header">
        <h1 className="ft-title">Flaky Tests</h1>
        <div className="ft-header-right">
          <p className="ft-subtitle">Tests that switch between pass and fail</p>
          <div className="ft-analyze-wrap">
            <button
              className="ft-analyze-btn"
              onClick={handleCopyPrompt}
              aria-label="Copy analyze flaky tests prompt to clipboard"
              title="Copy 'analyze flaky tests' command to clipboard"
            >
              {copied ? 'Copied ✓' : 'Analyze ↗'}
            </button>
            {copied && (
              <span className="ft-analyze-tip" role="status">
                Paste into Claude Code to generate hypotheses
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="ft-metrics-grid">
        {metricCards.map(card => (
          <div key={card.label} className="ft-metric-card">
            <span className="ft-metric-value">{card.value}</span>
            <span className="ft-metric-label">{card.label}</span>
            {card.sub && <span className="ft-metric-sub">{card.sub}</span>}
          </div>
        ))}
      </div>

      {note && (
        <div className="ft-insight" role="note">
          <p><span className="ft-insight-icon" aria-hidden="true">ℹ</span>{note}</p>
        </div>
      )}

      <div className="ft-section">
        <div className="ft-table-wrap">
          <table className="ft-table">
            <caption className="ft-table-caption">
              Top 10 flakiest test cases by flakiness score
            </caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Test case</th>
                <th scope="col">Score</th>
                <th scope="col">P / F / Total</th>
                <th scope="col">Recent pattern</th>
                <th scope="col">Hypothesis</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t, i) => (
                <tr key={t.test_case_id} className="ft-row">
                  <th scope="row" className="ft-rank">{i + 1}</th>
                  <td className="ft-tc-cell">
                    <Link
                      to="/test-cases"
                      className="ft-tc-link"
                      title={t.test_case_title}
                    >
                      {t.test_case_title}
                    </Link>
                  </td>
                  <td className="ft-score-cell">
                    <ScoreMeter score={t.flakiness_score} />
                  </td>
                  <td
                    className="ft-counts"
                    aria-label={`${t.pass_count} passes, ${t.fail_count} fails, ${t.eligible_runs} total eligible runs`}
                  >
                    <span className="ft-pass-count">🟢 {t.pass_count}</span>
                    {' / '}
                    <span className="ft-fail-count">🔴 {t.fail_count}</span>
                    {' / '}
                    <span className="ft-total-count">{t.eligible_runs}</span>
                  </td>
                  <td className="ft-pattern-cell">
                    <PatternPills pattern={t.recent_pattern || []} />
                  </td>
                  <td className="ft-hyp-cell">
                    <HypothesisCell
                      hypothesis={t.hypothesis}
                      updatedAt={t.hypothesis_updated_at}
                      expanded={!!expanded[t.test_case_id]}
                      onToggle={e => handleToggle(t.test_case_id, e)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="ft-card-list" aria-label="Flaky tests">
        {tests.map((t, i) => (
          <div key={t.test_case_id} className="ft-card">
            <div className="ft-card-header">
              <span className="ft-card-rank">#{i + 1}</span>
              <Link to="/test-cases" className="ft-tc-link ft-card-title">
                {t.test_case_title}
              </Link>
            </div>
            <div className="ft-card-body">
              <div className="ft-card-row">
                <span className="ft-card-field">Score</span>
                <ScoreMeter score={t.flakiness_score} />
              </div>
              <div className="ft-card-row">
                <span className="ft-card-field">Results</span>
                <span
                  className="ft-counts"
                  aria-label={`${t.pass_count} passes, ${t.fail_count} fails, ${t.eligible_runs} total`}
                >
                  <span className="ft-pass-count">🟢 {t.pass_count}</span>
                  {' / '}
                  <span className="ft-fail-count">🔴 {t.fail_count}</span>
                  {' / '}
                  <span className="ft-total-count">{t.eligible_runs}</span>
                </span>
              </div>
              <div className="ft-card-row">
                <span className="ft-card-field">Recent</span>
                <PatternPills pattern={t.recent_pattern || []} />
              </div>
              <div className="ft-card-hyp">
                <HypothesisCell
                  hypothesis={t.hypothesis}
                  updatedAt={t.hypothesis_updated_at}
                  expanded={!!expanded[`m-${t.test_case_id}`]}
                  onToggle={e => handleToggle(`m-${t.test_case_id}`, e)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
