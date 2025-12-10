import connectDB from '../../config/database.js';
import { NewsletterIssue, Subscriber } from '../../models/Newsletter.js';
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
    
    const { title, description, issueDate, fileUrl, fileName, fileSize } = req.body;
    
    if (!title || !fileUrl) {
      return res.status(400).json({ error: 'Title and file are required' });
    }

    const newsletter = new NewsletterIssue({
      title,
      description,
      fileUrl,
      fileName,
      fileSize,
      issueDate: issueDate || Date.now(),
      status: 'published'
    });
    
    await newsletter.save();

    // Send notification emails to subscribers
    try {
      const subscribers = await Subscriber.find({ status: 'active' });
      if (subscribers.length > 0) {
        const newsletterUrl = `${process.env.FRONTEND_URL || 'https://diaryofan-investor.vercel.app'}/newsletter/${newsletter._id}`;
        
        const { sendNewsletterToSubscribers } = await import('../../utils/email.js');
        await sendNewsletterToSubscribers(subscribers, newsletter.title, newsletterUrl);
      }
    } catch (emailError) {
      console.error('Failed to send newsletter notifications:', emailError);
    }
    
    res.status(201).json({ message: 'Newsletter uploaded and sent successfully', newsletter });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: error.message });
  }
}