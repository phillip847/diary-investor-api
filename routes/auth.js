import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Login without password
router.post('/login', async (req, res) => {
  try {
    const { username } = req.body;
    
    let user = await User.findOne({ username });
    if (!user) {
      // Create admin user if doesn't exist
      user = new User({ 
        username, 
        email: `${username}@admin.com` 
      });
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;