const express = require('express');
const fs      = require('fs');
const path    = require('path');

// Load .env from project root so GITHUB_TOKEN is available for API calls
try {
  const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  for (const line of env.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq  = t.indexOf('=');
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch {}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the server!' });
});

app.use('/api/search',     require('./routes/search'));
app.use('/api/settings',   require('./routes/settings'));
app.use('/api/dashboard',  require('./routes/dashboard'));
app.use('/api/reports',    require('./routes/reports'));
app.use('/api/test-cases/import', require('./routes/test-case-import'));
app.use('/api/test-cases',        require('./routes/test-cases'));
app.use('/api/suites',     require('./routes/suites'));
app.use('/api/bugs',       require('./routes/bugs'));
app.use('/api/test-runs',  require('./routes/test-runs'));

// Production: serve the Vite build and let React Router handle all non-API paths.
// RENDER env var is set automatically by Render on every deployment.
if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
  const distPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*$/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
