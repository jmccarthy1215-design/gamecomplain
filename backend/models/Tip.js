const mongoose = require('mongoose');

// Identical reply structure to Complaint — keep in sync if reply fields ever change
const replySchema = new mongoose.Schema({
  text: {
    type:      String,
    required:  [true, 'Reply text is required'],
    trim:      true,
    maxlength: [500, 'Reply cannot exceed 500 characters']
  },
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  username:      { type: String, trim: true, default: 'Anonymous' },
  developerTag:  { type: String, trim: true, default: '' },
  likes:         { type: Number, default: 0 },
  parentReplyId: { type: mongoose.Schema.Types.ObjectId, default: null },
  createdAt:     { type: Date, default: Date.now }
});

const tipSchema = new mongoose.Schema({
  title: {
    type:      String,
    required:  [true, 'Title is required'],
    trim:      true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  // Named 'description' (not 'body') so the spam middleware covers it automatically
  description: {
    type:      String,
    required:  [true, 'Tip content is required'],
    trim:      true,
    maxlength: [1000, 'Tip content cannot exceed 1000 characters']
  },
  category: {
    type:     String,
    required: [true, 'Category is required'],
    enum: {
      values:  ['Strategy', 'Weapon Tip', 'Character Guide', 'Map Knowledge', 'Bug Workaround', 'Settings', 'General'],
      message: 'Invalid category value.'
    }
  },
  game: {
    type:    String,
    trim:    true,
    default: '',
    enum: {
      values: [
        '',
        'Fortnite', 'Minecraft', 'Valorant', 'Apex Legends',
        'League of Legends', 'Rocket League', 'Clash Royale',
        'Counter-Strike 2', 'Rainbow Six Siege',
        'Call of Duty', 'Call of Duty: Warzone', 'Call of Duty: Black Ops 6',
        'Call of Duty: Black Ops Cold War', 'Call of Duty: Modern Warfare II',
        'H1Z1', 'DayZ', 'Clash of Clans', 'Other'
      ],
      message: 'Invalid game value.'
    }
  },
  item: {
    type:      String,
    trim:      true,
    default:   '',
    maxlength: [100, 'Item name cannot exceed 100 characters']
  },
  username:     { type: String, trim: true, default: 'Anonymous' },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDevPost:    { type: Boolean, default: false },
  developerTag: { type: String, trim: true, default: '' },
  votes:        { type: Number, default: 0 },
  userVotes: {
    type: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      type:   { type: String, enum: ['up', 'down'], required: true }
    }],
    default: []
  },
  replies:   { type: [replySchema], default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tip', tipSchema);
