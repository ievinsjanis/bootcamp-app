const express = require('express');
const router  = express.Router();
const db      = require('../db');

const VALID_SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial'];
const VALID_STATUSES   = ['open', 'in-progress', 'resolved', 'closed', 'reopened'];
const SEVERITY_ORDER   = `CASE severity WHEN 'Critical' THEN 1 WHEN 'Major' THEN 2 WHEN 'Minor' THEN 3 WHEN 'Trivial' THEN 4 END`;

const VALID_TRANSITIONS = {
  'open':        ['in-progress', 'closed'],
  'in-progress': ['resolved', 'closed'],
  'resolved':    ['closed', 'reopened'],
  'closed':      ['reopened'],
  'reopened':    ['in-progress', 'closed'],
};

function getBugWithActivity(id) {
  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(id);
  if (!bug) return null;
  const activity = db.prepare(
    'SELECT * FROM bug_activity WHERE bug_id = ? ORDER BY created_at ASC'
  ).all(id);
  return { ...bug, activity, next_statuses: VALID_TRANSITIONS[bug.status] ?? [] };
}

function handleListBugs(req, res) {
  try {
    const { status, severity, search, sort = 'updated_at', order = 'desc' } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    if (status)   { where += ' AND status = ?';                           params.push(status); }
    if (severity) { where += ' AND severity = ?';                         params.push(severity); }
    if (search)   { where += ' AND (title LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    const dir      = order === 'asc' ? 'ASC' : 'DESC';
    const orderSql = sort === 'severity'
      ? `ORDER BY ${SEVERITY_ORDER} ${dir}`
      : `ORDER BY updated_at ${dir}`;

    const rows = db.prepare(`SELECT * FROM bugs ${where} ${orderSql}`).all(...params);
    res.json({ success: true, data: rows, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleGetBug(req, res) {
  try {
    const bug = getBugWithActivity(req.params.id);
    if (!bug) return res.status(404).json({ success: false, data: null, error: 'Bug not found' });
    res.json({ success: true, data: bug, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleCreateBug(req, res) {
  try {
    const { title, description, severity, steps_to_reproduce, expected, actual, environment } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, data: null, error: 'title is required.' });
    }
    if (!severity || !VALID_SEVERITIES.includes(severity)) {
      return res.status(400).json({ success: false, data: null, error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}.` });
    }

    const result = db.prepare(`
      INSERT INTO bugs (title, description, severity, status, steps_to_reproduce, expected, actual, environment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(),
      description || null,
      severity,
      'open',
      steps_to_reproduce ? JSON.stringify(steps_to_reproduce) : null,
      expected    || null,
      actual      || null,
      environment || null
    );

    db.prepare(
      `INSERT INTO bug_activity (bug_id, action, old_value, new_value, message) VALUES (?, ?, ?, ?, ?)`
    ).run(result.lastInsertRowid, 'status_change', null, 'open', 'Bug reported');

    const bug = getBugWithActivity(result.lastInsertRowid);
    res.status(201).json({ success: true, data: bug, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleUpdateBug(req, res) {
  try {
    const existing = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, data: null, error: 'Bug not found' });

    const { title, description, severity, steps_to_reproduce, expected, actual, environment } = req.body;

    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ success: false, data: null, error: 'title cannot be empty.' });
    }
    if (severity !== undefined && !VALID_SEVERITIES.includes(severity)) {
      return res.status(400).json({ success: false, data: null, error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}.` });
    }

    db.prepare(`
      UPDATE bugs SET
        title              = ?,
        description        = ?,
        severity           = ?,
        steps_to_reproduce = ?,
        expected           = ?,
        actual             = ?,
        environment        = ?,
        updated_at         = datetime('now')
      WHERE id = ?
    `).run(
      title !== undefined       ? title.trim()             : existing.title,
      description !== undefined ? (description || null)    : existing.description,
      severity !== undefined    ? severity                  : existing.severity,
      steps_to_reproduce !== undefined
        ? (steps_to_reproduce ? JSON.stringify(steps_to_reproduce) : null)
        : existing.steps_to_reproduce,
      expected    !== undefined ? (expected    || null)    : existing.expected,
      actual      !== undefined ? (actual      || null)    : existing.actual,
      environment !== undefined ? (environment || null)    : existing.environment,
      req.params.id
    );

    const bug = getBugWithActivity(req.params.id);
    res.json({ success: true, data: bug, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleDeleteBug(req, res) {
  try {
    const existing = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, data: null, error: 'Bug not found' });
    db.prepare('DELETE FROM bug_activity WHERE bug_id = ?').run(req.params.id);
    db.prepare('DELETE FROM bugs WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: { id: parseInt(req.params.id) }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handlePatchBugStatus(req, res) {
  try {
    const existing = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, data: null, error: 'Bug not found' });

    const { status, message } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, data: null, error: 'status is required.' });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, data: null, error: `status must be one of: ${VALID_STATUSES.join(', ')}.` });
    }

    const allowed = VALID_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(status)) {
      return res.status(422).json({
        success: false,
        data: null,
        error: `Cannot transition from '${existing.status}' to '${status}'. Allowed: ${allowed.length ? allowed.join(', ') : 'none'}.`,
      });
    }

    db.prepare(`UPDATE bugs SET status = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(status, req.params.id);
    db.prepare(
      `INSERT INTO bug_activity (bug_id, action, old_value, new_value, message) VALUES (?, ?, ?, ?, ?)`
    ).run(req.params.id, 'status_change', existing.status, status, message?.trim() || null);

    const bug = getBugWithActivity(req.params.id);
    res.json({ success: true, data: bug, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

router.get('/',             handleListBugs);
router.get('/:id',          handleGetBug);
router.post('/',            handleCreateBug);
router.put('/:id',          handleUpdateBug);
router.delete('/:id',       handleDeleteBug);
router.patch('/:id/status', handlePatchBugStatus);

module.exports = router;
