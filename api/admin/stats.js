import connectDB from '../../config/database.js';
import Article from '../../models/Article.js';
import { Subscriber } from '../../models/Newsletter.js';

export default async function handler(req, res) {
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
    
    const totalArticles = await Article.countDocuments();
    const publishedArticles = await Article.countDocuments({ status: 'published' });
    const totalSubscribers = await Subscriber.countDocuments();
    
    res.json({
      totalArticles,
      publishedArticles,
      totalSubscribers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}