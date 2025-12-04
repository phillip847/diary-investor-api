import express from 'express';
import Newsletter from '../models/Newsletter.js';

const router = express.Router();

// Get all subscribers
router.get('/', async (req, res) => {
  try {
    const subscribers = await Newsletter.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.json(subscribers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const subscriber = await Newsletter.create({ email, name });
    res.status(201).json({ message: 'Newsletter subscription successful', subscriber });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Email already subscribed' });
    }
    res.status(400).json({ error: error.message });
  }
});

export default router;