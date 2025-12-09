import express from 'express';
import Newsletter from '../models/Newsletter.js';

const router = express.Router();

// Get all subscribers
router.get('/', async (req, res) => {
  try {
    const subscribers = await Newsletter.find().sort({ createdAt: -1 });
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
    
    const subscriber = new Newsletter({ email, name });
    await subscriber.save();
    
    // Send welcome email
    try {
      const { sendWelcomeEmail } = await import('../utils/email.js');
      await sendWelcomeEmail(email, name);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }
    
    res.status(201).json({ message: 'Newsletter subscription successful', subscriber });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already subscribed' });
    }
    res.status(400).json({ error: error.message });
  }
});

export default router;