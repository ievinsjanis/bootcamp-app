import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import BugModal from '../components/BugModal';
import './BugDetailPage.css';

const SEV_STYLES = {
  Critical: { background: '#fee2e2', color: '#991b1b' },
  Major:    { background: '#ffedd5', color: '#9a3412' },
  Minor:    { background: '#fef9c3', color: '#854d0e' },
  Trivial:  { background: '#f1f5f9', color: '#475569' },
};

const STATUS_STYLES = {
  'open':        { background: '#fee2e2', color: '#991b1b' },
  'in-progress': { background: '#ffedd5', color: '#9a3412' },
  'resolved':    { background: '#dcfce7', color: '#166534' },
  'closed':      { background: '#f1f5f9', color: '#475569' },
  'reopened':    { background: '#f3e8ff', color: '#7e22ce' },
};


function formatDate(str) {
  if (!str) return '—';
  return new Date(str + 'Z').toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function parseSteps(raw) {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export default function BugDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();

  const [bug, setBug]               = useState(null);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [editOpen, setEditOpen]     = useState(false);
  const [newStatus, setNewStatus]   = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [statusError, setStatusError] = useState('');
  const [updating, setUpdating]     = useState(false);

  async function fetchBug() {
    setLoading(true);
    setFetchError('');
    try {
      const res  = await fetch(`/api/bugs/${id}`);
      const json = await res.json();
      if (json.success) setBug(json.data);
      else setFetchError(res.status === 404 ? 'Bug not found.' : (json.error || 'Failed to load bug.'));
    } catch {
      setFetchError('Failed to load bug — check your connection and refresh.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchBug(); }, [id]);

  async function handleDelete() {
    if (!confirm(`Delete bug "${bug.title}"?`)) return;
    setDeleteError('');
    try {
      const res  = await fetch(`/api/bugs/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) navigate('/bugs');
      else setDeleteError(`Delete failed: ${json.error}`);
    } catch {
      setDeleteError('Failed to delete bug — check your connection and try again.');
    }
  }

  async function handleStatusChange() {
    if (!newStatus || updating) return;
    setUpdating(true);
    setStatusError('');
    try {
      const res  = await fetch(`/api/bugs/${id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus, message: statusNote.trim() || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        setBug(json.data);
        setNewStatus('');
        setStatusNote('');
      } else {
        setStatusError(json.error);
      }
    } catch {
      setStatusError('Failed to update status — check your connection.');
    } finally {
      setUpdating(false);
    }
  }

  if (loading)    return <div className="bdp"><p className="bdp-loading">Loading…</p></div>;
  if (fetchError) return <div className="bdp"><p className="bdp-loading">{fetchError}</p></div>;

  const steps      = parseSteps(bug.steps_to_reproduce);
  const nextStates = bug.next_statuses ?? [];

  return (
    <div className="bdp">
      <Link to="/bugs" className="bdp-back">← Bugs</Link>

      <div className="bdp-header">
        <div className="bdp-title-row">
          <h1>{bug.title}</h1>
          <span className="badge" style={STATUS_STYLES[bug.status]}>{bug.status}</span>
        </div>
        <div className="bdp-meta">
          <span className="badge" style={SEV_STYLES[bug.severity]}>{bug.severity}</span>
          {bug.environment && <span className="bdp-env">{bug.environment}</span>}
          <span className="bdp-date">Filed {formatDate(bug.created_at)}</span>
          <span className="bdp-date">Updated {formatDate(bug.updated_at)}</span>
        </div>
        <div className="bdp-header-actions">
          {bug.github_issue_url && (
            <a
              className="btn-secondary bdp-btn-sm bdp-gh-link"
              href={bug.github_issue_url}
              target="_blank"
              rel="noreferrer"
            >
              ↗ GitHub Issue
            </a>
          )}
          <button className="btn-secondary bdp-btn-sm" onClick={() => setEditOpen(true)}>Edit</button>
          <button className="btn-danger    bdp-btn-sm" onClick={handleDelete}>Delete</button>
        </div>
        {deleteError && <p className="bdp-delete-err">{deleteError}</p>}
      </div>

      {bug.description && (
        <section className="bdp-section">
          <h2>Description</h2>
          <p className="bdp-prose">{bug.description}</p>
        </section>
      )}

      {steps.length > 0 && (
        <section className="bdp-section">
          <h2>Steps to reproduce</h2>
          <ol className="bdp-steps">
            {steps.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        </section>
      )}

      {(bug.expected || bug.actual) && (
        <div className="bdp-ea-grid">
          {bug.expected && (
            <section className="bdp-section bdp-ea-box">
              <h2>Expected</h2>
              <p className="bdp-prose">{bug.expected}</p>
            </section>
          )}
          {bug.actual && (
            <section className="bdp-section bdp-ea-box bdp-actual-box">
              <h2>Actual</h2>
              <p className="bdp-prose">{bug.actual}</p>
            </section>
          )}
        </div>
      )}

      <div className="bdp-bottom">
        <div className="bdp-status-card">
          <h2>Update status</h2>
          {nextStates.length === 0 ? (
            <p className="bdp-no-next">No further transitions available from <strong>{bug.status}</strong>.</p>
          ) : (
            <>
              <div className="bdp-status-row">
                <select
                  className="bdp-status-select"
                  value={newStatus}
                  onChange={e => { setNewStatus(e.target.value); setStatusError(''); }}
                >
                  <option value="">— select next status —</option>
                  {nextStates.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  className="btn-primary"
                  onClick={handleStatusChange}
                  disabled={!newStatus || updating}
                >
                  {updating ? 'Updating…' : 'Update'}
                </button>
              </div>
              <label className="bdp-note-label">
                Note <em className="bdp-opt">(optional)</em>
                <input
                  type="text"
                  className="bdp-note-input"
                  value={statusNote}
                  onChange={e => setStatusNote(e.target.value)}
                  placeholder="Explain this status change…"
                />
              </label>
              {statusError && <p className="bdp-status-err">{statusError}</p>}
            </>
          )}
        </div>

        <div className="bdp-timeline">
          <h2>Activity</h2>
          {bug.activity.length === 0 ? (
            <p className="bdp-no-activity">No activity recorded.</p>
          ) : (
            <ul className="bdp-activity-list">
              {[...bug.activity].reverse().map(entry => (
                <li key={entry.id} className="bdp-activity-entry">
                  <span className="bdp-dot" />
                  <div className="bdp-activity-body">
                    <span className="bdp-activity-text">
                      {entry.action === 'status_change' ? (
                        entry.old_value
                          ? <>
                              <span className="status-chip" style={STATUS_STYLES[entry.old_value]}>{entry.old_value}</span>
                              {' → '}
                              <span className="status-chip" style={STATUS_STYLES[entry.new_value]}>{entry.new_value}</span>
                            </>
                          : <>Opened as <span className="status-chip" style={STATUS_STYLES[entry.new_value]}>{entry.new_value}</span></>
                      ) : (
                        entry.message
                      )}
                    </span>
                    {entry.message && entry.action === 'status_change' && (
                      <span className="bdp-note"> — {entry.message}</span>
                    )}
                    <time className="bdp-activity-time">{formatDate(entry.created_at)}</time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {editOpen && (
        <BugModal
          bug={bug}
          onClose={() => setEditOpen(false)}
          onSaved={updated => { setBug(updated); setEditOpen(false); }}
        />
      )}
    </div>
  );
}
