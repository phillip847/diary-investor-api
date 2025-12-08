import express from 'express';
import Article from '../models/Article.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all articles with filters
router.get('/', async (req, res) => {
  try {
    const { category, status, search, featured, limit = 50, offset = 0 } = req.query;
    const filter = {};
    
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (featured !== undefined) filter.featured = featured === 'true';
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subtitle: { $regex: search, $options: 'i' } }
      ];
    }

    const [articles, count] = await Promise.all([
      Article.find(filter)
        .select('title subtitle slug category tags thumbnail thumbnailAlt featured status publishDate createdAt')
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .sort({ publishDate: -1, createdAt: -1 })
        .lean(),
      Article.countDocuments(filter)
    ]);

    res.set('Cache-Control', 'public, max-age=60');
    res.json({ rows: articles, count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get article by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug }).lean();
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.set('Cache-Control', 'public, max-age=300');
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get categories list
router.get('/meta/categories', (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  res.json([
    'Namibia',
    'South Africa',
    'Global Markets',
    'Crypto',
    'Investing Guides',
    'Housing & Personal Finance',
    'Business & Entrepreneurship'
  ]);
});

// Get single article
router.get('/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id).lean();
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.set('Cache-Control', 'public, max-age=300');
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create article (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const articleData = { ...req.body };
    if (articleData.status === 'published' && !articleData.publishDate) {
      articleData.publishDate = new Date();
    }
    const article = new Article(articleData);
    await article.save();
    res.status(201).json(article);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update article (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updateData = { ...req.body };
    const existingArticle = await Article.findById(req.params.id);
    
    if (updateData.status === 'published' && existingArticle.status === 'draft' && !updateData.publishDate) {
      updateData.publishDate = new Date();
    }
    
    const article = await Article.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete article (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;