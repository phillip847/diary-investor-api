import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Main auth route (what frontend calls)
router.post('/', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Simple hardcoded admin check
    if (username === 'admin' && password === '123456') {
      let user = await User.findOne({ username });
      if (!user) {
        user = new User({ 
          username, 
          email: 'admin@admin.com',
          role: 'admin'
        });
        await user.save();
      }

      const token = jwt.sign(
        { userId: user._id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({ token, user });
    }
    
    res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login without password (legacy)
router.post('/login', async (req, res) => {
  try {
    const { username } = req.body;
    
    let user = await User.findOne({ username });
    if (!user) {
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