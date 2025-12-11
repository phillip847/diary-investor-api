import connectDB from '../config/database.js';
import Article from '../models/Article.js';
import { verifyToken } from '../middleware/auth.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await connectDB();
  const { id, slug, meta } = req.query;

  // Handle /api/articles/meta/categories
  if (meta === 'categories') {
    const categories = ['Namibia', 'South Africa', 'Global Markets', 'Crypto', 'Investing Guides', 'Housing & Personal Finance', 'Business & Entrepreneurship'];
    return res.json({ categories });
  }

  // Handle /api/articles/[id] or /api/articles/slug/[slug]
  if (id || slug) {
    try {
      let query;
      if (id) {
        // Check if id is a valid ObjectId, otherwise treat as slug
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
          query = { _id: id };
        } else {
          query = { slug: id, status: 'published' };
        }
      } else {
        query = { slug, status: 'published' };
      }
      
      const article = await Article.findOne(query);
      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }
      return res.json(article);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Handle /api/articles (list)
  if (req.method === 'GET') {
    try {
      const { 
        limit = 10, 
        page = 1, 
        category, 
        tag, 
        search, 
        featured,
        status = 'published'
      } = req.query;

      const query = { status };
      
      if (category) query.category = category;
      if (tag) query.tags = { $in: [tag] };
      if (featured !== undefined) query.featured = featured === 'true';
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const articles = await Article.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-content');

      const total = await Article.countDocuments(query);

      res.json(articles);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // Handle POST (Create article)
  else if (req.method === 'POST') {
    try {
      const authResult = verifyToken(req);
      if (!authResult.valid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

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
      
      res.status(201).json(article);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // Handle PUT (Update article)
  else if (req.method === 'PUT') {
    try {
      const authResult = verifyToken(req);
      if (!authResult.valid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!id) {
        return res.status(400).json({ error: 'Article ID required' });
      }

      const updateData = req.body;
      
      // Generate slug if title changed
      if (updateData.title && !updateData.slug) {
        updateData.slug = updateData.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }

      const article = await Article.findByIdAndUpdate(id, updateData, { new: true });
      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }
      
      res.json(article);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // Handle DELETE
  else if (req.method === 'DELETE') {
    try {
      const authResult = verifyToken(req);
      if (!authResult.valid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!id) {
        return res.status(400).json({ error: 'Article ID required' });
      }

      const article = await Article.findByIdAndDelete(id);
      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }
      
      res.json({ message: 'Article deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}