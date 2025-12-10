import connectDB from '../../config/database.js';
import { Subscriber } from '../../models/Newsletter.js';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();
    
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const subscriber = new Subscriber({ email, name });
    await subscriber.save();
    
    // Send welcome email
    try {
      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: 'Welcome to Diary of an Investor Newsletter!',
        html: `
          <h2>Welcome ${name || 'there'}!</h2>
          <p>Thank you for subscribing to the Diary of an Investor newsletter.</p>
          <p>You'll receive our latest insights on investing, market analysis, and financial tips directly in your inbox.</p>
          <p>Best regards,<br>The Diary of an Investor Team</p>
        `
      });
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
}