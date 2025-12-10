import connectDB from '../../config/database.js';
import { NewsletterIssue } from '../../models/Newsletter.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();
    
    const newsletters = await NewsletterIssue.find({ status: 'published' })
      .sort({ issueDate: -1 })
      .select('-fileUrl');
      
    res.json(newsletters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}