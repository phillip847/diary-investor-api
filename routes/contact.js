import express from 'express';
import { sendContactEmail } from '../utils/email.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    console.log('=== CONTACT FORM SUBMISSION ===');
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Message:', message);
    console.log('SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL);
    console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL);
    
    if (!name || !email || !message) {
      console.log('ERROR: Missing required fields');
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    console.log('Attempting to send email...');
    await sendContactEmail({ name, email, message });
    console.log('Email sent successfully!');
    res.json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    console.error('Error details:', error.response?.body || error.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
