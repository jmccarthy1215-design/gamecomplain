const express  = require('express');
const router   = express.Router();
const Tip      = require('../models/Tip');
const { authenticate, requireAuth } = require('../middleware/auth');
const { censorText }                = require('../utils/moderation');
const { checkSpam }                 = require('../middleware/spam');

// Populate req.user on every tips route for authenticated users
router.use(authenticate);

// Strips HTML tags to prevent stored XSS
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

// POST /api/tips — create a new tip
router.post('/', checkSpam, async (req, res) => {
  try {
    const { title, description, category, game, item } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Title, content, and category are required.' });
    }

    const sanitizedTitle       = censorText(sanitize(title)).sanitizedText;
    const sanitizedDescription = censorText(sanitize(description)).sanitizedText;
    const sanitizedCategory    = sanitize(category);
    const sanitizedGame        = sanitize(game || '');
    const sanitizedItem        = sanitize(item || '');

    if (!sanitizedTitle || !sanitizedDescription || !sanitizedCategory) {
      return res.status(400).json({ error: 'Fields cannot be empty.' });
    }

    const username     = req.user ? req.user.displayName : 'Anonymous';
    const userId       = req.user ? req.user._id         : null;
    const isDevPost    = !!(req.user && req.user.isVerifiedDev);
    const developerTag = isDevPost ? req.user.displayName : '';

    const tip = new Tip({
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

    const saved = await tip.save();
    res.status(201).json(saved);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(' ') });
    }
    console.error('POST /api/tips error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// GET /api/tips — fetch tips with optional filtering and keyword search
// Query params: game, category, item, range (today|week|month|all), sort (votes|newest),
//               dev (true), userId, search (keyword match on title + description)
router.get('/', async (req, res) => {
  try {
    const { game, category, item, range, sort, dev, userId, search } = req.query;
    const filter = {};

    if (game)           filter.game     = game;
    if (category)       filter.category = category;
    if (item)           filter.item     = new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (dev === 'true') filter.isDevPost = true;
    if (userId)         filter.userId   = userId;

    // Keyword search — matches title, description, or item field (case-insensitive)
    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'i');
      filter.$or = [{ title: re }, { description: re }, { item: re }];
    }

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

    const tips = await Tip.find(filter).sort(sortOrder);

    // Attach per-user vote state, strip raw userVotes array from response
    const currentUserId = req.user ? String(req.user._id) : null;
    const result = tips.map(t => {
      const obj = t.toObject();
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
    console.error('GET /api/tips error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// PATCH /api/tips/:id/vote — cast, switch, or undo a vote (auth required)
router.patch('/:id/vote', requireAuth, async (req, res) => {
  try {
    const { type } = req.body;
    if (type !== 'up' && type !== 'down') {
      return res.status(400).json({ error: 'Vote type must be "up" or "down".' });
    }

    const tip = await Tip.findById(req.params.id);
    if (!tip) return res.status(404).json({ error: 'Tip not found.' });

    const existing = tip.userVotes.find(v => v.userId.equals(req.user._id));
    let myVote;

    if (existing && existing.type === type) {
      tip.votes += type === 'up' ? -1 : 1;
      tip.userVotes.pull(existing._id);
      myVote = null;
    } else if (existing) {
      tip.votes += type === 'up' ? 2 : -2;
      existing.type = type;
      myVote = type;
    } else {
      tip.votes += type === 'up' ? 1 : -1;
      tip.userVotes.push({ userId: req.user._id, type });
      myVote = type;
    }

    await tip.save();
    res.json({ votes: tip.votes, myVote });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid tip ID.' });
    console.error('PATCH /api/tips/:id/vote error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// POST /api/tips/:id/reply — add a reply to a tip
router.post('/:id/reply', checkSpam, async (req, res) => {
  try {
    const { text, parentReplyId } = req.body;
    if (!text) return res.status(400).json({ error: 'Reply text is required.' });

    const sanitizedText = censorText(sanitize(text)).sanitizedText;
    if (!sanitizedText)            return res.status(400).json({ error: 'Reply cannot be empty.' });
    if (sanitizedText.length > 500) return res.status(400).json({ error: 'Reply cannot exceed 500 characters.' });

    const replyUserId   = req.user ? req.user._id         : null;
    const replyUsername = req.user ? req.user.displayName : 'Anonymous';
    const developerTag  = (req.user && req.user.isVerifiedDev) ? req.user.displayName : '';

    const replyDoc = {
      text:          sanitizedText,
      userId:        replyUserId,
      username:      replyUsername,
      developerTag,
      parentReplyId: parentReplyId || null
    };

    const tip = await Tip.findByIdAndUpdate(
      req.params.id,
      { $push: { replies: replyDoc } },
      { new: true, runValidators: true }
    );
    if (!tip) return res.status(404).json({ error: 'Tip not found.' });

    res.status(201).json(tip.replies[tip.replies.length - 1]);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid tip ID.' });
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(' ') });
    }
    console.error('POST /api/tips/:id/reply error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// DELETE /api/tips/:id/replies/:replyId — remove a reply (owner or admin only)
router.delete('/:id/replies/:replyId', requireAuth, async (req, res) => {
  try {
    const tip = await Tip.findById(req.params.id);
    if (!tip) return res.status(404).json({ error: 'Tip not found.' });

    const reply = tip.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ error: 'Reply not found.' });

    const isAdmin = req.user.role === 'admin';
    const isOwner = reply.userId && reply.userId.equals(req.user._id);
    if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Not authorized.' });

    tip.replies.pull(req.params.replyId);
    await tip.save();
    res.json({ message: 'Reply deleted.' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid ID.' });
    console.error('DELETE /api/tips/:id/replies/:replyId error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// PATCH /api/tips/:id/replies/:replyId/like — increment like count on a reply
router.patch('/:id/replies/:replyId/like', async (req, res) => {
  try {
    const tip = await Tip.findById(req.params.id);
    if (!tip) return res.status(404).json({ error: 'Tip not found.' });

    const reply = tip.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ error: 'Reply not found.' });

    reply.likes = (reply.likes || 0) + 1;
    await tip.save();
    res.json({ likes: reply.likes });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid ID.' });
    console.error('PATCH /api/tips/:id/replies/:replyId/like error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// DELETE /api/tips/:id — permanently remove a tip (owner or admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const tip = await Tip.findById(req.params.id);
    if (!tip) return res.status(404).json({ error: 'Tip not found.' });

    const isAdmin = req.user.role === 'admin';
    const isOwner = tip.userId && tip.userId.equals(req.user._id);
    if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Not authorized.' });

    await tip.deleteOne();
    res.json({ message: 'Tip deleted.' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid tip ID.' });
    console.error('DELETE /api/tips/:id error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;
