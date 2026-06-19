const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS test_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    preconditions TEXT,
    steps TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('Critical','Major','Minor','Trivial')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','ready','passed','failed','skipped')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const count = db.prepare('SELECT COUNT(*) as count FROM test_cases').get();
if (count.count === 0) {
  const insert = db.prepare(`
    INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const seed = [
    {
      title: '[Login] Login with valid credentials',
      preconditions: 'A registered user account exists with a known username and password.',
      steps: ['Go to the login page.', 'Enter a valid username.', 'Enter the correct password.', 'Click the login button.'],
      expected_result: 'The app logs the user in and redirects them to the dashboard.',
      severity: 'Critical',
      status: 'ready',
    },
    {
      title: '[Login] Login with invalid password shows error',
      preconditions: 'A registered user account exists.',
      steps: ['Go to the login page.', 'Enter a valid username.', 'Enter an incorrect password.', 'Click the login button.'],
      expected_result: 'An error message appears stating the credentials are invalid. The user stays on the login page.',
      severity: 'Critical',
      status: 'draft',
    },
    {
      title: '[Login] Login form rejects empty fields',
      preconditions: null,
      steps: ['Go to the login page.', 'Leave both fields empty.', 'Click the login button.'],
      expected_result: 'Validation errors appear on both fields. The form does not submit.',
      severity: 'Major',
      status: 'draft',
    },
    {
      title: '[Profile] Update display name and save',
      preconditions: 'User is logged in.',
      steps: ['Go to profile settings.', 'Clear the display name field.', 'Enter a new display name.', 'Click Save.'],
      expected_result: 'The profile updates and the new display name appears across the app.',
      severity: 'Major',
      status: 'ready',
    },
    {
      title: '[Dashboard] Dashboard loads user summary data on login',
      preconditions: 'User account has at least one previous session.',
      steps: ['Log in with valid credentials.', 'Wait for the dashboard to fully load.'],
      expected_result: "The dashboard displays the user's name and summary stats.",
      severity: 'Minor',
      status: 'draft',
    },
  ];

  for (const tc of seed) {
    insert.run(tc.title, tc.preconditions, JSON.stringify(tc.steps), tc.expected_result, tc.severity, tc.status);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS suites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    feature TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','ready','in-progress','passed','failed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS suite_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suite_id INTEGER NOT NULL,
    test_case_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE(suite_id, test_case_id)
  )
`);

const suiteCount = db.prepare('SELECT COUNT(*) as count FROM suites').get();
if (suiteCount.count === 0) {
  const tcs = db.prepare('SELECT id FROM test_cases ORDER BY id').all();
  if (tcs.length >= 3) {
    const insertSuite = db.prepare(`INSERT INTO suites (name, feature, status) VALUES (?, ?, ?)`);
    const insertCase  = db.prepare(`INSERT INTO suite_cases (suite_id, test_case_id, sort_order) VALUES (?, ?, ?)`);

    const s1 = insertSuite.run('Login Smoke Tests', 'Login', 'ready');
    insertCase.run(s1.lastInsertRowid, tcs[0].id, 0);
    insertCase.run(s1.lastInsertRowid, tcs[1].id, 1);
    insertCase.run(s1.lastInsertRowid, tcs[2].id, 2);

    const s2 = insertSuite.run('Profile & Dashboard', 'Profile', 'draft');
    insertCase.run(s2.lastInsertRowid, tcs[3]?.id ?? tcs[0].id, 0);
    insertCase.run(s2.lastInsertRowid, tcs[4]?.id ?? tcs[1].id, 1);
    insertCase.run(s2.lastInsertRowid, tcs[2].id, 2);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS bugs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL CHECK(severity IN ('Critical','Major','Minor','Trivial')),
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in-progress','resolved','closed','reopened')),
    steps_to_reproduce TEXT,
    expected TEXT,
    actual TEXT,
    environment TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS bug_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_id INTEGER NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('status_change','comment')),
    old_value TEXT,
    new_value TEXT,
    message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

try { db.exec(`ALTER TABLE bugs ADD COLUMN github_issue_url TEXT`); } catch {}

const bugCount = db.prepare('SELECT COUNT(*) as count FROM bugs').get();
if (bugCount.count === 0) {
  const insertBug = db.prepare(`
    INSERT INTO bugs (title, description, severity, status, steps_to_reproduce, expected, actual, environment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertActivity = db.prepare(
    `INSERT INTO bug_activity (bug_id, action, old_value, new_value, message) VALUES (?, ?, ?, ?, ?)`
  );

  const b1 = insertBug.run(
    '[Login] Session expires immediately after login on mobile Safari',
    'Users who authenticate via mobile Safari are redirected back to the login page before the dashboard loads.',
    'Critical', 'open',
    JSON.stringify(['Open the app in mobile Safari on iOS.', 'Enter valid credentials.', 'Click Login.']),
    'User is logged in and the dashboard loads.',
    'User is immediately redirected back to the login page.',
    'iOS 17, Safari 17'
  );
  insertActivity.run(b1.lastInsertRowid, 'status_change', null, 'open', 'Bug reported');

  const b2 = insertBug.run(
    '[Checkout] Expired discount codes accepted at checkout',
    'Discount codes past their expiry date are still applied, incorrectly reducing the order total.',
    'Major', 'in-progress',
    JSON.stringify(['Add any item to the cart.', 'Enter a discount code with a past expiry date.', 'Proceed to payment.']),
    'The app rejects the expired code and shows an expiry error.',
    'The expired code is accepted and the full discount is applied to the order.',
    'Chrome 125, Windows 11'
  );
  insertActivity.run(b2.lastInsertRowid, 'status_change', null, 'open', 'Bug reported');
  insertActivity.run(b2.lastInsertRowid, 'status_change', 'open', 'in-progress', 'Picked up — investigating discount validation logic');

  const b3 = insertBug.run(
    '[Profile] Avatar upload silently fails for PNG files over 2 MB',
    'Uploading a PNG avatar larger than 2 MB shows a success toast but the avatar does not update.',
    'Minor', 'resolved',
    JSON.stringify(['Log in.', 'Go to Profile settings.', 'Upload a PNG file larger than 2 MB.', 'Click Save.']),
    'The app rejects the file with a clear size-limit error, or uploads it successfully.',
    'A success toast appears but the avatar image stays unchanged.',
    'Firefox 126, macOS 14'
  );
  insertActivity.run(b3.lastInsertRowid, 'status_change', null, 'open', 'Bug reported');
  insertActivity.run(b3.lastInsertRowid, 'status_change', 'open', 'in-progress', 'Root cause found: upload handler missing file-size check');
  insertActivity.run(b3.lastInsertRowid, 'status_change', 'in-progress', 'resolved', 'Fix deployed — 2 MB limit enforced client-side and server-side');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS test_runs_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suite_id INTEGER NOT NULL,
    suite_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','aborted')),
    pass_count INTEGER NOT NULL DEFAULT 0,
    fail_count INTEGER NOT NULL DEFAULT 0,
    skip_count INTEGER NOT NULL DEFAULT 0,
    start_time TEXT NOT NULL DEFAULT (datetime('now')),
    end_time TEXT,
    created_by TEXT NOT NULL DEFAULT 'anonymous',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS test_run_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    test_case_id INTEGER NOT NULL,
    test_case_title TEXT NOT NULL,
    result TEXT CHECK(result IN ('passed','failed','skipped')),
    duration_ms INTEGER,
    notes TEXT,
    failed_at TEXT,
    github_issue_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const runCount = db.prepare('SELECT COUNT(*) as count FROM test_runs_v2').get();
if (runCount.count === 0) {
  const suite1 = db.prepare('SELECT * FROM suites WHERE id = 1').get();
  if (suite1) {
    const cases = db.prepare(`
      SELECT tc.id, tc.title
      FROM suite_cases sc
      JOIN test_cases tc ON tc.id = sc.test_case_id
      WHERE sc.suite_id = 1
      ORDER BY sc.sort_order ASC
    `).all();
    if (cases.length >= 2) {
      const insertRun = db.prepare(`
        INSERT INTO test_runs_v2
          (suite_id, suite_name, status, pass_count, fail_count, skip_count, start_time, end_time, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertResult = db.prepare(`
        INSERT INTO test_run_results (run_id, test_case_id, test_case_title, result, notes, failed_at, github_issue_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const passCount = 1;
      const failCount = 1;
      const skipCount = cases.length >= 3 ? 1 : 0;
      const seedRun = insertRun.run(
        1, 'Login Smoke Tests', 'completed', passCount, failCount, skipCount,
        '2026-06-15 09:00:00', '2026-06-15 09:12:34', 'anonymous'
      );
      const runId = seedRun.lastInsertRowid;
      insertResult.run(runId, cases[0].id, cases[0].title, 'passed', null, null, null);
      insertResult.run(runId, cases[1].id, cases[1].title, 'failed',
        'Error message does not appear after a failed login attempt.',
        '2026-06-15 09:08:22',
        'https://github.com/ievinsjanis/bootcamp-app/issues/3'
      );
      if (cases[2]) {
        insertResult.run(runId, cases[2].id, cases[2].title, 'skipped',
          'Blocked by authentication issue — revisit after bug #1 is resolved.',
          null, null
        );
      }
    }
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id        INTEGER NOT NULL,
    suite_name    TEXT    NOT NULL,
    run_date      TEXT    NOT NULL,
    total_count   INTEGER NOT NULL DEFAULT 0,
    passed_count  INTEGER NOT NULL DEFAULT 0,
    failed_count  INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    results       TEXT    NOT NULL DEFAULT '[]',
    generated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

const reportCount = db.prepare('SELECT COUNT(*) as count FROM reports').get();
if (reportCount.count === 0) {
  const seedRun = db.prepare(
    "SELECT * FROM test_runs_v2 WHERE status = 'completed' ORDER BY id ASC LIMIT 1"
  ).get();
  if (seedRun) {
    const seedResults = db.prepare(`
      SELECT trr.*, tc.severity, tc.expected_result
      FROM test_run_results trr
      LEFT JOIN test_cases tc ON tc.id = trr.test_case_id
      WHERE trr.run_id = ?
      ORDER BY trr.id ASC
    `).all(seedRun.id);
    db.prepare(`
      INSERT INTO reports
        (run_id, suite_name, run_date, total_count, passed_count, failed_count, skipped_count, results)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      seedRun.id,
      seedRun.suite_name,
      seedRun.start_time,
      seedResults.length,
      seedResults.filter(r => r.result === 'passed').length,
      seedResults.filter(r => r.result === 'failed').length,
      seedResults.filter(r => r.result === 'skipped').length,
      JSON.stringify(seedResults)
    );
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY DEFAULT 1,
    theme TEXT NOT NULL DEFAULT 'system' CHECK(theme IN ('light','dark','system')),
    default_severity TEXT NOT NULL DEFAULT 'Minor' CHECK(default_severity IN ('Critical','Major','Minor','Trivial')),
    default_page_size INTEGER NOT NULL DEFAULT 20 CHECK(default_page_size IN (10,20,50,100)),
    timezone TEXT NOT NULL DEFAULT 'UTC',
    auto_generate_report INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const prefCount = db.prepare('SELECT COUNT(*) as count FROM user_preferences').get();
if (prefCount.count === 0) {
  db.prepare(
    `INSERT INTO user_preferences (id, theme, default_severity, default_page_size, timezone, auto_generate_report)
     VALUES (1, 'system', 'Minor', 20, 'UTC', 1)`
  ).run();
}

db.exec(`
  CREATE TABLE IF NOT EXISTS flake_hypotheses (
    test_case_id      INTEGER PRIMARY KEY,
    hypothesis        TEXT,
    flakiness_score   REAL,
    eligible_runs     INTEGER,
    fail_count        INTEGER,
    transitions       INTEGER,
    last_alert_run_id INTEGER,
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Seed historical pass/fail data the first time the flake_hypotheses table is created
// and the test_run_results table has fewer than 10 rows (i.e. only the initial seed).
const seedRunCount = db.prepare("SELECT COUNT(*) as cnt FROM test_runs_v2 WHERE created_by = 'seed'").get().cnt;
if (seedRunCount === 0) {
  const suite = db.prepare("SELECT id, name FROM suites WHERE name LIKE '%Login%' LIMIT 1").get();
  const suiteId   = suite ? suite.id   : 1;
  const suiteName = suite ? suite.name : 'Login Smoke Tests';

  // Resolve test cases at runtime — never hardcode IDs
  const getTc = db.prepare('SELECT id, title FROM test_cases WHERE title LIKE ? COLLATE NOCASE LIMIT 1');
  const specs = [
    { key: 'tc2',  like: '%invalid password%',    matrix: ['failed','passed','failed','passed','failed'] },
    { key: 'tc8',  like: '%Valid login%',          matrix: ['passed','failed','passed','failed','passed'] },
    { key: 'tc3',  like: '%rejects empty fields%', matrix: ['failed','passed','passed','failed','passed'] },
    { key: 'tc9',  like: '%valid credentials%',    matrix: ['passed','passed','failed','passed','failed'] },
    { key: 'tc10', like: '%wrong password%',       matrix: ['failed','failed','passed','failed','passed'] },
    { key: 'tc11', like: '%blocks empty%',         matrix: ['passed','passed','passed','passed','failed'] },
    { key: 'tc4',  like: '%Update display name%',  matrix: ['passed','passed','passed','passed','passed'] },
    { key: 'tc5',  like: '%Dashboard loads%',      matrix: ['failed','failed','failed','failed','failed'] },
  ];

  const tcs = {};
  for (const s of specs) {
    const row = getTc.get(s.like);
    if (row) tcs[s.key] = { id: row.id, title: row.title, matrix: s.matrix };
  }

  if (Object.keys(tcs).length > 0) {
    const runDates = [
      ['2026-06-10 09:00:00', '2026-06-10 09:15:00'],
      ['2026-06-11 09:00:00', '2026-06-11 09:12:00'],
      ['2026-06-12 09:00:00', '2026-06-12 09:18:00'],
      ['2026-06-13 09:00:00', '2026-06-13 09:11:00'],
      ['2026-06-14 09:00:00', '2026-06-14 09:16:00'],
    ];

    const insertRun = db.prepare(`
      INSERT INTO test_runs_v2
        (suite_id, suite_name, status, pass_count, fail_count, skip_count, start_time, end_time, created_by)
      VALUES (?, ?, 'completed', ?, ?, 0, ?, ?, 'seed')
    `);
    const insertResult = db.prepare(`
      INSERT INTO test_run_results
        (run_id, test_case_id, test_case_title, result, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      for (let ri = 0; ri < 5; ri++) {
        const [start, end] = runDates[ri];
        let pass = 0, fail = 0;
        for (const tc of Object.values(tcs)) {
          if (tc.matrix[ri] === 'passed') pass++;
          else if (tc.matrix[ri] === 'failed') fail++;
        }
        const run = insertRun.run(suiteId, suiteName, pass, fail, start, end);
        for (const tc of Object.values(tcs)) {
          insertResult.run(run.lastInsertRowid, tc.id, tc.title, tc.matrix[ri], start, start);
        }
      }
    })();
  }
}

module.exports = db;
