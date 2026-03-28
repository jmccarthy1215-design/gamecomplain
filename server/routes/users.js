const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All user-management routes require authentication and admin role
router.use(authenticate, requireAdmin);

const VALID_ROLES = ['user', 'developer', 'admin'];

// GET /api/users — list all users (admin only)
// Useful for finding user IDs before issuing role changes
router.get('/', async (req, res) => {
  try {
    const users = await User.find({})
      .select('username email displayName role isVerifiedDev associatedGame createdAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json(users);
  } catch (err) {
    console.error('GET /api/users error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/users/:id/role — change a user's role (admin only)
//
// Body: { role: 'user'|'developer'|'admin', associatedGame?: string }
//
// Security guarantees:
//   • Only admins can call this route (requireAdmin above)
//   • Admins cannot change their own role (prevents self-lockout / self-escalation)
//   • Role must be one of the allowed enum values
//   • isVerifiedDev is controlled entirely here, never by the user
router.patch('/:id/role', async (req, res) => {
  try {
    const { role, associatedGame } = req.body;

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        error: `role must be one of: ${VALID_ROLES.join(', ')}`
      });
    }

    // Self-demotion / self-escalation guard
    if (String(req.params.id) === String(req.user._id)) {
      return res.status(403).json({ error: 'Admins cannot change their own role.' });
    }

    const update = { role };

    if (role === 'developer') {
      // Promoting to developer: set verification flags
      update.isVerifiedDev = true;
      if (associatedGame !== undefined) {
        update.associatedGame = String(associatedGame).trim();
      }
    } else {
      // Demoting from developer: clear the dev-specific fields
      update.isVerifiedDev  = false;
      update.associatedGame = '';
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found.' });

    res.json(user.toPublic());
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(' ') });
    }
    console.error('PATCH /api/users/:id/role error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
