require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express    = require('express');
const mongoose   = require('mongoose');
const path       = require('path');
const cookieParser = require('cookie-parser');

const User = require('./models/User');

const complaintsRouter = require('./routes/complaints');
const authRouter       = require('./routes/auth');
const usersRouter      = require('./routes/users');
const legalRouter      = require('./routes/legal');
const clipsRouter      = require('./routes/clips');

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in .env — authentication will not work.');
}

const app  = express();
const PORT = process.env.PORT || 3000;

// Parse incoming JSON bodies; limit size to prevent payload abuse
app.use(express.json({ limit: '10kb' }));

// Parse cookies (required for JWT session cookie)
app.use(cookieParser());

// Serve the static frontend files from /frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Mount API routers
app.use('/api/auth',       authRouter);
app.use('/api/complaints', complaintsRouter);
app.use('/api/users',      usersRouter);
app.use('/api/legal',      legalRouter);
app.use('/api/clips',      clipsRouter);

// Express error handler — must have 4 params so Express recognises it as an error handler.
// Catches errors thrown by middleware (e.g. express.json() on a malformed body)
// and always replies with JSON so the frontend can parse the response safely.
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;
  console.error('Express error:', err.message);
  res.status(status).json({ error: err.message || 'Server error.' });
});

// Fallback: serve index.html for any unmatched route (single-page friendliness)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Connect to MongoDB, then start the server only on success
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');

    // Sync schema-defined indexes with the live collection.
    // This drops any stale non-sparse indexes (e.g. an old non-sparse unique index
    // on `username` created before sparse:true was added) and recreates them to match
    // the current schema. Without this, new registrations fail with a false E11000
    // duplicate key error on the username field instead of the email field.
    try {
      await User.syncIndexes();
      console.log('Indexes synced');
    } catch (indexErr) {
      console.error('Index sync error (non-fatal):', indexErr.message);
    }

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1); // Exit so the issue is visible immediately
  });
