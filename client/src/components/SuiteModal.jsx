import { useState } from 'react';
import '../components/TestCaseModal.css';

const STATUSES = ['draft', 'ready', 'in-progress', 'passed', 'failed'];

export default function SuiteModal({ suite, onClose, onSaved }) {
  const isEdit = !!suite;
  const [form, setForm] = useState({
    name:    suite?.name    ?? '',
    feature: suite?.feature ?? '',
    status:  suite?.status  ?? 'draft',
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.feature.trim()) {
      setError('Name and feature are required.');
      return;
    }
    setSaving(true);
    setError('');
    const url    = isEdit ? `/api/suites/${suite.id}` : '/api/suites';
    const method = isEdit ? 'PUT' : 'POST';
    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const json = await res.json();
    setSaving(false);
    if (!json.success) { setError(json.error); return; }
    onSaved(json.data);
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h2>{isEdit ? 'Edit Suite' : 'New Suite'}</h2>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label>
              <span>Name <em className="req">*</em></span>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Login Smoke Tests"
              />
            </label>

            <label>
              <span>Feature <em className="req">*</em></span>
              <input
                type="text"
                value={form.feature}
                onChange={e => set('feature', e.target.value)}
                placeholder="Login"
              />
            </label>

            <label>
              <span>Status</span>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>

            {error && <p className="modal-err">{error}</p>}
          </div>

          <div className="modal-foot">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
