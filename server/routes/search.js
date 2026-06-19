const express = require('express');
const router  = express.Router();
const db      = require('../db');

function handleSearch(req, res) {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) {
      return res.json({ success: true, data: [], error: null });
    }

    const like = `%${q}%`;

    const cases = db.prepare(
      `SELECT 'test_case' AS type, id, title AS name, status, severity
       FROM test_cases
       WHERE title LIKE ?
       ORDER BY updated_at DESC
       LIMIT 5`
    ).all(like);

    const bugs = db.prepare(
      `SELECT 'bug' AS type, id, title AS name, status, severity
       FROM bugs
       WHERE title LIKE ?
       ORDER BY updated_at DESC
       LIMIT 5`
    ).all(like);

    const suites = db.prepare(
      `SELECT 'suite' AS type, id, name, status, NULL AS severity
       FROM suites
       WHERE name LIKE ? OR feature LIKE ?
       ORDER BY updated_at DESC
       LIMIT 5`
    ).all(like, like);

    res.json({ success: true, data: [...cases, ...bugs, ...suites], error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

router.get('/', handleSearch);
module.exports = router;
