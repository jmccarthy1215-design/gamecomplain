'use strict';

/**
 * server/middleware/spam.js
 * Anti-spam protection for complaint and clip posts.
 *
 * Checks performed:
 *  1. Rate limiting — max 5 posts per user per minute
 *  2. Duplicate detection — same content within 5 minutes is rejected
 *  3. Excessive links — more than 3 URLs in a post is rejected
 *  4. Repetition pattern — catches "aaaaaaa" or "abababab" spam strings
 */

// In-memory stores — reset on server restart (sufficient for a community app)
const postTimestamps = new Map(); // key -> [timestamp, ...]
const contentHashes  = new Map(); // key -> [{ hash, ts }, ...]

const RATE_WINDOW_MS = 60 * 1000;   // 1 minute
const RATE_LIMIT     = 5;           // max posts per window
const DUPE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// FNV-1a 32-bit hash — fast and good enough for duplicate detection
function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

// Evict entries older than the duplicate window to keep memory bounded
function pruneHashes(arr) {
  const cutoff = Date.now() - DUPE_WINDOW_MS;
  return arr.filter(e => e.ts > cutoff);
}

function pruneTimestamps(arr) {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  return arr.filter(t => t > cutoff);
}

/**
 * Express middleware.
 * Expects JSON body fields: title, description, text (any subset).
 * On violation: responds with 429 or 400 JSON error and calls nothing more.
 * On pass: calls next().
 */
function checkSpam(req, res, next) {
  // Identify by userId when logged in, otherwise by IP
  const key = req.user ? String(req.user._id) : (req.ip || 'anon');
  const now  = Date.now();

  // ── 1. Rate limiting ─────────────────────────────────────
  const times   = pruneTimestamps(postTimestamps.get(key) || []);
  if (times.length >= RATE_LIMIT) {
    return res.status(429).json({
      error: 'You are posting too quickly. Please wait a moment before trying again.'
    });
  }
  times.push(now);
  postTimestamps.set(key, times);

  // ── 2. Excessive links ───────────────────────────────────
  const { title = '', description = '', text = '' } = req.body;
  const combined  = `${title} ${description} ${text}`;
  const urlCount  = (combined.match(/https?:\/\//gi) || []).length;
  if (urlCount > 3) {
    return res.status(400).json({ error: 'Your post contains too many links.' });
  }

  // ── 3. Repetition pattern ────────────────────────────────
  const normalized = combined.toLowerCase().replace(/\s+/g, ' ').trim();
  if (normalized.length > 20 && /(.{3,})\1{3,}/.test(normalized)) {
    return res.status(400).json({ error: 'Spam pattern detected. Please write a real complaint.' });
  }

  // ── 4. Duplicate detection ───────────────────────────────
  if (normalized.length > 10) {
    const hash    = hashString(normalized);
    const hashes  = pruneHashes(contentHashes.get(key) || []);
    if (hashes.some(e => e.hash === hash)) {
      return res.status(400).json({
        error: 'Duplicate post detected. You already submitted this recently.'
      });
    }
    hashes.push({ hash, ts: now });
    contentHashes.set(key, hashes);
  }

  next();
}

module.exports = { checkSpam };
