import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SuiteModal from '../components/SuiteModal';
import './TestSuitesPage.css';

const STATUS_OPTIONS = ['draft', 'ready', 'in-progress', 'passed', 'failed'];

function formatDate(str) {
  if (!str) return '—';
  return new Date(str + 'Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TestSuitesPage() {
  const [suites, setSuites]         = useState([]);
  const [statusFilter, setStatus]   = useState('');
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);

  const fetchSuites = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const p = new URLSearchParams();
      if (statusFilter) p.set('status', statusFilter);
      const res  = await fetch(`/api/suites?${p}`);
      const json = await res.json();
      if (json.success) setSuites(json.data);
      else setFetchError(json.error || 'Failed to load suites.');
    } catch {
      setFetchError('Failed to load suites — check your connection and refresh.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchSuites(); }, [fetchSuites]);

  function openNew()       { setEditing(null); setModalOpen(true); }
  function openEdit(s, e)  { e.stopPropagation(); setEditing(s); setModalOpen(true); }

  async function handleDelete(suite, e) {
    e.stopPropagation();
    if (!confirm(`Delete suite "${suite.name}"?`)) return;
    await fetch(`/api/suites/${suite.id}`, { method: 'DELETE' });
    fetchSuites();
  }

  return (
    <div className="tsp">
      <div className="tsp-header">
        <h1>Test Suites</h1>
        <button className="btn-primary" onClick={openNew}>+ New Suite</button>
      </div>

      <div className="tsp-toolbar">
        <select
          className="tsp-filter"
          value={statusFilter}
          onChange={e => setStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {fetchError && (
        <div className="error-banner--page">
          <p>{fetchError}</p>
          <button className="btn-primary" onClick={fetchSuites}>Retry</button>
        </div>
      )}

      {!fetchError && (
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Feature</th>
              <th>Status</th>
              <th>Cases</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td><div className="skel skel--text" /></td>
                <td><div className="skel skel--short" /></td>
                <td><div className="skel skel--short" /></td>
                <td><div className="skel skel--short" /></td>
                <td><div className="skel skel--short" /></td>
                <td />
              </tr>
            ))}
            {!loading && suites.length === 0 && (
              <tr><td colSpan={6} className="tsp-empty">No test suites found.</td></tr>
            )}
            {!loading && suites.map(suite => (
              <tr key={suite.id}>
                <td className="tsp-name">
                  <Link to={`/test-suites/${suite.id}`}>{suite.name}</Link>
                </td>
                <td className="tsp-feature">{suite.feature}</td>
                <td>
                  <span className={`badge badge--${suite.status.replace(' ', '-')}`}>
                    {suite.status}
                  </span>
                </td>
                <td className="tsp-count">{suite.case_count}</td>
                <td className="tsp-date">{formatDate(suite.updated_at)}</td>
                <td className="tsp-actions">
                  <button className="btn-icon" onClick={e => openEdit(suite, e)} aria-label={`Edit ${suite.name}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button className="btn-icon btn-del" onClick={e => handleDelete(suite, e)} aria-label={`Delete ${suite.name}`}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      <p className="tsp-count-label">{suites.length} suite{suites.length !== 1 ? 's' : ''}</p>

      {modalOpen && (
        <SuiteModal
          suite={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchSuites(); }}
        />
      )}
    </div>
  );
}
