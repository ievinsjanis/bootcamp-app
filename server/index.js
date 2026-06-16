const express = require('express');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the server!' });
});

app.use('/api/test-cases', require('./routes/test-cases'));
app.use('/api/suites',     require('./routes/suites'));
app.use('/api/bugs',       require('./routes/bugs'));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
