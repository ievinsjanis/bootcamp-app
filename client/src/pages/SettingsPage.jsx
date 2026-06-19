import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import './SettingsPage.css';

const SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial'];
const PAGE_SIZES = [10, 20, 50, 100];

const COMMON_TIMEZONES = [
  'UTC',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Riga',
  'Europe/Helsinki',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export default function SettingsPage() {
  const { settings, loading, updateSettings } = useSettings();
  const [form, setForm]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (!loading && settings) {
      setForm({ ...settings });
    }
  }, [loading, settings]);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    const result = await updateSettings(form);
    setSaving(false);
    if (result.success) setSaved(true);
    else setError(result.error || 'Save failed.');
  }

  if (loading || !form) {
    return <div className="sp"><p className="sp-loading">Loading settings…</p></div>;
  }

  const tzList = COMMON_TIMEZONES.includes(form.timezone)
    ? COMMON_TIMEZONES
    : [form.timezone, ...COMMON_TIMEZONES];

  return (
    <div className="sp">
      <div className="sp-header">
        <h1>Settings</h1>
      </div>

      <form className="sp-form" onSubmit={handleSubmit}>

        <section className="sp-section">
          <h2 className="sp-section-title">Appearance</h2>
          <div className="sp-field">
            <span className="sp-field-label">Theme</span>
            <div className="sp-radio-group" role="radiogroup" aria-label="Theme">
              {[
                { value: 'light',  label: 'Light' },
                { value: 'dark',   label: 'Dark' },
                { value: 'system', label: 'System' },
              ].map(opt => (
                <label key={opt.value} className="sp-radio">
                  <input
                    type="radio"
                    name="theme"
                    value={opt.value}
                    checked={form.theme === opt.value}
                    onChange={() => set('theme', opt.value)}
                  />
                  <span className="sp-radio-label">{opt.label}</span>
                </label>
              ))}
            </div>
            <p className="sp-help">System follows your OS preference.</p>
          </div>
        </section>

        <section className="sp-section">
          <h2 className="sp-section-title">Bug defaults</h2>
          <div className="sp-field">
            <label htmlFor="sp-severity" className="sp-field-label">Default severity for new bugs</label>
            <select
              id="sp-severity"
              value={form.default_severity}
              onChange={e => set('default_severity', e.target.value)}
            >
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <p className="sp-help">Pre-selects this severity when opening the New Bug form.</p>
          </div>
        </section>

        <section className="sp-section">
          <h2 className="sp-section-title">Lists</h2>
          <div className="sp-field">
            <label htmlFor="sp-pagesize" className="sp-field-label">Default page size</label>
            <select
              id="sp-pagesize"
              value={form.default_page_size}
              onChange={e => set('default_page_size', Number(e.target.value))}
            >
              {PAGE_SIZES.map(n => <option key={n} value={n}>{n} rows per page</option>)}
            </select>
          </div>
        </section>

        <section className="sp-section">
          <h2 className="sp-section-title">Localization</h2>
          <div className="sp-field">
            <label htmlFor="sp-tz" className="sp-field-label">Timezone</label>
            <select
              id="sp-tz"
              value={form.timezone}
              onChange={e => set('timezone', e.target.value)}
            >
              {tzList.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </section>

        <section className="sp-section">
          <h2 className="sp-section-title">Automation</h2>
          <div className="sp-field">
            <label className="sp-toggle-row">
              <input
                type="checkbox"
                checked={form.auto_generate_report}
                onChange={e => set('auto_generate_report', e.target.checked)}
              />
              <span>Auto-generate report after a test run completes</span>
            </label>
          </div>
        </section>

        <div className="sp-footer">
          {error && <span className="sp-error">{error}</span>}
          {saved && <span className="sp-saved">Saved</span>}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
