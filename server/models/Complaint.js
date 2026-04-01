const mongoose = require('mongoose');

// Reply subdocument — embedded directly on the complaint
const replySchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Reply text is required'],
    trim: true,
    maxlength: [500, 'Reply cannot exceed 500 characters']
  },
  // Author info — stamped server-side from req.user, never from the client
  userId: {
    type:    mongoose.Schema.Types.ObjectId,
    ref:     'User',
    default: null
  },
  username: {
    type:    String,
    trim:    true,
    default: 'Anonymous'
  },
  // Set by the server when a verified developer posts a reply — never from the client
  developerTag: {
    type:    String,
    trim:    true,
    default: ''
  },
  // Threading — null means top-level reply; set to a sibling reply's _id for a nested reply
  parentReplyId: {
    type:    mongoose.Schema.Types.ObjectId,
    default: null
  },
  likes: {
    type:    Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: [
        // ── New structured categories ──────────────────────────
        'Weapons',
        'Characters / Agents',
        'Mechanics',
        'Maps',
        'Bugs / Glitches',
        'Matchmaking Issues',
        'Performance Issues',
        'Cheating / Exploits',
        'Updates / Patches',
        'Ranked / Competitive',
        'Skins / Cosmetics',
        // ── Legacy categories (kept for backward compatibility) ─
        'Game Bugs',
        'Broken Characters',
        'Stupid Mechanics',
        'Website Feedback',
        'Other'
      ],
      message: 'Invalid category value.'
    }
  },
  game: {
    type: String,
    trim: true,
    default: '',
    enum: {
      values: [
        '',
        // Core titles
        'Fortnite', 'Minecraft', 'Valorant', 'Apex Legends',
        'League of Legends', 'Rocket League', 'Clash Royale',
        'Counter-Strike 2', 'Rainbow Six Siege',
        // Call of Duty family
        'Call of Duty',
        'Call of Duty: Warzone',
        'Call of Duty: Black Ops 6',
        'Call of Duty: Black Ops Cold War',
        'Call of Duty: Modern Warfare II',
        // New additions
        'H1Z1', 'DayZ', 'Clash of Clans',
        'Other'
      ],
      message: 'Invalid game value.'
    }
  },
  // Optional: specific item being complained about (weapon, agent, map, etc.)
  item: {
    type:    String,
    trim:    true,
    default: '',
    maxlength: [100, 'Item name cannot exceed 100 characters']
  },
  // Author info — set by server from req.user, never accepted from client
  username: {
    type:    String,
    trim:    true,
    default: 'Anonymous'
  },
  userId: {
    type:    mongoose.Schema.Types.ObjectId,
    ref:     'User',
    default: null
  },
  isDevPost: {
    type: Boolean,
    default: false
  },
  // Username of the verified developer who posted — set by server, never client
  developerTag: {
    type:    String,
    trim:    true,
    default: ''
  },
  votes: {
    type: Number,
    default: 0
  },
  // Per-user vote tracking — used to prevent duplicate votes and support undo
  userVotes: {
    type: [{
      userId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true
      },
      type: {
        type:     String,
        enum:     ['up', 'down'],
        required: true
      }
    }],
    default: []
  },
  // Embedded replies array — keeps all data in one document fetch
  replies: {
    type: [replySchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Complaint', complaintSchema);
