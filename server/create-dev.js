/**
 * create-dev.js
 * CLI script to promote a user to verified developer status.
 * Run from the project root:
 *
 *   node server/create-dev.js <username> <password> [associatedGame]
 *
 * If the user already exists, their role + isVerifiedDev will be updated.
 * Pass "-" as the password to skip changing the password for an existing user.
 *
 * Examples:
 *   node server/create-dev.js epicdev SecurePass1 Fortnite
 *   node server/create-dev.js existingUser - "Apex Legends"
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User     = require('./models/User');

async function main() {
  const [,, username, password, game] = process.argv;

  if (!username || !password) {
    console.error('Usage: node server/create-dev.js <username> <password> [associatedGame]');
    console.error('       Use "-" for password to skip changing it on an existing account.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  let user = await User.findOne({ username }).select('+passwordHash');

  if (user) {
    console.log(`Found existing user: "${username}"`);
    user.role          = 'developer';
    user.isVerifiedDev = true;
    if (game) user.associatedGame = game;
    if (password !== '-') {
      await user.setPassword(password);
      console.log('Password updated.');
    }
    await user.save();
    console.log(`\n✔ Upgraded "${username}" to verified developer.`);
  } else {
    if (password === '-') {
      console.error('Must provide a real password when creating a new account.');
      process.exit(1);
    }
    user = new User({
      username,
      role:           'developer',
      isVerifiedDev:  true,
      associatedGame: game || ''
    });
    await user.setPassword(password);
    await user.save();
    console.log(`\n✔ Created new verified developer account: "${username}"`);
  }

  console.log(`   role:           ${user.role}`);
  console.log(`   isVerifiedDev:  ${user.isVerifiedDev}`);
  console.log(`   associatedGame: "${user.associatedGame}"`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
