import connectDB from '../../config/database.js';
import { NewsletterIssue } from '../../models/Newsletter.js';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  await connectDB();

  if (req.method === 'GET') {
    try {
      const newsletter = await NewsletterIssue.findById(id);
      if (!newsletter) {
        return res.status(404).json({ error: 'Newsletter not found' });
      }
      res.json(newsletter);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }

      jwt.verify(token, process.env.JWT_SECRET);

      const newsletter = await NewsletterIssue.findByIdAndDelete(id);
      if (!newsletter) {
        return res.status(404).json({ error: 'Newsletter not found' });
      }
      res.json({ message: 'Newsletter deleted successfully' });
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}