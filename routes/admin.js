import express from 'express';
import multer from 'multer';
import Article from '../models/Article.js';
import User from '../models/User.js';
import SessionBooking from '../models/SessionBooking.js';
import { Subscriber, NewsletterIssue } from '../models/Newsletter.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { sendNewsletterEmail } from '../utils/email.js';

const upload = multer({ dest: 'uploads/' });

const router = express.Router();

// Apply authentication to all admin routes
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [articleStats, bookingStats, totalUsers] = await Promise.all([
      Article.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            published: [{ $match: { status: 'published' } }, { $count: 'count' }],
            draft: [{ $match: { status: 'draft' } }, { $count: 'count' }],
            featured: [{ $match: { featured: true } }, { $count: 'count' }]
          }
        }
      ]),
      SessionBooking.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            pending: [{ $match: { status: 'pending' } }, { $count: 'count' }]
          }
        }
      ]),
      User.countDocuments()
    ]);

    res.json({
      totalArticles: articleStats[0].total[0]?.count || 0,
      publishedArticles: articleStats[0].published[0]?.count || 0,
      draftArticles: articleStats[0].draft[0]?.count || 0,
      featuredArticles: articleStats[0].featured[0]?.count || 0,
      totalUsers,
      totalBookings: bookingStats[0].total[0]?.count || 0,
      pendingBookings: bookingStats[0].pending[0]?.count || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get article preview
router.get('/articles/:id/preview', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id).lean();
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-__v').sort({ createdAt: -1 }).lean();
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

// Newsletter Management
router.get('/newsletter', async (req, res) => {
  try {
    const newsletters = await NewsletterIssue.find().sort({ createdAt: -1 }).lean();
    res.json(newsletters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/newsletter', upload.single('pdf'), async (req, res) => {
  try {
    const { title, message } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    const newsletter = new NewsletterIssue({
      title,
      message,
      description: message, // Keep both for compatibility
      fileUrl: `/uploads/${file.filename}`,
      fileName: file.originalname,
      fileSize: file.size
    });

    await newsletter.save();
    res.status(201).json(newsletter);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/newsletter/:id', async (req, res) => {
  try {
    const newsletter = await NewsletterIssue.findById(req.params.id).lean();
    if (!newsletter) return res.status(404).json({ error: 'Newsletter not found' });
    res.json(newsletter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/newsletter/:id', upload.single('pdf'), async (req, res) => {
  try {
    const { title, message } = req.body;
    const updateData = { title, message, description: message };
    
    if (req.file) {
      updateData.fileUrl = `/uploads/${req.file.filename}`;
      updateData.fileName = req.file.originalname;
      updateData.fileSize = req.file.size;
    }

    const newsletter = await NewsletterIssue.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );
    
    if (!newsletter) return res.status(404).json({ error: 'Newsletter not found' });
    res.json(newsletter);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/newsletter/:id', async (req, res) => {
  try {
    const newsletter = await NewsletterIssue.findByIdAndDelete(req.params.id);
    if (!newsletter) return res.status(404).json({ error: 'Newsletter not found' });
    res.json({ message: 'Newsletter deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/newsletter/:id/send', async (req, res) => {
  try {
    const newsletter = await NewsletterIssue.findById(req.params.id);
    if (!newsletter) return res.status(404).json({ error: 'Newsletter not found' });
    
    const subscribers = await Subscriber.find({ status: 'active' });
    let sentCount = 0;
    
    for (const subscriber of subscribers) {
      try {
        await sendNewsletterEmail(subscriber.email, newsletter);
        sentCount++;
      } catch (emailError) {
        console.error(`Failed to send to ${subscriber.email}:`, emailError);
      }
    }
    
    // Update newsletter with sent info
    await NewsletterIssue.findByIdAndUpdate(req.params.id, {
      sentAt: new Date(),
      sentCount
    });
    
    res.json({ message: `Newsletter sent to ${sentCount} of ${subscribers.length} subscribers` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;