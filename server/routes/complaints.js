const express    = require('express');
const router     = express.Router();
const Complaint  = require('../models/Complaint');
const { authenticate, requireAuth, requireAdmin } = require('../middleware/auth');
const { censorText } = require('../utils/moderation');
const { checkSpam }  = require('../middleware/spam');

// Run authenticate on every complaints route so req.user is populated for logged-in users
router.use(authenticate);

// Strips HTML tags and trims whitespace to prevent stored XSS
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

// POST /api/complaints — create a new complaint
router.post('/', checkSpam, async (req, res) => {
  try {
    // Strip fields that only the server may set — clients cannot forge dev status
    const { title, description, category, game, item } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Title, description, and category are required.' });
    }

    // Strip HTML first, then censor offensive language
    const sanitizedTitle       = censorText(sanitize(title)).sanitizedText;
    const sanitizedDescription = censorText(sanitize(description)).sanitizedText;
    const sanitizedCategory    = sanitize(category);
    const sanitizedGame        = sanitize(game || '');
    const sanitizedItem        = sanitize(item || '');

    if (!sanitizedTitle || !sanitizedDescription || !sanitizedCategory) {
      return res.status(400).json({ error: 'Fields cannot be empty.' });
    }

    // Author info — stamped server-side, never accepted from client
    const username = req.user ? req.user.displayName : 'Anonymous';
    const userId   = req.user ? req.user._id         : null;

    // Auto-set developer fields when a verified dev is the poster
    const isDevPost    = !!(req.user && req.user.isVerifiedDev);
    const developerTag = isDevPost ? req.user.displayName : '';

    const complaint = new Complaint({
      title:       sanitizedTitle,
      description: sanitizedDescription,
      category:    sanitizedCategory,
      game:        sanitizedGame,
      item:        sanitizedItem,
      username,
      userId,
      isDevPost,
      developerTag
    });

    const saved = await complaint.save();
    res.status(201).json(saved);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(' ') });
    }
    console.error('POST /api/complaints error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// GET /api/complaints — fetch complaints with optional filtering
// Query params: game, category, range (today|week|month|all), sort (votes|newest), dev (true), userId
router.get('/', async (req, res) => {
  try {
    const { game, category, item, range, sort, dev, userId } = req.query;
    const filter = {};

    if (game)            filter.game     = game;
    if (category)        filter.category = category;
    if (item)            filter.item     = new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (dev === 'true')  filter.isDevPost = true;
    if (userId)          filter.userId   = userId;

    if (range && range !== 'all') {
      const cutoff = new Date();
      if (range === 'today') cutoff.setDate(cutoff.getDate() - 1);
      if (range === 'week')  cutoff.setDate(cutoff.getDate() - 7);
      if (range === 'month') cutoff.setMonth(cutoff.getMonth() - 1);
      filter.createdAt = { $gte: cutoff };
    }

    const sortOrder = sort === 'newest'
      ? { createdAt: -1 }
      : { votes: -1, createdAt: -1 };

    const complaints = await Complaint.find(filter).sort(sortOrder);

    // Attach myVote per complaint for the requesting user, then strip userVotes
    const currentUserId = req.user ? String(req.user._id) : null;
    const result = complaints.map(c => {
      const obj = c.toObject();
      if (currentUserId) {
        const entry = obj.userVotes.find(v => String(v.userId) === currentUserId);
        obj.myVote = entry ? entry.type : null;
      } else {
        obj.myVote = null;
      }
      delete obj.userVotes;
      return obj;
    });

    res.json(result);
  } catch (err) {
    console.error('GET /api/complaints error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// PATCH /api/complaints/:id/vote — cast, switch, or undo a vote (auth required)
router.patch('/:id/vote', requireAuth, async (req, res) => {
  try {
    const { type } = req.body;
    if (type !== 'up' && type !== 'down') {
      return res.status(400).json({ error: 'Vote type must be "up" or "down".' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    const existing = complaint.userVotes.find(v => v.userId.equals(req.user._id));
    let myVote;

    if (existing && existing.type === type) {
      // Same vote again — undo it
      complaint.votes += type === 'up' ? -1 : 1;
      complaint.userVotes.pull(existing._id);
      myVote = null;
    } else if (existing) {
      // Switch vote direction
      complaint.votes += type === 'up' ? 2 : -2;
      existing.type = type;
      myVote = type;
    } else {
      // New vote
      complaint.votes += type === 'up' ? 1 : -1;
      complaint.userVotes.push({ userId: req.user._id, type });
      myVote = type;
    }

    await complaint.save();
    res.json({ votes: complaint.votes, myVote });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid complaint ID.' });
    }
    console.error('PATCH /api/complaints/:id/vote error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// POST /api/complaints/:id/reply — add a reply to an existing complaint
router.post('/:id/reply', checkSpam, async (req, res) => {
  try {
    const { text, parentReplyId } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Reply text is required.' });
    }

    // Strip HTML first, then censor offensive language
    const sanitizedText = censorText(sanitize(text)).sanitizedText;

    if (!sanitizedText) {
      return res.status(400).json({ error: 'Reply cannot be empty.' });
    }

    if (sanitizedText.length > 500) {
      return res.status(400).json({ error: 'Reply cannot exceed 500 characters.' });
    }

    // Author info — stamped server-side, never accepted from client
    const replyUserId   = req.user ? req.user._id          : null;
    const replyUsername = req.user ? req.user.displayName  : 'Anonymous';
    const developerTag  = (req.user && req.user.isVerifiedDev) ? req.user.displayName : '';

    // Only allow parentReplyId if it's a valid string (validate it's an existing reply below)
    const replyDoc = {
      text: sanitizedText,
      userId: replyUserId,
      username: replyUsername,
      developerTag,
      parentReplyId: parentReplyId || null
    };

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { $push: { replies: replyDoc } },
      { new: true, runValidators: true }
    );

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    const newReply = complaint.replies[complaint.replies.length - 1];
    res.status(201).json(newReply);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid complaint ID.' });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(' ') });
    }
    console.error('POST /api/complaints/:id/reply error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// DELETE /api/complaints/:id/replies/:replyId — remove a reply (owner or admin)
router.delete('/:id/replies/:replyId', requireAuth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    const reply = complaint.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ error: 'Reply not found.' });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = reply.userId && reply.userId.equals(req.user._id);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    complaint.replies.pull(req.params.replyId);
    await complaint.save();
    res.json({ message: 'Reply deleted.' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid ID.' });
    }
    console.error('DELETE /api/complaints/:id/replies/:replyId error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// DELETE /api/complaints/:id — permanently remove a complaint (owner or admin)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = complaint.userId && complaint.userId.equals(req.user._id);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    await complaint.deleteOne();
    res.json({ message: 'Complaint deleted.' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid complaint ID.' });
    }
    console.error('DELETE /api/complaints/:id error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;
