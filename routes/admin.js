import express from 'express';
import multer from 'multer';
import Article from '../models/Article.js';
import User from '../models/User.js';
import SessionBooking from '../models/SessionBooking.js';
import { Subscriber, NewsletterIssue } from '../models/Newsletter.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { sendNewsletterEmail } from '../utils/email.js';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

const router = express.Router();

// Delete subscriber route (before any middleware)
router.delete('/newsletter/subscribers/:id', async (req, res) => {
  try {
    const subscriber = await Subscriber.findByIdAndDelete(req.params.id);
    if (!subscriber) return res.status(404).json({ error: 'Subscriber not found' });
    res.json({ message: 'Subscriber deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log all admin requests
router.use((req, res, next) => {
  console.log(`Admin route: ${req.method} ${req.path}`);
  console.log('Full URL:', req.originalUrl);
  console.log('Headers:', req.headers.authorization ? 'Has auth token' : 'No auth token');
  next();
});

// Test endpoint (no auth required for debugging)
router.get('/test', (req, res) => {
  res.json({ message: 'Admin routes working', timestamp: new Date().toISOString() });
});

// Debug endpoint to test file upload without auth
router.post('/debug', upload.single('pdf'), (req, res) => {
  console.log('=== DEBUG ENDPOINT ===');
  console.log('Body:', req.body);
  console.log('File:', req.file);
  res.json({ 
    body: req.body, 
    file: req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : null
  });
});

// Apply authentication to all admin routes except test and debug
router.use((req, res, next) => {
  if (req.path === '/test' || req.path === '/debug') return next();
  authenticateToken(req, res, next);
});
router.use((req, res, next) => {
  if (req.path === '/test' || req.path === '/debug') return next();
  requireAdmin(req, res, next);
});

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

// Get all articles for admin
router.get('/articles', async (req, res) => {
  try {
    const articles = await Article.find()
      .sort({ createdAt: -1 })
      .select('title slug category status createdAt updatedAt');
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single article with full details
router.get('/articles/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id).lean();
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
});

// Create article
router.post('/articles', async (req, res) => {
  try {
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
});

// Update article
router.put('/articles', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Article ID required' });
    
    const updateData = req.body;
    
    // Generate slug if title changed
    if (updateData.title && !updateData.slug) {
      updateData.slug = updateData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    const article = await Article.findByIdAndUpdate(id, updateData, { new: true });
    if (!article) return res.status(404).json({ error: 'Article not found' });
    
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete article
router.delete('/articles', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Article ID required' });

    const article = await Article.findByIdAndDelete(id);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    
    res.json({ message: 'Article deleted successfully' });
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

// Test newsletter endpoint (no auth)
router.get('/newsletter/test', (req, res) => {
  res.json({ message: 'Newsletter endpoint working', timestamp: new Date().toISOString() });
});

// Test subscriber endpoint
router.get('/newsletter/subscribers/test', (req, res) => {
  console.log('Subscriber test endpoint hit');
  res.json({ message: 'Subscriber endpoint working', timestamp: new Date().toISOString() });
});



// Subscriber Management (must come before newsletter/:id routes)
router.get('/newsletter/subscribers', async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 });
    res.json(subscribers);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
  console.log('=== ADMIN NEWSLETTER POST REQUEST ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('File:', req.file ? {
    fieldname: req.file.fieldname,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  } : 'No file received');
  
  try {
    const { title, message } = req.body;
    const file = req.file;
    
    console.log('Extracted data:', { title, message });
    
    if (!file) {
      console.log('ERROR: No file provided');
      return res.status(400).json({ error: 'PDF file is required' });
    }

    if (!title) {
      console.log('ERROR: No title provided');
      return res.status(400).json({ error: 'Title is required' });
    }

    // Convert file to base64 for MongoDB storage
    const fileUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    const newsletter = new NewsletterIssue({
      title,
      message,
      description: message,
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size
    });

    console.log('Saving newsletter to database...');
    await newsletter.save();
    console.log('Newsletter saved successfully');
    res.status(201).json(newsletter);
  } catch (error) {
    console.error('Admin newsletter creation error:', error);
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
      // Convert new file to base64
      const fileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      updateData.fileUrl = fileUrl;
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