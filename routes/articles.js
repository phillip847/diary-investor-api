import express from 'express';
import Article from '../models/Article.js';
import { Op } from 'sequelize';

const router = express.Router();

// Get all articles with filters
router.get('/', async (req, res) => {
  try {
    const { category, status, search, featured, limit = 10, offset = 0 } = req.query;
    const where = {};
    
    if (category) where.category = category;
    if (status) where.status = status;
    if (featured) where.featured = featured === 'true';
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { subtitle: { [Op.like]: `%${search}%` } }
      ];
    }

    const articles = await Article.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });

    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single article
router.get('/:id', async (req, res) => {
  try {
    const article = await Article.findByPk(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create article
router.post('/', async (req, res) => {
  try {
    const article = await Article.create(req.body);
    res.status(201).json(article);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update article
router.put('/:id', async (req, res) => {
  try {
    const [updated] = await Article.update(req.body, {
      where: { id: req.params.id }
    });
    if (!updated) return res.status(404).json({ error: 'Article not found' });
    
    const article = await Article.findByPk(req.params.id);
    res.json(article);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete article
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Article.destroy({
      where: { id: req.params.id }
    });
    if (!deleted) return res.status(404).json({ error: 'Article not found' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;