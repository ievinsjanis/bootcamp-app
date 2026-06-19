import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import './ImportTestCasesPage.css';

const SEVERITY_STYLE = {
  Critical: { background: '#fee2e2', color: '#991b1b' },
  Major:    { background: '#ffedd5', color: '#9a3412' },
  Minor:    { background: '#fef9c3', color: '#854d0e' },
  Trivial:  { background: '#f1f5f9', color: '#475569' },
};

// ── Step 1: file picker ────────────────────────────────────

function FilePicker({ onPreview }) {
  const inputRef            = useRef(null);
  const [file, setFile]     = useState(null);
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState('');

  function handleFile(f) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setError('Please choose a .csv file.');
      setFile(null);
      return;
    }
    setError('');
    setFile(f);
  }

  async function handlePreview() {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const res  = await fetch('/api/test-cases/import/preview', { method: 'POST', body });
      const json = await res.json();
      if (json.success) onPreview(json.data, file.name);
      else setError(json.error || 'Preview failed.');
    } catch {
      setError('Could not reach the server. Check your connection.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="imp-step">
      <h2 className="imp-step-title">Choose a CSV file</h2>

      <div
        className={`imp-dropzone${file ? ' imp-dropzone--chosen' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
        {file ? (
          <>
            <span className="imp-dropzone-icon">📄</span>
            <span className="imp-dropzone-name">{file.name}</span>
            <span className="imp-dropzone-hint">Click to choose a different file</span>
          </>
        ) : (
          <>
            <span className="imp-dropzone-icon">⬆</span>
            <span className="imp-dropzone-name">Click to browse, or drag a file here</span>
            <span className="imp-dropzone-hint">CSV only · max 5 MB</span>
          </>
        )}
      </div>

      {error && <p className="imp-error">{error}</p>}

      <div className="imp-format-hint">
        <p className="imp-format-title">Expected columns</p>
        <p className="imp-format-body">
          <strong>Required:</strong> <code>title</code>, <code>severity</code>, <code>steps</code>
          <br />
          <strong>Optional:</strong> <code>expected_result</code>, <code>preconditions</code>, <code>status</code>
          <br />
          <strong>Severity values:</strong> Critical, Major, Minor, Trivial (case-insensitive)
          <br />
          <strong>Steps:</strong> separate multiple steps with newlines inside a quoted cell, or with semicolons
        </p>
        <code className="imp-format-example">
          title,severity,steps,expected_result,status{'\n'}
          "[Login] Valid login",Critical,"Enter email;Enter password;Click Login","User lands on dashboard",ready
        </code>
      </div>

      <div className="imp-actions">
        <button
          className="btn-primary"
          onClick={handlePreview}
          disabled={!file || busy}
        >
          {busy ? 'Parsing…' : 'Preview import'}
        </button>
      </div>
    </div>
  );
}

// ── Step 2: preview ────────────────────────────────────────

function Preview({ data, fileName, onCommit, onReset }) {
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');
  const { total, valid, invalid } = data;

  async function handleCommit() {
    setBusy(true);
    setError('');
    try {
      const res  = await fetch('/api/test-cases/import/commit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rows: valid }),
      });
      const json = await res.json();
      if (json.success) onCommit(json.data);
      else setError(json.error || 'Import failed.');
    } catch {
      setError('Could not reach the server. Check your connection.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="imp-step">
      <div className="imp-preview-header">
        <div>
          <h2 className="imp-step-title">Preview — {fileName}</h2>
          <p className="imp-preview-summary">
            {total} row{total !== 1 ? 's' : ''} parsed
            {valid.length > 0 && (
              <span className="imp-summary-ok"> · {valid.length} ready to import</span>
            )}
            {invalid.length > 0 && (
              <span className="imp-summary-err"> · {invalid.length} will be skipped</span>
            )}
          </p>
        </div>
        <button className="imp-back-link" onClick={onReset}>← Choose a different file</button>
      </div>

      {valid.length > 0 && (
        <section className="imp-section">
          <h3 className="imp-section-title imp-section-title--ok">
            ✓ {valid.length} valid row{valid.length !== 1 ? 's' : ''}
          </h3>
          <div className="imp-table-wrap">
            <table className="imp-table">
              <thead>
                <tr>
                  <th className="imp-th-row">Row</th>
                  <th>Title</th>
                  <th>Severity</th>
                  <th>Steps</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {valid.map(r => (
                  <tr key={r.row} className="imp-row-ok">
                    <td className="imp-td-row">{r.row}</td>
                    <td className="imp-td-title">{r.title}</td>
                    <td>
                      <span className="imp-badge" style={SEVERITY_STYLE[r.severity]}>
                        {r.severity}
                      </span>
                    </td>
                    <td className="imp-td-muted">{r.steps.length} step{r.steps.length !== 1 ? 's' : ''}</td>
                    <td className="imp-td-muted">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {invalid.length > 0 && (
        <section className="imp-section">
          <h3 className="imp-section-title imp-section-title--err">
            ✕ {invalid.length} row{invalid.length !== 1 ? 's' : ''} with errors (will be skipped)
          </h3>
          <div className="imp-table-wrap">
            <table className="imp-table">
              <thead>
                <tr>
                  <th className="imp-th-row">Row</th>
                  <th>Title (raw)</th>
                  <th>Errors</th>
                </tr>
              </thead>
              <tbody>
                {invalid.map(r => (
                  <tr key={r.row} className="imp-row-err">
                    <td className="imp-td-row">{r.row}</td>
                    <td className="imp-td-title imp-td-muted">{r.raw?.title || <em>empty</em>}</td>
                    <td>
                      <ul className="imp-err-list">
                        {r.errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {error && <p className="imp-error">{error}</p>}

      <div className="imp-actions">
        {valid.length === 0 ? (
          <p className="imp-no-valid">No valid rows to import. Fix the errors above and try again.</p>
        ) : (
          <button className="btn-primary" onClick={handleCommit} disabled={busy}>
            {busy ? 'Importing…' : `Import ${valid.length} test case${valid.length !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step 3: result ─────────────────────────────────────────

function Result({ result, onReset }) {
  const { imported, skipped } = result;
  return (
    <div className="imp-step imp-result">
      <span className="imp-result-icon">✓</span>
      <h2 className="imp-result-title">
        Imported {imported} test case{imported !== 1 ? 's' : ''}
      </h2>
      {skipped.length > 0 && (
        <p className="imp-result-skipped">
          {skipped.length} row{skipped.length !== 1 ? 's were' : ' was'} skipped due to validation errors.
        </p>
      )}
      <div className="imp-result-actions">
        <Link to="/test-cases" className="btn-primary">View test cases</Link>
        <button className="btn-secondary" onClick={onReset}>Import another file</button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────

export default function ImportTestCasesPage() {
  const [step, setStep]       = useState('pick');   // pick | preview | done
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState('');
  const [result, setResult]   = useState(null);

  function handlePreview(data, name) {
    setPreview(data);
    setFileName(name);
    setStep('preview');
  }

  function handleCommit(data) {
    setResult(data);
    setStep('done');
  }

  function handleReset() {
    setStep('pick');
    setPreview(null);
    setFileName('');
    setResult(null);
  }

  return (
    <div className="imp">
      <Link to="/test-cases" className="imp-back">← Test Cases</Link>
      <h1 className="imp-title">Import Test Cases</h1>

      {step === 'pick'    && <FilePicker onPreview={handlePreview} />}
      {step === 'preview' && (
        <Preview
          data={preview}
          fileName={fileName}
          onCommit={handleCommit}
          onReset={handleReset}
        />
      )}
      {step === 'done'    && <Result result={result} onReset={handleReset} />}
    </div>
  );
}
