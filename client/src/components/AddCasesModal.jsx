import { useState, useEffect } from 'react';
import '../components/TestCaseModal.css';
import './AddCasesModal.css';


export default function AddCasesModal({ suiteId, existingCaseIds, onClose, onAdded }) {
  const [allCases, setAllCases] = useState([]);
  const [added, setAdded]       = useState(new Set(existingCaseIds));
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch('/api/test-cases?page=1')
      .then(r => r.json())
      .then(json => { if (json.success) setAllCases(json.data.rows); })
      .finally(() => setLoading(false));
  }, []);

  const available = allCases.filter(tc => !added.has(tc.id));

  async function handleAdd(tc) {
    const res  = await fetch(`/api/suites/${suiteId}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_id: tc.id }),
    });
    const json = await res.json();
    if (json.success) {
      setAdded(s => new Set([...s, tc.id]));
      onAdded(json.data);
    }
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-labelledby="add-cases-modal-title">
        <div className="modal-head">
          <h2 id="add-cases-modal-title">Add Test Cases</h2>
          <button className="modal-x" onClick={onClose} aria-label="Close dialog">✕</button>
        </div>

        <div className="modal-body acm-body">
          {loading && <p className="acm-empty">Loading...</p>}
          {!loading && available.length === 0 && (
            <p className="acm-empty">All test cases are already in this suite.</p>
          )}
          {!loading && available.map(tc => (
            <div key={tc.id} className="acm-row">
              <div className="acm-info">
                <span className="acm-title">{tc.title}</span>
                <span className={`badge badge--${tc.severity.toLowerCase()} acm-badge`}>{tc.severity}</span>
              </div>
              <button className="btn-add" onClick={() => handleAdd(tc)}>+ Add</button>
            </div>
          ))}
        </div>

        <div className="modal-foot">
          <button className="btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
