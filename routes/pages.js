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

// Add content block
router.post('/:page/blocks', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page } = req.params;
    const block = { ...req.body, id: Date.now().toString() };
    
    const pageDoc = await StaticPage.findOne({ page });
    if (!pageDoc) return res.status(404).json({ error: 'Page not found' });
    
    if (!pageDoc.contentBlocks) pageDoc.contentBlocks = [];
    pageDoc.contentBlocks.push(block);
    await pageDoc.save();
    
    res.json({ block, pageSlug: page });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update content block
router.put('/:page/blocks/:blockId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page, blockId } = req.params;
    
    const pageDoc = await StaticPage.findOne({ page });
    if (!pageDoc) return res.status(404).json({ error: 'Page not found' });
    
    const blockIndex = pageDoc.contentBlocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return res.status(404).json({ error: 'Block not found' });
    
    pageDoc.contentBlocks[blockIndex] = { ...req.body, id: blockId };
    await pageDoc.save();
    
    res.json({ block: pageDoc.contentBlocks[blockIndex] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete content block
router.delete('/:page/blocks/:blockId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page, blockId } = req.params;
    
    const pageDoc = await StaticPage.findOne({ page });
    if (!pageDoc) return res.status(404).json({ error: 'Page not found' });
    
    pageDoc.contentBlocks = pageDoc.contentBlocks.filter(b => b.id !== blockId);
    await pageDoc.save();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;