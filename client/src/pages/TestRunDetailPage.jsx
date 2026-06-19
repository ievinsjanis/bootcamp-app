import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './TestRunDetailPage.css';

function formatDate(str) {
  if (!str) return '—';
  return new Date(str + 'Z').toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TestRunDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [run, setRun]             = useState(null);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [notes, setNotes]         = useState({});
  const [saving, setSaving]       = useState({});
  const [rowErrors, setRowErrors] = useState({});
  const [genBusy, setGenBusy]     = useState(false);
  const [genError, setGenError]   = useState('');

  async function fetchRun() {
    setLoading(true);
    setFetchError('');
    try {
      const res  = await fetch(`/api/test-runs/${id}`);
      const json = await res.json();
      if (json.success) {
        setRun(json.data);
        const n = {};
        json.data.results.forEach(r => { n[r.id] = r.notes ?? ''; });
        setNotes(n);
      } else {
        setFetchError(res.status === 404 ? 'Run not found.' : (json.error || 'Failed to load run.'));
      }
    } catch {
      setFetchError('Failed to load run — check your connection and refresh.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRun(); }, [id]);

  async function handleGenerateReport() {
    setGenBusy(true);
    setGenError('');
    try {
      const res  = await fetch('/api/reports', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ run_id: parseInt(id) }),
      });
      const json = await res.json();
      if (json.success) navigate(`/reports/${json.data.id}`);
      else setGenError(json.error || 'Failed to generate report.');
    } catch {
      setGenError('Failed to generate report — check your connection.');
    } finally {
      setGenBusy(false);
    }
  }

  async function handleSaveNotes(resultId) {
    const localNotes  = notes[resultId] ?? '';
    const serverNotes = (run.results.find(r => r.id === resultId)?.notes) ?? '';
    if (localNotes === serverNotes) return;

    setSaving(s => ({ ...s, [resultId]: true }));
    setRowErrors(e => ({ ...e, [resultId]: '' }));
    try {
      const res  = await fetch(`/api/test-runs/${id}/results/${resultId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ notes: localNotes || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        setRun(json.data);
        const n = {};
        json.data.results.forEach(r => { n[r.id] = r.notes ?? ''; });
        setNotes(n);
      } else {
        setRowErrors(e => ({ ...e, [resultId]: json.error || 'Failed to save.' }));
      }
    } catch {
      setRowErrors(e => ({ ...e, [resultId]: 'Failed to save — check connection.' }));
    } finally {
      setSaving(s => ({ ...s, [resultId]: false }));
    }
  }

  async function handleSetResult(resultId, newResult) {
    setSaving(s => ({ ...s, [resultId]: true }));
    setRowErrors(e => ({ ...e, [resultId]: '' }));
    try {
      const res  = await fetch(`/api/test-runs/${id}/results/${resultId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          result: newResult,
          notes:  notes[resultId] || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setRun(json.data);
        const n = {};
        json.data.results.forEach(r => { n[r.id] = r.notes ?? ''; });
        setNotes(n);
      } else {
        setRowErrors(e => ({ ...e, [resultId]: json.error || 'Failed to save.' }));
      }
    } catch {
      setRowErrors(e => ({ ...e, [resultId]: 'Failed to save — check connection.' }));
    } finally {
      setSaving(s => ({ ...s, [resultId]: false }));
    }
  }

  if (loading) return (
    <div className="trdp">
      <div className="skel skel--text" style={{ width: '8rem', marginBottom: 'var(--sp-6)' }} />
      <div className="trdp-header">
        <div className="trdp-title-row">
          <div className="skel skel--num" style={{ width: '22rem' }} />
        </div>
        <div className="trdp-meta" style={{ marginTop: 'var(--sp-3)' }}>
          <div className="skel skel--text" style={{ width: '14rem' }} />
        </div>
      </div>
      <div className="trdp-summary">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="trdp-pill trdp-total-pill">
            <div className="skel skel--num" style={{ width: '2rem' }} />
            <div className="skel skel--label" style={{ width: '3.5rem', marginTop: '0.3rem' }} />
          </div>
        ))}
      </div>
    </div>
  );

  if (fetchError) return (
    <div className="trdp">
      <Link to="/test-runs" className="detail-back">← Test Runs</Link>
      <div className="error-banner--page">
        <p>{fetchError}</p>
        <button className="btn-primary" onClick={fetchRun}>Retry</button>
      </div>
    </div>
  );

  const total = run.results.length;
  const pct   = total === 0 ? 0 : Math.round(((run.pass_count + run.skip_count) / total) * 100);

  return (
    <div className="trdp">
      <Link to="/test-runs" className="detail-back">← Test Runs</Link>

      <div className="trdp-header">
        <div className="trdp-title-row">
          <h1 className="detail-title">Run #{run.id} — {run.suite_name}</h1>
          <span className={`badge badge--${run.status}`}>{run.status}</span>
        </div>
        <div className="trdp-meta">
          <span>Started {formatDate(run.start_time)}</span>
          {run.end_time && <span>Ended {formatDate(run.end_time)}</span>}
          <span className="trdp-by">by {run.created_by}</span>
        </div>
      </div>

      <div className="trdp-summary">
        <div className="trdp-pill trdp-pass-pill">
          <span className="trdp-pill-num">{run.pass_count}</span>
          <span className="trdp-pill-label">Passed</span>
        </div>
        <div className="trdp-pill trdp-fail-pill">
          <span className="trdp-pill-num">{run.fail_count}</span>
          <span className="trdp-pill-label">Failed</span>
        </div>
        <div className="trdp-pill trdp-skip-pill">
          <span className="trdp-pill-num">{run.skip_count}</span>
          <span className="trdp-pill-label">Skipped</span>
        </div>
        <div className="trdp-pill trdp-total-pill">
          <span className="trdp-pill-num">{total}</span>
          <span className="trdp-pill-label">Total</span>
        </div>
      </div>

      {total > 0 && (
        <div className="trdp-progress-bar">
          <div
            className="trdp-progress-fill"
            style={{ width: `${pct}%` }}
            title={`${pct}% done`}
          />
        </div>
      )}

      <div className="table-wrap trdp-table-margin">
        <table className="data-table trdp-table">
          <thead>
            <tr>
              <th>Test Case</th>
              <th className="trdp-th-result">Result</th>
              <th className="trdp-th-notes">Notes</th>
            </tr>
          </thead>
          <tbody>
            {run.results.map(r => (
              <tr key={r.id} className={`trdp-row trdp-row-${r.result ?? 'none'}`}>
                <td className="trdp-tc-title">
                  {r.test_case_title}
                  {r.github_issue_url && (
                    <a
                      className="trdp-gh-link"
                      href={r.github_issue_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      ↗ GitHub Issue
                    </a>
                  )}
                </td>
                <td className="trdp-result-cell">
                  <div className="trdp-btn-group">
                    <button
                      className={`trdp-btn trdp-btn-pass${r.result === 'passed' ? ' active' : ''}`}
                      onClick={() => handleSetResult(r.id, 'passed')}
                      disabled={saving[r.id]}
                    >Pass</button>
                    <button
                      className={`trdp-btn trdp-btn-fail${r.result === 'failed' ? ' active' : ''}`}
                      onClick={() => handleSetResult(r.id, 'failed')}
                      disabled={saving[r.id]}
                    >Fail</button>
                    <button
                      className={`trdp-btn trdp-btn-skip${r.result === 'skipped' ? ' active' : ''}`}
                      onClick={() => handleSetResult(r.id, 'skipped')}
                      disabled={saving[r.id]}
                    >Skip</button>
                  </div>
                  {saving[r.id] && <span className="trdp-saving">saving…</span>}
                </td>
                <td className="trdp-notes-cell">
                  <input
                    type="text"
                    className="trdp-notes-input"
                    value={notes[r.id] ?? ''}
                    onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))}
                    onBlur={e => {
                      if (e.relatedTarget?.closest('.trdp-btn-group')) return;
                      handleSaveNotes(r.id);
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                    placeholder="Add notes…"
                    disabled={saving[r.id]}
                  />
                  {rowErrors[r.id] && (
                    <span className="trdp-row-err">{rowErrors[r.id]}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="trdp-hint">
        Click Pass / Fail / Skip to record a result. Notes save automatically when you press Enter or leave the field.
        Marking a case <strong>failed</strong> automatically opens a GitHub issue.
      </p>

      <div className="trdp-footer">
        <button
          className="btn-secondary"
          onClick={handleGenerateReport}
          disabled={genBusy}
        >
          {genBusy ? 'Generating…' : 'Generate report'}
        </button>
        {genError && <span className="trdp-gen-err">{genError}</span>}
      </div>
    </div>
  );
}
