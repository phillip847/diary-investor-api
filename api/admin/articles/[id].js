import Article from '../../../models/Article.js';
import connectDB from '../../../config/database.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await connectDB();

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const article = await Article.findById(id).lean();
      if (!article) return res.status(404).json({ error: 'Article not found' });
      
      // Map publishDate to publishedDate for frontend compatibility
      if (article.publishDate) {
        article.publishedDate = article.publishDate.toISOString().split('T')[0];
      } else {
        article.publishedDate = new Date().toISOString().split('T')[0];
      }
      
      res.json(article);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}