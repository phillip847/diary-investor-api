import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// Legacy hardcoded login. Only honoured while the "admin" account has no
// password set; run `npm run create-admin -- admin <email>` to retire it.
const LEGACY_USERNAME = 'admin';
const LEGACY_PASSWORD = '123456';

/**
 * Returns the authenticated admin user (without passwordHash), or null.
 */
export async function verifyAdminCredentials(username, password) {
  if (!username || !password) return null;

  const user = await User.findOne({ username }).select('+passwordHash');

  if (user?.passwordHash) {
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
  } else if (username === LEGACY_USERNAME && password === LEGACY_PASSWORD) {
    if (!user) {
      const created = await User.create({
        username,
        email: 'admin@admin.com',
        role: 'admin',
      });
      return sanitize(created);
    }
  } else {
    return null;
  }

  return sanitize(user);
}

function sanitize(user) {
  const obj = user.toObject();
  delete obj.passwordHash;
  return obj;
}
