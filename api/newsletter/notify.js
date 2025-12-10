import connectDB from '../../config/database.js';
import { Subscriber } from '../../models/Newsletter.js';
import jwt from 'jsonwebtoken';

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
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET);

    await connectDB();
    
    const { title, newsletterId } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const subscribers = await Subscriber.find({ status: 'active' });
    if (subscribers.length === 0) {
      return res.status(400).json({ error: 'No active subscribers found' });
    }

    const newsletterUrl = `${process.env.FRONTEND_URL || 'https://diaryofan-investor.vercel.app'}/newsletter/${newsletterId}`;
    
    const { sendNewsletterToSubscribers } = await import('../../utils/email.js');
    await sendNewsletterToSubscribers(subscribers, title, newsletterUrl);
    
    res.json({ message: `Newsletter notification sent to ${subscribers.length} subscribers` });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: error.message });
  }
}