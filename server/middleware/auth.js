const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const COOKIE_NAME = 'gctoken';
const JWT_SECRET  = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in .env — authentication will not work.');
}

/**
 * authenticate (non-throwing)
 * Reads the JWT cookie and attaches the decoded user to req.user if valid.
 * If the token is missing/expired/invalid, req.user is left undefined.
 * Routes that need a user should call requireAuth after this.
 */
async function authenticate(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Fetch fresh user data so role changes take effect immediately
    const user = await User.findById(payload.sub).lean();
    if (user) {
      // Expose only safe fields downstream.
      // displayName falls back to username for legacy accounts.
      req.user = {
        _id:            user._id,
        email:          user.email          || null,
        displayName:    user.displayName    || user.username || 'Anonymous',
        username:       user.username       || null,   // kept for backward compat
        role:           user.role,
        isVerifiedDev:  user.isVerifiedDev,
        associatedGame: user.associatedGame
      };
    }
  } catch (_) {
    // Expired or tampered token — treat as anonymous
  }
  next();
}

/** Reject unauthenticated requests with 401 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  next();
}

/** Reject requests from non-verified developers with 403 */
function requireDeveloper(req, res, next) {
  if (!req.user || req.user.role !== 'developer' || !req.user.isVerifiedDev) {
    return res.status(403).json({ error: 'Verified developer access required.' });
  }
  next();
}

/** Reject requests from non-admins with 403 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

/** Sign a JWT for the given user ID */
function issueToken(userId) {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: '7d' });
}

/** Cookie options — httpOnly prevents JS access, sameSite prevents CSRF */
// Render injects RENDER=true automatically. sameSite:'none' + secure:true are required
// for cross-origin cookies (Vercel frontend → Render backend). In local dev neither is set.
const isProduction = process.env.RENDER === 'true';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: isProduction ? 'none' : 'strict',
  secure:   isProduction,
  maxAge:   7 * 24 * 60 * 60 * 1000  // 7 days
};

module.exports = { authenticate, requireAuth, requireDeveloper, requireAdmin, issueToken, COOKIE_NAME, COOKIE_OPTS };
