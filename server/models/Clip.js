const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  text: {
    type:      String,
    required:  [true, 'Comment text is required'],
    trim:      true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  username: { type: String, trim: true, default: 'Anonymous' },
  createdAt:{ type: Date, default: Date.now }
});

const clipSchema = new mongoose.Schema({
  title: {
    type:      String,
    required:  [true, 'Title is required'],
    trim:      true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type:      String,
    trim:      true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default:   ''
  },
  // YouTube or Twitch clip URL — embedded as iframe
  videoUrl: {
    type:     String,
    required: [true, 'A video URL is required'],
    trim:     true,
    maxlength:[500, 'URL is too long']
  },
  game: {
    type:    String,
    trim:    true,
    default: '',
    enum: {
      values: [
        '', 'Fortnite', 'Call of Duty', 'Minecraft', 'Valorant', 'Apex Legends',
        'League of Legends', 'Rocket League', 'Clash Royale', 'Counter-Strike 2',
        'Rainbow Six Siege', 'Other'
      ],
      message: 'Invalid game value.'
    }
  },
  // Author — stamped server-side
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  username: { type: String, trim: true, default: 'Anonymous' },

  likes: { type: Number, default: 0 },
  // Track who liked so one user can only like once
  userLikes: {
    type:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: []
  },

  comments: { type: [commentSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Clip', clipSchema);
