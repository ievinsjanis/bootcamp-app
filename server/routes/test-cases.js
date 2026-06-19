const express = require('express');
const router = express.Router();
const db = require('../db');

const severityOrder = `CASE severity WHEN 'Critical' THEN 1 WHEN 'Major' THEN 2 WHEN 'Minor' THEN 3 WHEN 'Trivial' THEN 4 END`;

// ── CSV helpers ───────────────────────────────────────────

function csvField(value) {
  if (value == null) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function stepsToText(json) {
  if (!json) return '';
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.join('\n') : json;
  } catch { return json; }
}

function handleListTestCases(req, res) {
  try {
    const { status, search, sort = 'updated_at', order = 'desc', page = '1' } = req.query;
    const limit = 20;
    const offset = (parseInt(page) - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';

    if (status) { where += ' AND status = ?'; params.push(status); }
    if (search) { where += ' AND title LIKE ?'; params.push(`%${search}%`); }

    const total = db.prepare(`SELECT COUNT(*) as count FROM test_cases ${where}`).get(...params).count;

    const orderSql = sort === 'severity'
      ? `ORDER BY ${severityOrder} ${order === 'desc' ? 'DESC' : 'ASC'}`
      : `ORDER BY updated_at ${order === 'desc' ? 'DESC' : 'ASC'}`;

    const rows = db
      .prepare(`SELECT * FROM test_cases ${where} ${orderSql} LIMIT ? OFFSET ?`)
      .all(...params, limit, offset);

    res.json({ success: true, data: { rows, total, page: parseInt(page), limit }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleGetTestCase(req, res) {
  try {
    const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, data: null, error: 'Not found' });
    res.json({ success: true, data: row, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleCreateTestCase(req, res) {
  try {
    const { title, preconditions, steps, expected_result, severity, status = 'draft' } = req.body;
    if (!title || !steps || !expected_result || !severity) {
      return res.status(400).json({ success: false, data: null, error: 'title, steps, expected_result, and severity are required.' });
    }
    if (!/^\[.+\]/.test(title)) {
      return res.status(400).json({ success: false, data: null, error: 'Title must start with a feature area in square brackets, e.g. [Login].' });
    }
    const result = db.prepare(
      `INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(title, preconditions || null, JSON.stringify(steps), expected_result, severity, status);
    const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: row, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleUpdateTestCase(req, res) {
  try {
    const existing = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, data: null, error: 'Not found' });
    const { title, preconditions, steps, expected_result, severity, status } = req.body;
    const newTitle = title ?? existing.title;
    if (!/^\[.+\]/.test(newTitle)) {
      return res.status(400).json({ success: false, data: null, error: 'Title must start with a feature area in square brackets, e.g. [Login].' });
    }
    db.prepare(
      `UPDATE test_cases SET title=?, preconditions=?, steps=?, expected_result=?, severity=?, status=?, updated_at=datetime('now') WHERE id=?`
    ).run(
      newTitle,
      preconditions !== undefined ? (preconditions || null) : existing.preconditions,
      steps ? JSON.stringify(steps) : existing.steps,
      expected_result ?? existing.expected_result,
      severity ?? existing.severity,
      status ?? existing.status,
      req.params.id
    );
    const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: row, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleDeleteTestCase(req, res) {
  try {
    const existing = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, data: null, error: 'Not found' });
    db.prepare('DELETE FROM suite_cases WHERE test_case_id = ?').run(req.params.id);
    db.prepare('DELETE FROM test_cases WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: { id: parseInt(req.params.id) }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleExportTestCases(req, res) {
  try {
    const { status, search, sort = 'updated_at', order = 'desc' } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (status) { where += ' AND status = ?'; params.push(status); }
    if (search) { where += ' AND title LIKE ?'; params.push(`%${search}%`); }

    const orderSql = sort === 'severity'
      ? `ORDER BY ${severityOrder} ${order === 'desc' ? 'DESC' : 'ASC'}`
      : `ORDER BY updated_at ${order === 'desc' ? 'DESC' : 'ASC'}`;

    const rows = db.prepare(`SELECT * FROM test_cases ${where} ${orderSql}`).all(...params);

    const HEADERS = ['title', 'preconditions', 'steps', 'expected_result', 'severity', 'status', 'created_at', 'updated_at'];
    const lines   = [HEADERS.join(',')];

    for (const r of rows) {
      lines.push([
        csvField(r.title),
        csvField(r.preconditions),
        csvField(stepsToText(r.steps)),
        csvField(r.expected_result),
        csvField(r.severity),
        csvField(r.status),
        csvField(r.created_at),
        csvField(r.updated_at),
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="test-cases-sample.csv"');
    res.send(lines.join('\r\n'));
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

router.get('/export', handleExportTestCases);
router.get('/',     handleListTestCases);
router.get('/:id',  handleGetTestCase);
router.post('/',    handleCreateTestCase);
router.put('/:id',  handleUpdateTestCase);
router.delete('/:id', handleDeleteTestCase);

module.exports = router;
