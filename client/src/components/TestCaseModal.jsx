import { useState } from 'react';
import './TestCaseModal.css';

const SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial'];
const STATUSES   = ['draft', 'ready', 'passed', 'failed', 'skipped'];

function parseSteps(raw) {
  if (!raw) return '';
  try { return JSON.parse(raw).join('\n'); } catch { return raw; }
}

export default function TestCaseModal({ tc, onClose, onSaved }) {
  const isEdit = !!tc;
  const [form, setForm] = useState({
    title:           tc?.title           ?? '',
    preconditions:   tc?.preconditions   ?? '',
    steps:           parseSteps(tc?.steps),
    expected_result: tc?.expected_result ?? '',
    severity:        tc?.severity        ?? 'Critical',
    status:          tc?.status          ?? 'draft',
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const steps = form.steps.split('\n').map(s => s.trim()).filter(Boolean);
    if (!form.title.trim() || steps.length === 0 || !form.expected_result.trim()) {
      setError('Title, steps, and expected result are required.');
      return;
    }
    if (!/^\[.+\]/.test(form.title.trim())) {
      setError('Title must start with a feature area in square brackets, e.g. [Login] Login with valid credentials.');
      return;
    }
    setSaving(true);
    setError('');
    const body = { ...form, steps, preconditions: form.preconditions.trim() || null };
    const url    = isEdit ? `/api/test-cases/${tc.id}` : '/api/test-cases';
    const method = isEdit ? 'PUT' : 'POST';
    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json();
    setSaving(false);
    if (!json.success) { setError(json.error); return; }
    onSaved();
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h2>{isEdit ? 'Edit Test Case' : 'New Test Case'}</h2>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label>
              <span>Title <em className="req">*</em></span>
              <input
                type="text"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="[FeatureArea] what is being tested"
              />
            </label>

            <label>
              <span>Preconditions <em className="opt">(optional)</em></span>
              <textarea
                value={form.preconditions}
                onChange={e => set('preconditions', e.target.value)}
                placeholder="What must be true before the test starts"
                rows={2}
              />
            </label>

            <label>
              <span>Steps <em className="req">*</em> <em className="opt">— one per line</em></span>
              <textarea
                value={form.steps}
                onChange={e => set('steps', e.target.value)}
                placeholder={"Go to the login page.\nEnter a valid username.\nClick the login button."}
                rows={4}
              />
            </label>

            <label>
              <span>Expected result <em className="req">*</em></span>
              <textarea
                value={form.expected_result}
                onChange={e => set('expected_result', e.target.value)}
                placeholder="What should happen"
                rows={2}
              />
            </label>

            <div className="modal-row">
              <label>
                <span>Severity <em className="req">*</em></span>
                <select value={form.severity} onChange={e => set('severity', e.target.value)}>
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label>
                <span>Status</span>
                <select value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>

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
