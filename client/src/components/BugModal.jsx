import { useState } from 'react';
import './TestCaseModal.css';

const SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial'];

function parseSteps(raw) {
  if (!raw) return '';
  try { return JSON.parse(raw).join('\n'); } catch { return raw; }
}

export default function BugModal({ bug, onClose, onSaved }) {
  const isEdit = !!bug;
  const [form, setForm] = useState({
    title:              bug?.title              ?? '',
    description:        bug?.description        ?? '',
    severity:           bug?.severity           ?? 'Critical',
    environment:        bug?.environment        ?? '',
    steps_to_reproduce: parseSteps(bug?.steps_to_reproduce),
    expected:           bug?.expected           ?? '',
    actual:             bug?.actual             ?? '',
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }

    setSaving(true);
    setError('');

    const steps = form.steps_to_reproduce
      .split('\n').map(s => s.trim()).filter(Boolean);

    const body = {
      title:              form.title.trim(),
      description:        form.description.trim() || null,
      severity:           form.severity,
      environment:        form.environment.trim() || null,
      steps_to_reproduce: steps.length ? steps : null,
      expected:           form.expected.trim() || null,
      actual:             form.actual.trim()   || null,
    };

    try {
      const url    = isEdit ? `/api/bugs/${bug.id}` : '/api/bugs';
      const method = isEdit ? 'PUT' : 'POST';
      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.success) { setError(json.error); return; }
      onSaved(json.data);
    } catch {
      setError('Save failed — check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="modal" style={{ maxWidth: '640px' }}>
        <div className="modal-head">
          <h2>{isEdit ? 'Edit Bug' : 'New Bug'}</h2>
          <button className="modal-x" onClick={onClose} disabled={saving}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label>
              <span>Title <em className="req">*</em></span>
              <input
                type="text"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="[FeatureArea] short description of what is broken"
              />
            </label>

            <label>
              <span>Description <em className="opt">(optional)</em></span>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Additional context about the bug"
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
                <span>Environment <em className="opt">(optional)</em></span>
                <input
                  type="text"
                  value={form.environment}
                  onChange={e => set('environment', e.target.value)}
                  placeholder="Chrome 125, macOS 14"
                />
              </label>
            </div>

            <label>
              <span>Steps to reproduce <em className="opt">— one per line</em></span>
              <textarea
                value={form.steps_to_reproduce}
                onChange={e => set('steps_to_reproduce', e.target.value)}
                placeholder={'Go to the login page.\nEnter valid credentials.\nClick Login.'}
                rows={4}
              />
            </label>

            <div className="modal-row">
              <label>
                <span>Expected</span>
                <textarea
                  value={form.expected}
                  onChange={e => set('expected', e.target.value)}
                  placeholder="What should happen"
                  rows={2}
                />
              </label>
              <label>
                <span>Actual</span>
                <textarea
                  value={form.actual}
                  onChange={e => set('actual', e.target.value)}
                  placeholder="What actually happened"
                  rows={2}
                />
              </label>
            </div>

            {error && <p className="modal-err">{error}</p>}
          </div>

          <div className="modal-foot">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create bug'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
