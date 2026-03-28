const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // ── Legacy field — kept for backward compatibility ──────────────
  // Existing accounts have a username; new accounts use email + displayName.
  // NOTE: if migrating a live DB, drop the old non-sparse unique index on
  // `username` and allow Mongoose to recreate it as sparse.
  username: {
    type:      String,
    trim:      true,
    unique:    true,
    sparse:    true,   // null/missing values do not participate in uniqueness check
    minlength: [3,  'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match:     [/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, _ and -']
  },

  // ── Primary login credential for new accounts ───────────────────
  email: {
    type:      String,
    lowercase: true,
    trim:      true,
    unique:    true,
    sparse:    true,   // null/missing values do not participate in uniqueness check
    match:     [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
  },

  // ── Public identity shown on posts / replies ────────────────────
  // Falls back to `username` for legacy accounts that pre-date this field.
  displayName: {
    type:      String,
    trim:      true,
    maxlength: [50, 'Display name cannot exceed 50 characters']
  },

  passwordHash: {
    type:     String,
    required: true,
    select:   false  // never returned in queries unless explicitly requested
  },

  // ── Roles ─────────────────────────────────────────────────────
  // Users CANNOT set their own role — only backend/DB admin can.
  role: {
    type:    String,
    enum:    ['user', 'developer', 'admin'],
    default: 'user'
  },

  // ── Developer identity ─────────────────────────────────────────
  // Only backend/DB admin can set isVerifiedDev = true.
  isVerifiedDev: {
    type:    Boolean,
    default: false
  },
  associatedGame: {
    type:    String,
    trim:    true,
    default: ''
  },

  // ── Terms acceptance ───────────────────────────────────────────
  // Must be true before an account can be created — enforced in auth route.
  acceptedTerms: {
    type:    Boolean,
    default: false
  },
  acceptedTermsAt: {
    type:    Date,
    default: null
  },

  createdAt: {
    type:    Date,
    default: Date.now
  }
});

// Hash a plaintext password and store it — never store plain text
userSchema.methods.setPassword = async function (plaintext) {
  this.passwordHash = await bcrypt.hash(plaintext, 12);
};

// Returns true if the plaintext matches the stored hash
userSchema.methods.verifyPassword = async function (plaintext) {
  return bcrypt.compare(plaintext, this.passwordHash);
};

// Effective public display name: displayName field, then username fallback for legacy accounts
userSchema.methods.getDisplayName = function () {
  return this.displayName || this.username || 'Anonymous';
};

// Safe public-facing representation — passwordHash is always excluded
userSchema.methods.toPublic = function () {
  return {
    _id:            this._id,
    email:          this.email   || null,
    displayName:    this.getDisplayName(),
    username:       this.username || null,   // retained for backward compat
    role:           this.role,
    isVerifiedDev:  this.isVerifiedDev,
    associatedGame: this.associatedGame
  };
};

module.exports = mongoose.model('User', userSchema);
