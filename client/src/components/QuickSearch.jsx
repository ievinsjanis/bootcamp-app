import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './QuickSearch.css';

const TYPE_META = {
  test_case: { label: 'Test Case', path: () => '/test-cases',   style: { background: '#dbeafe', color: '#1d4ed8' } },
  bug:       { label: 'Bug',       path: r  => `/bugs/${r.id}`, style: { background: '#fee2e2', color: '#991b1b' } },
  suite:     { label: 'Suite',     path: r  => `/test-suites/${r.id}`, style: { background: '#dcfce7', color: '#166534' } },
};

function useDebounced(value, ms) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function QuickSearch({ onClose }) {
  const navigate    = useNavigate();
  const inputRef    = useRef(null);
  const listRef     = useRef(null);
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [fetchErr, setFetchErr] = useState('');
  const [cursor, setCursor]     = useState(0);

  const debouncedQuery = useDebounced(query, 250);

  // Auto-focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Fetch results whenever debounced query changes
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setResults([]);
      setFetchErr('');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchErr('');

    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        if (json.success) setResults(json.data);
        else setFetchErr(json.error || 'Search failed.');
      })
      .catch(() => {
        if (!cancelled) setFetchErr('Search failed — check your connection.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Reset cursor when results change
  useEffect(() => { setCursor(0); }, [results]);

  function openResult(r) {
    const meta = TYPE_META[r.type];
    if (meta) navigate(meta.path(r));
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[cursor]) openResult(results[cursor]);
    }
    // Escape is handled by the global handler in AppShell
  }

  // Scroll active result into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const trimmed  = query.trim();
  const showHint = trimmed.length < 2;
  const showEmpty = !loading && !fetchErr && trimmed.length >= 2 && results.length === 0;

  return (
    <div className="qs-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="qs-modal" role="dialog" aria-label="Quick search">

        <div className="qs-input-row">
          <svg className="qs-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            className="qs-input"
            type="text"
            placeholder="Search test cases, bugs, and suites…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck="false"
            aria-label="Quick search"
          />
          {loading && <span className="qs-spinner" aria-hidden="true" />}
        </div>

        <div className="qs-results" ref={listRef}>
          {showHint && (
            <p className="qs-hint">Type at least 2 characters to search.</p>
          )}
          {fetchErr && (
            <p className="qs-msg qs-msg-err">{fetchErr}</p>
          )}
          {showEmpty && (
            <p className="qs-msg">No results found. Try a different title, status, or keyword.</p>
          )}
          {results.map((r, i) => {
            const meta = TYPE_META[r.type] || {};
            return (
              <button
                key={`${r.type}-${r.id}`}
                className={`qs-result${i === cursor ? ' qs-active' : ''}`}
                data-active={i === cursor ? 'true' : undefined}
                onClick={() => openResult(r)}
                onMouseMove={() => setCursor(i)}
                type="button"
              >
                <span className="qs-badge" style={meta.style}>{meta.label}</span>
                <span className="qs-name">{r.name}</span>
                <span className="qs-meta">
                  {r.severity && <span className="qs-chip">{r.severity}</span>}
                  {r.status   && <span className="qs-chip">{r.status}</span>}
                </span>
              </button>
            );
          })}
        </div>

        {results.length > 0 && (
          <div className="qs-footer">
            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> open</span>
            <span><kbd>Esc</kbd> close</span>
          </div>
        )}
      </div>
    </div>
  );
}
