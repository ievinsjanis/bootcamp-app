const express = require('express');
const router  = express.Router();
const db      = require('../db');

const VALID_THEMES    = ['light', 'dark', 'system'];
const VALID_SEVERITY  = ['Critical', 'Major', 'Minor', 'Trivial'];
const VALID_PAGE_SIZE = [10, 20, 50, 100];

function rowToData(row) {
  return {
    theme:                row.theme,
    default_severity:     row.default_severity,
    default_page_size:    row.default_page_size,
    timezone:             row.timezone,
    auto_generate_report: row.auto_generate_report === 1,
    updated_at:           row.updated_at,
  };
}

function handleGetSettings(req, res) {
  try {
    const row = db.prepare('SELECT * FROM user_preferences WHERE id = 1').get();
    res.json({ success: true, data: rowToData(row), error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleUpdateSettings(req, res) {
  try {
    const row = db.prepare('SELECT * FROM user_preferences WHERE id = 1').get();
    const {
      theme                = row.theme,
      default_severity     = row.default_severity,
      default_page_size    = row.default_page_size,
      timezone             = row.timezone,
      auto_generate_report = row.auto_generate_report,
    } = req.body;

    if (!VALID_THEMES.includes(theme)) {
      return res.status(400).json({ success: false, data: null, error: `theme must be one of: ${VALID_THEMES.join(', ')}` });
    }
    if (!VALID_SEVERITY.includes(default_severity)) {
      return res.status(400).json({ success: false, data: null, error: `default_severity must be one of: ${VALID_SEVERITY.join(', ')}` });
    }
    if (!VALID_PAGE_SIZE.includes(Number(default_page_size))) {
      return res.status(400).json({ success: false, data: null, error: `default_page_size must be one of: ${VALID_PAGE_SIZE.join(', ')}` });
    }
    if (typeof timezone !== 'string' || !timezone.trim()) {
      return res.status(400).json({ success: false, data: null, error: 'timezone is required' });
    }

    db.prepare(`
      UPDATE user_preferences
      SET theme=?, default_severity=?, default_page_size=?, timezone=?, auto_generate_report=?, updated_at=datetime('now')
      WHERE id=1
    `).run(
      theme,
      default_severity,
      Number(default_page_size),
      timezone.trim(),
      auto_generate_report ? 1 : 0,
    );

    const updated = db.prepare('SELECT * FROM user_preferences WHERE id = 1').get();
    res.json({ success: true, data: rowToData(updated), error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

router.get('/', handleGetSettings);
router.put('/', handleUpdateSettings);

module.exports = router;
