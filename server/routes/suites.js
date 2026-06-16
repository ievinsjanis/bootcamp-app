const express = require('express');
const router = express.Router();
const db = require('../db');

function getSuiteWithCases(suiteId) {
  const suite = db.prepare('SELECT * FROM suites WHERE id = ?').get(suiteId);
  if (!suite) return null;
  const cases = db.prepare(`
    SELECT tc.*, sc.sort_order
    FROM suite_cases sc
    JOIN test_cases tc ON tc.id = sc.test_case_id
    WHERE sc.suite_id = ?
    ORDER BY sc.sort_order ASC
  `).all(suiteId);
  return { ...suite, cases };
}

function handleListSuites(req, res) {
  try {
    const { status } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (status) { where += ' AND s.status = ?'; params.push(status); }

    const rows = db.prepare(`
      SELECT s.*, COUNT(sc.id) as case_count
      FROM suites s
      LEFT JOIN suite_cases sc ON sc.suite_id = s.id
      ${where}
      GROUP BY s.id
      ORDER BY s.updated_at DESC
    `).all(...params);

    res.json({ success: true, data: rows, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleGetSuite(req, res) {
  try {
    const suite = getSuiteWithCases(req.params.id);
    if (!suite) return res.status(404).json({ success: false, data: null, error: 'Not found' });
    res.json({ success: true, data: suite, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleCreateSuite(req, res) {
  try {
    const { name, feature, status = 'draft' } = req.body;
    if (!name || !feature) {
      return res.status(400).json({ success: false, data: null, error: 'name and feature are required.' });
    }
    const result = db.prepare(
      `INSERT INTO suites (name, feature, status) VALUES (?, ?, ?)`
    ).run(name, feature, status);
    const suite = getSuiteWithCases(result.lastInsertRowid);
    res.status(201).json({ success: true, data: suite, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleUpdateSuite(req, res) {
  try {
    const existing = db.prepare('SELECT * FROM suites WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, data: null, error: 'Not found' });
    const { name, feature, status } = req.body;
    db.prepare(
      `UPDATE suites SET name=?, feature=?, status=?, updated_at=datetime('now') WHERE id=?`
    ).run(name ?? existing.name, feature ?? existing.feature, status ?? existing.status, req.params.id);
    const suite = getSuiteWithCases(req.params.id);
    res.json({ success: true, data: suite, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleDeleteSuite(req, res) {
  try {
    const existing = db.prepare('SELECT * FROM suites WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, data: null, error: 'Not found' });
    db.prepare('DELETE FROM suite_cases WHERE suite_id = ?').run(req.params.id);
    db.prepare('DELETE FROM suites WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: { id: parseInt(req.params.id) }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleAddSuiteCase(req, res) {
  try {
    const suite = db.prepare('SELECT * FROM suites WHERE id = ?').get(req.params.id);
    if (!suite) return res.status(404).json({ success: false, data: null, error: 'Suite not found' });
    const { case_id } = req.body;
    if (!case_id) return res.status(400).json({ success: false, data: null, error: 'case_id is required.' });
    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM suite_cases WHERE suite_id = ?').get(req.params.id);
    const nextOrder = (maxOrder.m ?? -1) + 1;
    db.prepare('INSERT OR IGNORE INTO suite_cases (suite_id, test_case_id, sort_order) VALUES (?, ?, ?)').run(req.params.id, case_id, nextOrder);
    db.prepare(`UPDATE suites SET updated_at=datetime('now') WHERE id=?`).run(req.params.id);
    const result = getSuiteWithCases(req.params.id);
    res.json({ success: true, data: result, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleRemoveSuiteCase(req, res) {
  try {
    const suite = db.prepare('SELECT * FROM suites WHERE id = ?').get(req.params.id);
    if (!suite) return res.status(404).json({ success: false, data: null, error: 'Suite not found' });
    db.prepare('DELETE FROM suite_cases WHERE suite_id = ? AND test_case_id = ?').run(req.params.id, req.params.caseId);
    db.prepare(`UPDATE suites SET updated_at=datetime('now') WHERE id=?`).run(req.params.id);
    const result = getSuiteWithCases(req.params.id);
    res.json({ success: true, data: result, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleReorderSuiteCases(req, res) {
  try {
    const suite = db.prepare('SELECT * FROM suites WHERE id = ?').get(req.params.id);
    if (!suite) return res.status(404).json({ success: false, data: null, error: 'Suite not found' });
    const { case_ids } = req.body;
    if (!Array.isArray(case_ids)) return res.status(400).json({ success: false, data: null, error: 'case_ids must be an array.' });
    const update = db.prepare('UPDATE suite_cases SET sort_order = ? WHERE suite_id = ? AND test_case_id = ?');
    db.transaction((ids) => {
      ids.forEach((id, idx) => update.run(idx, req.params.id, id));
    })(case_ids);
    db.prepare(`UPDATE suites SET updated_at=datetime('now') WHERE id=?`).run(req.params.id);
    const result = getSuiteWithCases(req.params.id);
    res.json({ success: true, data: result, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

router.get('/',                       handleListSuites);
router.get('/:id',                    handleGetSuite);
router.post('/',                      handleCreateSuite);
router.put('/:id',                    handleUpdateSuite);
router.delete('/:id',                 handleDeleteSuite);
router.post('/:id/cases',             handleAddSuiteCase);
router.delete('/:id/cases/:caseId',   handleRemoveSuiteCase);
router.put('/:id/cases/reorder',      handleReorderSuiteCases);

module.exports = router;
