require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express      = require('express');
const mongoose     = require('mongoose');
const path         = require('path');
const cookieParser = require('cookie-parser');
const cors         = require('cors');

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

// CORS — allow requests from the Vercel frontend and custom domain
const corsOptions = {
  origin: [
    'https://gamecomplain.com',
    'https://www.gamecomplain.com',
    'https://gamecomplain.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight requests for all routes

// Parse incoming JSON bodies; limit size to prevent payload abuse
app.use(express.json({ limit: '10kb' }));

// Parse cookies (required for JWT session cookie)
app.use(cookieParser());

// Serve the static client files from /client
app.use(express.static(path.join(__dirname, '../client')));

// Mount API routers
app.use('/api/auth',       authRouter);
app.use('/api/complaints', complaintsRouter);
app.use('/api/users',      usersRouter);
app.use('/api/legal',      legalRouter);
app.use('/api/clips',      clipsRouter);

// Health check — always responds, even when the database is unavailable.
// Use GET /health on Render to confirm the process is alive and check DB state.
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

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
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Start the HTTP server immediately so /health is reachable even when MongoDB is down
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Connect to MongoDB — server continues running even if this fails
async function connectDB() {
  if (!process.env.MONGO_URI) {
    console.error('FATAL: MONGO_URI is not set — database features will not work.');
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully.');
  } catch (err) {
    console.error('MongoDB connection failed:');
    console.error('  Name   :', err.name);
    console.error('  Message:', err.message);
    if (err.message && err.message.toLowerCase().includes('authentication failed')) {
      console.error('  → Check your MongoDB username / password in the MONGO_URI env var.');
    }
    // Server stays up — /health returns db:"disconnected", API routes return 500
  }
}

connectDB();
