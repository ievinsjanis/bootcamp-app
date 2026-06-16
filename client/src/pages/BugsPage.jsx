import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import BugModal from '../components/BugModal';
import './BugsPage.css';

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

const SEV_ORDER    = { Critical: 1, Major: 2, Minor: 3, Trivial: 4 };
const STATUS_ORDER = { open: 1, 'in-progress': 2, reopened: 3, resolved: 4, closed: 5 };

const STATUS_OPTIONS   = ['open', 'in-progress', 'resolved', 'closed', 'reopened'];
const SEVERITY_OPTIONS = ['Critical', 'Major', 'Minor', 'Trivial'];

function formatDate(str) {
  if (!str) return '—';
  return new Date(str + 'Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BugsPage() {
  const [bugs, setBugs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [sevFilter, setSev]         = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]         = useState('');
  const [sort, setSort]             = useState({ col: 'updated_at', dir: 'desc' });
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchBugs = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const p = new URLSearchParams();
      if (statusFilter) p.set('status', statusFilter);
      if (sevFilter)    p.set('severity', sevFilter);
      if (search)       p.set('search', search);
      const res  = await fetch(`/api/bugs?${p}`);
      const json = await res.json();
      if (json.success) setBugs(json.data);
      else setFetchError(json.error || 'Failed to load bugs.');
    } catch {
      setFetchError('Failed to load bugs — check your connection and refresh.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sevFilter, search]);

  useEffect(() => { fetchBugs(); }, [fetchBugs]);

  function toggleSort(col) {
    setSort(s => s.col === col
      ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: col === 'severity' ? 'asc' : 'desc' }
    );
  }

  const sorted = [...bugs].sort((a, b) => {
    let cmp = 0;
    if (sort.col === 'severity')   cmp = SEV_ORDER[a.severity] - SEV_ORDER[b.severity];
    else if (sort.col === 'status') cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    else cmp = (a.updated_at ?? '').localeCompare(b.updated_at ?? '');
    return sort.dir === 'asc' ? cmp : -cmp;
  });

  function openNew()      { setEditing(null); setModalOpen(true); }
  function openEdit(bug, e) { e.stopPropagation(); e.preventDefault(); setEditing(bug); setModalOpen(true); }

  async function handleDelete(bug, e) {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm(`Delete bug "${bug.title}"?`)) return;
    try {
      const res  = await fetch(`/api/bugs/${bug.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) fetchBugs();
      else setFetchError(`Failed to delete "${bug.title}": ${json.error}`);
    } catch {
      setFetchError('Failed to delete bug — check your connection and try again.');
    }
  }

  const SortIcon = ({ col }) => {
    if (sort.col !== col) return <span className="bp-sort-icon">↕</span>;
    return <span className="bp-sort-icon bp-sort-active">{sort.dir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="bp">
      <div className="bp-header">
        <h1>Bugs</h1>
        <button className="btn-primary" onClick={openNew}>+ New Bug</button>
      </div>

      <div className="bp-toolbar">
        <input
          className="bp-search"
          type="search"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search title or description…"
        />
        <select className="bp-filter" value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="bp-filter" value={sevFilter} onChange={e => setSev(e.target.value)}>
          <option value="">All severities</option>
          {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <th>Title</th>
              <th className="bp-th-sort" onClick={() => toggleSort('severity')}>
                Severity <SortIcon col="severity" />
              </th>
              <th className="bp-th-sort" onClick={() => toggleSort('status')}>
                Status <SortIcon col="status" />
              </th>
              <th>Environment</th>
              <th className="bp-th-sort" onClick={() => toggleSort('updated_at')}>
                Updated <SortIcon col="updated_at" />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="bp-empty">Loading…</td></tr>}
            {!loading && fetchError && (
              <tr><td colSpan={6} className="bp-empty bp-error">{fetchError}</td></tr>
            )}
            {!loading && !fetchError && sorted.length === 0 && (
              <tr><td colSpan={6} className="bp-empty">No bugs found.</td></tr>
            )}
            {!loading && !fetchError && sorted.map(bug => (
              <tr key={bug.id}>
                <td className="bp-title">
                  <Link to={`/bugs/${bug.id}`}>{bug.title}</Link>
                </td>
                <td>
                  <span className="badge" style={SEV_STYLES[bug.severity]}>{bug.severity}</span>
                </td>
                <td>
                  <span className="badge" style={STATUS_STYLES[bug.status]}>{bug.status}</span>
                </td>
                <td className="bp-env">{bug.environment || '—'}</td>
                <td className="bp-date">{formatDate(bug.updated_at)}</td>
                <td className="bp-actions">
                  <button className="btn-icon" onClick={e => openEdit(bug, e)} title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button className="btn-icon btn-del" onClick={e => handleDelete(bug, e)} title="Delete">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="bp-count">{bugs.length} bug{bugs.length !== 1 ? 's' : ''}</p>

      {modalOpen && (
        <BugModal
          bug={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchBugs(); }}
        />
      )}
    </div>
  );
}
