import express from 'express';
import StaticPage from '../models/StaticPage.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all pages
router.get('/', async (req, res) => {
  try {
    const pages = await StaticPage.find();
    res.json(pages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get page content
router.get('/:page', async (req, res) => {
  try {
    const page = await StaticPage.findOne({ page: req.params.page });
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json(page);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update page content (admin only)
router.put('/:page', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = await StaticPage.findOneAndUpdate(
      { page: req.params.page },
      { content: req.body.content },
      { new: true, upsert: true }
    );
    res.json(page);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;