import express from 'express';
import mongoose from 'mongoose';
import Article from '../models/Article.js';

// Public, read-only article endpoints. Only published articles are ever returned;
// drafts, pending and rejected articles are reachable through /api/admin only.
const router = express.Router();

const PUBLISHED = { status: 'published' };
const LIST_FIELDS = 'title subtitle slug category tags thumbnail thumbnailAlt featured status publishDate createdAt authorName';

// List published articles. Returns a plain array (what the site has always consumed).
// ?slug= or ?id= returns a single article instead (the older function-style API).
router.get('/', async (req, res) => {
  try {
    if (req.query.slug) return await sendOne(res, { slug: req.query.slug });
    if (req.query.id) {
      const { id } = req.query;
      return await sendOne(res, mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id });
    }
    const { category, tag, search, featured, limit = 50, offset, page } = req.query;
    const filter = { ...PUBLISHED };
    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (featured !== undefined) filter.featured = featured === 'true';
    if (search) {
      const rx = { $regex: String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      filter.$or = [{ title: rx }, { subtitle: rx }];
    }

    const take = Math.min(parseInt(limit, 10) || 50, 200);
    const skip = offset !== undefined ? parseInt(offset, 10) || 0 : ((parseInt(page, 10) || 1) - 1) * take;

    const articles = await Article.find(filter)
      .select(LIST_FIELDS)
      .sort({ publishDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(take)
      .lean();

    res.set('Cache-Control', 'public, max-age=60');
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

async function sendOne(res, query) {
  const article = await Article.findOne({ ...query, ...PUBLISHED }).lean();
  if (!article) return res.status(404).json({ error: 'Article not found' });
  res.set('Cache-Control', 'public, max-age=300');
  res.json(article);
}

router.get('/slug/:slug', async (req, res) => {
  try {
    await sendOne(res, { slug: req.params.slug });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accepts either an id or a slug.
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await sendOne(res, mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
