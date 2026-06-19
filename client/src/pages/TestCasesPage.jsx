import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import TestCaseModal from '../components/TestCaseModal';
import './TestCasesPage.css';

const STATUS_OPTIONS = ['draft', 'ready', 'passed', 'failed', 'skipped'];

function formatDate(str) {
  if (!str) return '—';
  return new Date(str + 'Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TestCasesPage() {
  const [rows, setRows]               = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('');
  const [sortBy, setSortBy]           = useState('updated_at');
  const [sortOrder, setSortOrder]     = useState('desc');
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState('');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editing, setEditing]         = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const p = new URLSearchParams({ page, sort: sortBy, order: sortOrder });
      if (search) p.set('search', search);
      if (statusFilter) p.set('status', statusFilter);
      const res = await fetch(`/api/test-cases?${p}`);
      const json = await res.json();
      if (json.success) { setRows(json.data.rows); setTotal(json.data.total); }
      else setFetchError(json.error || 'Failed to load test cases.');
    } catch {
      setFetchError('Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sortBy, sortOrder]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleSort(col) {
    if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortOrder('desc'); }
    setPage(1);
  }

  function openNew()     { setEditing(null); setModalOpen(true); }
  function openEdit(tc)  { setEditing(tc);   setModalOpen(true); }

  async function handleDelete(tc) {
    if (!confirm(`Delete "${tc.title}"?`)) return;
    await fetch(`/api/test-cases/${tc.id}`, { method: 'DELETE' });
    fetchData();
  }

  const totalPages = Math.ceil(total / 20);

  function SortIcon({ col }) {
    if (sortBy !== col) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon active">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <div className="tcp">
      <div className="tcp-header">
        <h1>Test Cases</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/test-cases/import" className="btn-secondary">↑ Import CSV</Link>
          <a
            href={(() => {
              const p = new URLSearchParams({ sort: sortBy, order: sortOrder });
              if (search) p.set('search', search);
              if (statusFilter) p.set('status', statusFilter);
              return `/api/test-cases/export?${p}`;
            })()}
            className="btn-secondary"
            download
          >
            ↓ Download CSV
          </a>
          <button className="btn-primary" onClick={openNew}>+ New Test Case</button>
        </div>
      </div>

      <div className="tcp-toolbar">
        <input
          className="tcp-search"
          type="text"
          placeholder="Search by title..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          aria-label="Search by title"
        />
        <select
          className="tcp-filter"
          value={statusFilter}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {fetchError && (
        <div className="error-banner--page">
          <p>{fetchError}</p>
          <button className="btn-primary" onClick={fetchData}>Retry</button>
        </div>
      )}

      {!fetchError && (
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th
                className="th-sort"
                onClick={() => toggleSort('severity')}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && toggleSort('severity')}
                tabIndex={0}
                aria-sort={sortBy === 'severity' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                Severity <SortIcon col="severity" />
              </th>
              <th>Status</th>
              <th
                className="th-sort"
                onClick={() => toggleSort('updated_at')}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && toggleSort('updated_at')}
                tabIndex={0}
                aria-sort={sortBy === 'updated_at' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                Updated <SortIcon col="updated_at" />
              </th>
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
                <td />
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="tcp-empty">No test cases found.</td></tr>
            )}
            {!loading && rows.map(tc => (
              <tr key={tc.id}>
                <td className="tc-title">{tc.title}</td>
                <td>
                  <span className={`badge badge--${tc.severity.toLowerCase()}`}>
                    {tc.severity}
                  </span>
                </td>
                <td>
                  <span className={`badge badge--${tc.status.toLowerCase()}`}>
                    {tc.status}
                  </span>
                </td>
                <td className="tc-date">{formatDate(tc.updated_at)}</td>
                <td className="tc-actions">
                  <button className="btn-icon" onClick={() => openEdit(tc)} aria-label={`Edit ${tc.title}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button className="btn-icon btn-del" onClick={() => handleDelete(tc)} aria-label={`Delete ${tc.title}`}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {totalPages > 1 && (
        <div className="tcp-pagination">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} className={p === page ? 'pg-active' : ''} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      <p className="tcp-count">{total} test case{total !== 1 ? 's' : ''}</p>

      {modalOpen && (
        <TestCaseModal
          tc={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchData(); }}
        />
      )}
    </div>
  );
}
