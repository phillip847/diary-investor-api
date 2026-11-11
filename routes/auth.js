import express from 'express';
import jwt from 'jsonwebtoken';
import { verifyAdminCredentials } from '../utils/adminAuth.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const publicUser = (u) => ({ _id: u._id, username: u.username, email: u.email, role: u.role });

// Log in. Returns a 7-day token plus the user's profile and role.
router.post('/', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const user = await verifyAdminCredentials(username?.trim(), password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Current user, used by the dashboard to refresh name and role.
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
