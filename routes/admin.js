import express from 'express';
import Article from '../models/Article.js';
import User from '../models/User.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all admin routes
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [totalArticles, publishedArticles, draftArticles, totalUsers] = await Promise.all([
      Article.countDocuments(),
      Article.countDocuments({ status: 'published' }),
      Article.countDocuments({ status: 'draft' }),
      User.countDocuments()
    ]);

    res.json({
      totalArticles,
      publishedArticles,
      draftArticles,
      totalUsers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-__v').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk operations for articles
router.post('/articles/bulk-update', async (req, res) => {
  try {
    const { ids, updates } = req.body;
    await Article.updateMany({ _id: { $in: ids } }, updates);
    res.json({ message: 'Articles updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/articles/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    await Article.deleteMany({ _id: { $in: ids } });
    res.json({ message: 'Articles deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;