const express = require('express');
const router  = express.Router();
const Clip    = require('../models/Clip');
const { authenticate, requireAuth } = require('../middleware/auth');
const { censorText } = require('../utils/moderation');
const { checkSpam }  = require('../middleware/spam');

// Populate req.user for all clip routes (does not require login)
router.use(authenticate);

// Strip HTML tags to prevent XSS
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

// Convert a YouTube/Twitch watch URL into a safe embeddable URL
function toEmbedUrl(raw) {
  const url = raw.trim();

  // YouTube: https://youtu.be/ID or https://www.youtube.com/watch?v=ID
  const ytShort = url.match(/youtu\.be\/([\w-]+)/);
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}`;

  const ytLong = url.match(/youtube\.com\/watch\?.*v=([\w-]+)/);
  if (ytLong) return `https://www.youtube.com/embed/${ytLong[1]}`;

  // YouTube embed URLs already — pass through
  if (/youtube\.com\/embed\//.test(url)) return url;

  // Twitch clip: https://clips.twitch.tv/SLUG
  const twitchClip = url.match(/clips\.twitch\.tv\/([\w-]+)/);
  if (twitchClip) return `https://clips.twitch.tv/embed?clip=${twitchClip[1]}&parent=localhost`;

  // Twitch channel clip URL
  const twitchChan = url.match(/twitch\.tv\/\w+\/clip\/([\w-]+)/);
  if (twitchChan) return `https://clips.twitch.tv/embed?clip=${twitchChan[1]}&parent=localhost`;

  return null; // unsupported provider
}

// ── GET /api/clips ────────────────────────────────────────────
// Query: game, sort (newest|likes), range (today|week|month|all)
router.get('/', async (req, res) => {
  try {
    const { game, sort, range } = req.query;
    const filter = {};
    if (game) filter.game = game;

    if (range && range !== 'all') {
      const cutoff = new Date();
      if (range === 'today') cutoff.setDate(cutoff.getDate() - 1);
      if (range === 'week')  cutoff.setDate(cutoff.getDate() - 7);
      if (range === 'month') cutoff.setMonth(cutoff.getMonth() - 1);
      filter.createdAt = { $gte: cutoff };
    }

    const sortOrder = sort === 'likes' ? { likes: -1, createdAt: -1 } : { createdAt: -1 };
    const clips = await Clip.find(filter).sort(sortOrder).select('-userLikes');

    // Attach myLike flag
    const uid = req.user ? String(req.user._id) : null;
    const result = clips.map(c => {
      const obj = c.toObject();
      obj.myLike = uid
        ? c.userLikes.some(id => String(id) === uid)
        : false;
      return obj;
    });

    res.json(result);
  } catch (err) {
    console.error('GET /api/clips error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── POST /api/clips ───────────────────────────────────────────
router.post('/', requireAuth, checkSpam, async (req, res) => {
  try {
    const { title, description, game, videoUrl } = req.body;

    if (!title || !videoUrl) {
      return res.status(400).json({ error: 'Title and video URL are required.' });
    }

    const embedUrl = toEmbedUrl(sanitize(videoUrl));
    if (!embedUrl) {
      return res.status(400).json({ error: 'Only YouTube and Twitch clip URLs are supported.' });
    }

    const sanitizedTitle = censorText(sanitize(title)).sanitizedText;
    const sanitizedDesc  = censorText(sanitize(description || '')).sanitizedText;
    const sanitizedGame  = sanitize(game || '');

    if (!sanitizedTitle) {
      return res.status(400).json({ error: 'Title cannot be empty.' });
    }

    const clip = new Clip({
      title:       sanitizedTitle,
      description: sanitizedDesc,
      game:        sanitizedGame,
      videoUrl:    embedUrl,
      userId:      req.user._id,
      username:    req.user.displayName
    });

    const saved = await clip.save();
    res.status(201).json(saved);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(' ') });
    }
    console.error('POST /api/clips error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── PATCH /api/clips/:id/like ─────────────────────────────────
router.patch('/:id/like', requireAuth, async (req, res) => {
  try {
    const clip = await Clip.findById(req.params.id);
    if (!clip) return res.status(404).json({ error: 'Clip not found.' });

    const uid   = req.user._id;
    const liked = clip.userLikes.some(id => id.equals(uid));

    if (liked) {
      clip.userLikes.pull(uid);
      clip.likes = Math.max(0, clip.likes - 1);
    } else {
      clip.userLikes.push(uid);
      clip.likes += 1;
    }

    await clip.save();
    res.json({ likes: clip.likes, myLike: !liked });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid clip ID.' });
    console.error('PATCH /api/clips/:id/like error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── POST /api/clips/:id/comment ──────────────────────────────
router.post('/:id/comment', requireAuth, checkSpam, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment text is required.' });

    const sanitized = censorText(sanitize(text)).sanitizedText;
    if (!sanitized) return res.status(400).json({ error: 'Comment cannot be empty.' });
    if (sanitized.length > 500) return res.status(400).json({ error: 'Comment cannot exceed 500 characters.' });

    const clip = await Clip.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { text: sanitized, userId: req.user._id, username: req.user.displayName } } },
      { new: true, runValidators: true }
    );

    if (!clip) return res.status(404).json({ error: 'Clip not found.' });

    res.status(201).json(clip.comments[clip.comments.length - 1]);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid clip ID.' });
    console.error('POST /api/clips/:id/comment error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── DELETE /api/clips/:id ─────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const clip = await Clip.findById(req.params.id);
    if (!clip) return res.status(404).json({ error: 'Clip not found.' });

    const isAdmin = req.user.role === 'admin';
    const isOwner = clip.userId && clip.userId.equals(req.user._id);
    if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Not authorized.' });

    await clip.deleteOne();
    res.json({ message: 'Clip deleted.' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid clip ID.' });
    console.error('DELETE /api/clips/:id error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
