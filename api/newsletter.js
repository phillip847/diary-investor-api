import connectDB from '../config/database.js';
import { NewsletterIssue, Subscriber } from '../models/Newsletter.js';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await connectDB();
  const { action, id } = req.query;

  // Handle /api/newsletter?action=subscribe
  if (action === 'subscribe' && req.method === 'POST') {
    try {
      const { email, name } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      const subscriber = new Subscriber({ email, name });
      await subscriber.save();
      
      try {
        const { sendWelcomeEmail } = await import('../utils/email.js');
        await sendWelcomeEmail(email, name);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
      
      return res.status(201).json({ message: 'Newsletter subscription successful', subscriber });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ error: 'Email already subscribed' });
      }
      return res.status(400).json({ error: error.message });
    }
  }

  // Handle /api/newsletter?action=upload
  if (action === 'upload' && req.method === 'POST') {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Access token required' });
      jwt.verify(token, process.env.JWT_SECRET);

      const { title, description, issueDate, fileUrl, fileName, fileSize } = req.body;
      if (!title || !fileUrl) {
        return res.status(400).json({ error: 'Title and file are required' });
      }

      const newsletter = new NewsletterIssue({
        title, description, fileUrl, fileName, fileSize,
        issueDate: issueDate || Date.now(),
        status: 'published'
      });
      
      await newsletter.save();
      return res.status(201).json({ message: 'Newsletter uploaded successfully', newsletter });
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      return res.status(500).json({ error: error.message });
    }
  }

  // Handle /api/newsletter?action=notify
  if (action === 'notify' && req.method === 'POST') {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Access token required' });
      jwt.verify(token, process.env.JWT_SECRET);

      const { title, newsletterId } = req.body;
      console.log('Newsletter notification request:', { title, newsletterId });
      
      if (!title) return res.status(400).json({ error: 'Title is required' });

      const subscribers = await Subscriber.find({ status: 'active' });
      console.log(`Found ${subscribers.length} active subscribers`);
      
      if (subscribers.length === 0) {
        return res.status(400).json({ error: 'No active subscribers found' });
      }

      const newsletterUrl = `${process.env.FRONTEND_URL || 'https://diaryofan-investor.vercel.app'}/newsletter/${newsletterId}`;
      console.log('Sending newsletter to URL:', newsletterUrl);
      
      const { sendNewsletterToSubscribers } = await import('../utils/email.js');
      await sendNewsletterToSubscribers(subscribers, title, newsletterUrl);
      
      console.log(`Newsletter notification sent successfully to ${subscribers.length} subscribers`);
      return res.json({ message: `Newsletter notification sent to ${subscribers.length} subscribers` });
    } catch (error) {
      console.error('Newsletter notification error:', error);
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      return res.status(500).json({ error: error.message });
    }
  }

  // Handle /api/newsletter?action=list
  if (action === 'list' && req.method === 'GET') {
    try {
      const newsletters = await NewsletterIssue.find({ status: 'published' })
        .sort({ issueDate: -1 })
        .select('-fileUrl');
      return res.json(newsletters);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Handle /api/newsletter?action=subscribers
  if (action === 'subscribers' && req.method === 'GET') {
    try {
      const subscribers = await Subscriber.find().sort({ createdAt: -1 });
      return res.json(subscribers);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Handle /api/newsletter?id={id} (GET or DELETE)
  if (id) {
    if (req.method === 'GET') {
      try {
        const newsletter = await NewsletterIssue.findById(id);
        if (!newsletter) {
          return res.status(404).json({ error: 'Newsletter not found' });
        }
        return res.json(newsletter);
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    }
    
    if (req.method === 'DELETE') {
      try {
        const newsletter = await NewsletterIssue.findByIdAndDelete(id);
        if (!newsletter) {
          return res.status(404).json({ error: 'Newsletter not found' });
        }
        return res.json({ message: 'Newsletter deleted successfully' });
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    }
  }

  // Default GET behavior - return list of newsletters
  if (req.method === 'GET') {
    try {
      const newsletters = await NewsletterIssue.find({ status: 'published' })
        .sort({ issueDate: -1 })
        .select('-fileUrl');
      return res.json(newsletters);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}