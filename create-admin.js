// Create a new admin account, or reset the password of an existing one.
// Usage: npm run create-admin -- <username> <email>
// The password is prompted for, so it never lands in shell history.
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import readline from 'readline';
import User from './models/User.js';

dotenv.config();

const [username, email] = process.argv.slice(2);
if (!username || !email) {
  console.error('Usage: npm run create-admin -- <username> <email>');
  process.exit(1);
}

// One shared interface so both prompts work whether stdin is a TTY or a pipe.
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let muted = false;
rl._writeToOutput = (s) => {
  if (!muted) rl.output.write(s);
};
const lines = rl[Symbol.asyncIterator]();

async function promptHidden(question) {
  rl.output.write(question);
  muted = true;
  const { value = '' } = await lines.next();
  muted = false;
  rl.output.write('\n');
  return value;
}

const password = await promptHidden('Password: ');
const confirm = await promptHidden('Confirm password: ');
rl.close();
if (password !== confirm) {
  console.error('Passwords do not match.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/diary_investor');

try {
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ username });
  if (existing) {
    existing.email = email;
    existing.passwordHash = passwordHash;
    existing.role = 'admin';
    await existing.save();
    console.log(`Updated admin "${username}".`);
  } else {
    await User.create({ username, email, passwordHash, role: 'admin' });
    console.log(`Created admin "${username}".`);
  }
} catch (err) {
  console.error('Failed:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
