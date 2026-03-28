/**
 * create-admin.js
 * Promote an existing user to admin, or create a fresh admin account.
 * Run from the project root:
 *
 *   node server/create-admin.js <username> <password>
 *
 * If the account already exists, its role is updated to "admin".
 * Pass "-" as the password to skip changing it for an existing account.
 *
 * IMPORTANT: Never create admin accounts via the web UI or signup flow.
 * This script is the ONLY safe way to grant admin privileges.
 *
 * To manually promote via MongoDB shell / Atlas UI instead:
 *   db.users.updateOne({ username: "yourname" }, { $set: { role: "admin" } })
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User     = require('./models/User');

async function main() {
  const [,, username, password] = process.argv;

  if (!username || !password) {
    console.error('Usage: node server/create-admin.js <username> <password>');
    console.error('       Use "-" for password to skip changing it on an existing account.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  let user = await User.findOne({ username }).select('+passwordHash');

  if (user) {
    console.log(`Found existing user: "${username}" (current role: ${user.role})`);
    user.role          = 'admin';
    user.isVerifiedDev = false; // admins are not dev-flagged by default
    if (password !== '-') {
      await user.setPassword(password);
      console.log('Password updated.');
    }
    await user.save();
    console.log(`\n✔ Promoted "${username}" to admin.`);
  } else {
    if (password === '-') {
      console.error('Must provide a real password when creating a new account.');
      process.exit(1);
    }
    user = new User({ username, role: 'admin', isVerifiedDev: false });
    await user.setPassword(password);
    await user.save();
    console.log(`\n✔ Created new admin account: "${username}"`);
  }

  console.log(`   role: ${user.role}`);
  console.log('\n⚠  Keep admin credentials secure — do not share or commit them.');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
