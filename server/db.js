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

module.exports = db;
