import connectDB from '../../config/database.js';
import Article from '../../models/Article.js';

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
    
    const articles = await Article.find()
      .sort({ createdAt: -1 })
      .select('title slug category status createdAt updatedAt');
      
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}