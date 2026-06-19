import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import SuiteModal from '../components/SuiteModal';
import AddCasesModal from '../components/AddCasesModal';
import './SuiteDetailPage.css';


export default function SuiteDetailPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [suite, setSuite]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState('');
  const [reorderError, setReorderError] = useState('');
  const [editOpen, setEditOpen]       = useState(false);
  const [addOpen, setAddOpen]         = useState(false);
  const [dragging, setDragging]       = useState(null);
  const [dragOver, setDragOver]       = useState(null);
  const [creatingRun, setCreatingRun] = useState(false);
  const [runError, setRunError]       = useState('');

  async function fetchSuite() {
    setLoading(true);
    setFetchError('');
    try {
      const res  = await fetch(`/api/suites/${id}`);
      const json = await res.json();
      if (json.success) setSuite(json.data);
      else setFetchError(res.status === 404 ? 'Suite not found.' : (json.error || 'Failed to load suite.'));
    } catch {
      setFetchError('Failed to load suite — check your connection and refresh.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSuite(); }, [id]);

  async function handleNewRun() {
    setCreatingRun(true);
    setRunError('');
    try {
      const res  = await fetch('/api/test-runs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ suite_id: parseInt(id) }),
      });
      const json = await res.json();
      if (json.success) navigate(`/test-runs/${json.data.id}`);
      else setRunError(json.error || 'Failed to create run.');
    } catch {
      setRunError('Failed to create run — check your connection.');
    } finally {
      setCreatingRun(false);
    }
  }

  async function handleRemoveCase(caseId) {
    if (!confirm('Remove this test case from the suite?')) return;
    const res  = await fetch(`/api/suites/${id}/cases/${caseId}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) setSuite(json.data);
  }

  function handleDragStart(idx) { setDragging(idx); }
  function handleDragOver(e, idx) { e.preventDefault(); setDragOver(idx); }
  function handleDragEnd() { setDragging(null); setDragOver(null); }

  async function handleDrop(targetIdx) {
    if (dragging === null || dragging === targetIdx) {
      setDragging(null);
      setDragOver(null);
      return;
    }
    const originalCases = suite.cases;
    const newCases = [...suite.cases];
    const [moved] = newCases.splice(dragging, 1);
    newCases.splice(targetIdx, 0, moved);

    setSuite(s => ({ ...s, cases: newCases }));
    setDragging(null);
    setDragOver(null);
    setReorderError('');

    try {
      const res  = await fetch(`/api/suites/${id}/cases/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_ids: newCases.map(c => c.id) }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Reorder failed');
    } catch {
      setSuite(s => ({ ...s, cases: originalCases }));
      setReorderError('Reorder failed — order has been reverted. Try again.');
    }
  }

  if (loading) return (
    <div className="sdp">
      <div className="skel skel--text" style={{ width: '8rem', marginBottom: 'var(--sp-6)' }} />
      <div className="sdp-header">
        <div className="sdp-title-row">
          <div className="skel skel--num" style={{ width: '18rem' }} />
        </div>
        <div className="sdp-meta" style={{ marginTop: 'var(--sp-3)' }}>
          <div className="skel skel--text" style={{ width: '12rem' }} />
        </div>
      </div>
    </div>
  );
  if (fetchError) return (
    <div className="sdp">
      <Link to="/test-suites" className="detail-back">← Test Suites</Link>
      <div className="error-banner--page">
        <p>{fetchError}</p>
        <button className="btn-primary" onClick={fetchSuite}>Retry</button>
      </div>
    </div>
  );

  const cases = suite.cases ?? [];

  return (
    <div className="sdp">
      <Link to="/test-suites" className="detail-back">← Test Suites</Link>

      <div className="sdp-header">
        <div className="sdp-title-row">
          <h1 className="detail-title">{suite.name}</h1>
          <span className={`badge badge--${suite.status.replace(' ', '-')} sdp-status-badge`}>
            {suite.status}
          </span>
        </div>
        <div className="sdp-meta">
          <span>Feature: <strong>{suite.feature}</strong></span>
          <span>{cases.length} case{cases.length !== 1 ? 's' : ''}</span>
        </div>
        <button className="btn-secondary sdp-edit-btn" onClick={() => setEditOpen(true)}>Edit suite</button>
      </div>

      {reorderError && <p className="sdp-reorder-err">{reorderError}</p>}

      <div className="table-wrap">
        {cases.length === 0 ? (
          <p className="sdp-empty">No test cases in this suite yet. Add some below.</p>
        ) : (
          <table className="data-table sdp-table">
            <thead>
              <tr>
                <th className="col-drag"></th>
                <th>Title</th>
                <th>Severity</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cases.map((tc, idx) => (
                <tr
                  key={tc.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  onDrop={() => handleDrop(idx)}
                  className={[
                    dragging === idx  ? 'row-dragging'  : '',
                    dragOver === idx && dragging !== idx ? 'row-drag-over' : '',
                  ].join(' ')}
                >
                  <td className="col-drag">
                    <span className="drag-handle" title="Drag to reorder">
                      <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
                        <circle cx="4" cy="3"  r="1.5"/>
                        <circle cx="8" cy="3"  r="1.5"/>
                        <circle cx="4" cy="8"  r="1.5"/>
                        <circle cx="8" cy="8"  r="1.5"/>
                        <circle cx="4" cy="13" r="1.5"/>
                        <circle cx="8" cy="13" r="1.5"/>
                      </svg>
                    </span>
                  </td>
                  <td className="sdp-tc-title">{tc.title}</td>
                  <td>
                    <span className={`badge badge--${tc.severity.toLowerCase()}`}>{tc.severity}</span>
                  </td>
                  <td>
                    <span className={`badge badge--${tc.status.toLowerCase()}`}>{tc.status}</span>
                  </td>
                  <td>
                    <button className="btn-icon btn-del" onClick={() => handleRemoveCase(tc.id)} aria-label={`Remove ${tc.title} from suite`}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {runError && <p className="sdp-run-err">{runError}</p>}

      <div className="sdp-footer">
        <button
          className="btn-secondary sdp-edit-btn"
          onClick={handleNewRun}
          disabled={creatingRun || cases.length === 0}
          title={cases.length === 0 ? 'Add cases before starting a run' : 'Start a new test run'}
        >
          {creatingRun ? 'Creating…' : '▶ New Run'}
        </button>
        <button className="btn-primary" onClick={() => setAddOpen(true)}>+ Add Case</button>
      </div>

      {editOpen && (
        <SuiteModal
          suite={suite}
          onClose={() => setEditOpen(false)}
          onSaved={saved => { setSuite(s => ({ ...s, ...saved })); setEditOpen(false); }}
        />
      )}

      {addOpen && (
        <AddCasesModal
          suiteId={id}
          existingCaseIds={cases.map(c => c.id)}
          onClose={() => setAddOpen(false)}
          onAdded={updated => { setSuite(updated); setAddOpen(false); }}
        />
      )}
    </div>
  );
}
