const express  = require('express');
const multer   = require('multer');
const { parse } = require('csv-parse/sync');
const db       = require('../db');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter(_req, file, cb) {
    const ok = file.mimetype === 'text/csv'
      || file.mimetype === 'application/vnd.ms-excel'
      || file.originalname.toLowerCase().endsWith('.csv');
    cb(ok ? null : new Error('Only CSV files are accepted.'), ok);
  },
});

// ── Constants ─────────────────────────────────────────────

const REQUIRED_HEADERS = ['title', 'severity', 'steps'];
const VALID_SEVERITY   = ['Critical', 'Major', 'Minor', 'Trivial'];
const VALID_STATUS     = ['draft', 'ready', 'passed', 'failed', 'skipped'];

// ── Helpers ───────────────────────────────────────────────

function normaliseSeverity(raw) {
  if (!raw) return null;
  const s = raw.trim();
  return VALID_SEVERITY.find(v => v.toLowerCase() === s.toLowerCase()) || null;
}

function normaliseStatus(raw) {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  return VALID_STATUS.includes(s) ? s : null;
}

function parseSteps(raw) {
  if (!raw) return [];
  const byNewline = raw.split('\n').map(s => s.trim()).filter(Boolean);
  if (byNewline.length > 1) return byNewline;
  return raw.split(';').map(s => s.trim()).filter(Boolean);
}

function validateRow(raw, rowNum) {
  const errors = [];

  const title = (raw.title || '').trim();
  if (!title) errors.push('title is required');

  const severityRaw = (raw.severity || '').trim();
  const severity    = normaliseSeverity(severityRaw);
  if (!severityRaw) errors.push('severity is required');
  else if (!severity) errors.push(`severity "${severityRaw}" must be Critical, Major, Minor, or Trivial`);

  const steps = Array.isArray(raw.steps)
    ? raw.steps.filter(Boolean)
    : parseSteps((raw.steps || '').trim());
  if (!raw.steps || steps.length === 0) errors.push('steps is required and must contain at least one step');

  const statusRaw = (raw.status || '').trim();
  const status    = statusRaw ? normaliseStatus(statusRaw) : 'draft';
  if (statusRaw && !status) {
    errors.push(`status "${statusRaw}" must be one of: ${VALID_STATUS.join(', ')}`);
  }

  if (errors.length > 0) return { row: rowNum, raw, errors };

  return {
    row:             rowNum,
    title,
    severity,
    steps,
    status:          status || 'draft',
    expected_result: (raw.expected_result || '').trim() || null,
    preconditions:   (raw.preconditions   || '').trim() || null,
  };
}

// ── Handlers ──────────────────────────────────────────────

function handlePreviewImport(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, data: null, error: 'No file uploaded.' });
    }

    // Strip UTF-8 BOM if present
    let csv = req.file.buffer.toString('utf8');
    if (csv.charCodeAt(0) === 0xFEFF) csv = csv.slice(1);

    let records;
    try {
      records = parse(csv, {
        columns:          true,
        skip_empty_lines: true,
        trim:             true,
        relax_column_count: true,
      });
    } catch (parseErr) {
      return res.status(400).json({ success: false, data: null, error: `CSV parse error: ${parseErr.message}` });
    }

    if (records.length === 0) {
      return res.status(400).json({ success: false, data: null, error: 'The file is empty or contains only a header row.' });
    }

    // Header check (case-insensitive)
    const headers = Object.keys(records[0]).map(h => h.toLowerCase());
    const missing = REQUIRED_HEADERS.filter(r => !headers.includes(r));
    if (missing.length > 0) {
      return res.status(400).json({
        success: false, data: null,
        error: `Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. ` +
               `File has: ${headers.join(', ')}`,
      });
    }

    // Normalise header names to lowercase for uniform access
    const normRecords = records.map(r => {
      const out = {};
      for (const [k, v] of Object.entries(r)) out[k.toLowerCase()] = v;
      return out;
    });

    const valid   = [];
    const invalid = [];

    normRecords.forEach((raw, i) => {
      const result = validateRow(raw, i + 2); // +2 because row 1 is headers
      if (result.errors) invalid.push(result);
      else valid.push(result);
    });

    res.json({
      success: true,
      data: { total: records.length, valid, invalid },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleCommitImport(req, res) {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, data: null, error: 'No rows to import.' });
    }

    const insert = db.prepare(
      `INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    const skipped = [];
    let imported  = 0;

    const importAll = db.transaction(() => {
      for (const row of rows) {
        // Re-validate server-side
        const validated = validateRow(row, row.row ?? 0);
        if (validated.errors) { skipped.push(validated); continue; }

        insert.run(
          validated.title,
          validated.preconditions || null,
          JSON.stringify(validated.steps),
          validated.expected_result || null,
          validated.severity,
          validated.status,
        );
        imported++;
      }
    });

    importAll();

    res.status(201).json({
      success: true,
      data: { imported, skipped },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

// Multer error → clean JSON response
function withUpload(handler) {
  return (req, res) => {
    upload.single('file')(req, res, err => {
      if (err) {
        const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        const msg    = err.code === 'LIMIT_FILE_SIZE'
          ? 'File is too large. Maximum size is 5 MB.'
          : err.message;
        return res.status(status).json({ success: false, data: null, error: msg });
      }
      handler(req, res);
    });
  };
}

router.post('/preview', withUpload(handlePreviewImport));
router.post('/commit',  handleCommitImport);

module.exports = router;
