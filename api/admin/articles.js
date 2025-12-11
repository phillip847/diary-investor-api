import connectDB from '../../config/database.js';
import Article from '../../models/Article.js';
import { verifyToken } from '../../middleware/auth.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const authResult = verifyToken(req);
      if (!authResult.valid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await connectDB();
      
      const articleData = req.body;
      
      // Generate slug if not provided
      if (!articleData.slug && articleData.title) {
        articleData.slug = articleData.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }

      const article = new Article(articleData);
      await article.save();
      
      return res.status(201).json(article);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();
    
    const articles = await Article.find()
      .sort({ createdAt: -1 })
      .select('title slug category status createdAt updatedAt');
      
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}