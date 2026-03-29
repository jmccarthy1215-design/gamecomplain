const express = require('express');
const https   = require('https');
const router  = express.Router();
const User    = require('../models/User');
const { authenticate, requireAuth, issueToken, COOKIE_NAME, COOKIE_OPTS } = require('../middleware/auth');
const { validateDisplayName } = require('../utils/moderation');

// POST /api/auth/register — create a new account and immediately log in
router.post('/register', async (req, res) => {
  try {
    const { email, displayName, password, acceptedTerms } = req.body;

    if (!email || !displayName || !password) {
      return res.status(400).json({ error: 'Email, display name, and password are required.' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Basic email format check (schema regex enforces it too)
    const emailNorm = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const displayNameTrim = displayName.trim();
    if (!displayNameTrim || displayNameTrim.length > 50) {
      return res.status(400).json({ error: 'Display name must be between 1 and 50 characters.' });
    }

    // Moderation: reject display names containing offensive language
    const modResult = validateDisplayName(displayNameTrim);
    if (modResult.status === 'REJECTED') {
      return res.status(400).json({ error: modResult.reason });
    }

    // Server-side enforcement — cannot be bypassed by omitting the frontend checkbox
    if (acceptedTerms !== true) {
      return res.status(400).json({ error: 'You must accept the Terms of Service and Privacy Policy to create an account.' });
    }

    const existing = await User.findOne({ email: emailNorm });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const user = new User({
      email:           emailNorm,
      displayName:     displayNameTrim,
      acceptedTerms:   true,
      acceptedTermsAt: new Date()
    });
    await user.setPassword(password);
    await user.save();

    const token = issueToken(user._id);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    res.status(201).json(user.toPublic());
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(' ') });
    }
    // Duplicate key (race condition — email uniqueness)
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('POST /api/auth/register error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// POST /api/auth/login — authenticate by email and issue a session cookie
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const emailNorm = email.trim().toLowerCase();

    // select('+passwordHash') because it's excluded by default
    const user = await User.findOne({ email: emailNorm }).select('+passwordHash');
    if (!user || !(await user.verifyPassword(password))) {
      // Intentionally vague — don't reveal which field was wrong
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = issueToken(user._id);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    res.json(user.toPublic());
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// POST /api/auth/logout — clear the session cookie
router.post('/logout', (req, res) => {
  const isProduction = process.env.RENDER === 'true';
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'strict',
    secure:   isProduction
  });
  res.json({ message: 'Logged out.' });
});

// GET /api/auth/me — return the current user if authenticated
router.get('/me', authenticate, requireAuth, (req, res) => {
  res.json(req.user);
});

// POST /api/auth/google — verify a Google ID token from the client and issue a session
// The client uses Google Identity Services (GIS) and sends the credential string here.
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ error: 'Google credential is required.' });
    }

    // Verify the ID token by calling Google's tokeninfo endpoint
    const tokenInfo = await new Promise((resolve, reject) => {
      const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
      https.get(url, (response) => {
        let data = '';
        response.on('data', chunk => { data += chunk; });
        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error_description || !parsed.email) {
              reject(new Error(parsed.error_description || 'Invalid Google token'));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject(new Error('Failed to parse Google response'));
          }
        });
      }).on('error', reject);
    });

    // Verify the token was issued for our app (optional but recommended)
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && tokenInfo.aud !== clientId) {
      return res.status(401).json({ error: 'Token audience mismatch.' });
    }

    const emailNorm   = tokenInfo.email.trim().toLowerCase();
    const googleName  = tokenInfo.name || tokenInfo.email.split('@')[0];

    // Find existing user or create a new one (no password for Google accounts)
    let user = await User.findOne({ email: emailNorm });

    if (!user) {
      // Auto-generate a display name from Google profile
      let displayName = googleName.slice(0, 50).trim();
      // Strip problematic characters
      displayName = displayName.replace(/<[^>]*>/g, '').trim() || 'Player';

      user = new User({
        email:           emailNorm,
        displayName,
        acceptedTerms:   true,   // Google sign-in implies ToS acceptance
        acceptedTermsAt: new Date()
      });
      // Google users have no local password — set a long random hash so
      // the required passwordHash field is satisfied without being usable
      await user.setPassword(require('crypto').randomBytes(32).toString('hex'));
      await user.save();
    }

    const token = issueToken(user._id);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    res.json(user.toPublic());
  } catch (err) {
    console.error('POST /api/auth/google error:', err.message);
    res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
  }
});

module.exports = router;
