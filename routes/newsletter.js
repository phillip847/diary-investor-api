import express from 'express';
import multer from 'multer';
import { Subscriber, NewsletterIssue } from '../models/Newsletter.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Get all subscribers
router.get('/', async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 });
    res.json(subscribers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const subscriber = new Subscriber({ email, name });
    await subscriber.save();
    
    // Send welcome email
    try {
      const { sendWelcomeEmail } = await import('../utils/email.js');
      await sendWelcomeEmail(email, name);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }
    
    res.status(201).json({ message: 'Newsletter subscription successful', subscriber });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already subscribed' });
    }
    res.status(400).json({ error: error.message });
  }
});

// Upload newsletter (admin only)
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  console.log('=== NEWSLETTER UPLOAD ENDPOINT HIT ===');
  console.log('Request body:', req.body);
  console.log('File info:', req.file ? {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  } : 'No file');
  
  try {
    const { title, description, issueDate } = req.body;
    
    console.log('Extracted data:', { title, description, issueDate });
    
    if (!req.file) {
      console.log('ERROR: No file provided');
      return res.status(400).json({ error: 'PDF file is required' });
    }
    
    if (!title) {
      console.log('ERROR: No title provided');
      return res.status(400).json({ error: 'Title is required' });
    }

    console.log('Converting file to base64...');
    // Convert file to base64 for storage
    const fileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    
    console.log('Creating newsletter document...');
    const newsletter = new NewsletterIssue({
      title,
      description,
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      issueDate: issueDate || Date.now(),
    });
    
    console.log('Saving newsletter to database...');
    const savedNewsletter = await newsletter.save();
    console.log('Newsletter saved successfully with ID:', savedNewsletter._id);
    
    res.status(201).json({ 
      message: 'Newsletter uploaded successfully!', 
      newsletter: {
        id: savedNewsletter._id,
        title: savedNewsletter.title,
        description: savedNewsletter.description,
        fileName: savedNewsletter.fileName,
        fileSize: savedNewsletter.fileSize,
        issueDate: savedNewsletter.issueDate,
        status: savedNewsletter.status
      }
    });
  } catch (error) {
    console.error('Newsletter upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all newsletters
router.get('/list', async (req, res) => {
  try {
    const newsletters = await NewsletterIssue.find({ status: 'published' })
      .sort({ issueDate: -1 })
      .select('-fileUrl'); // Exclude large file data from list
    res.json(newsletters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single newsletter with file
router.get('/:id', async (req, res) => {
  try {
    const newsletter = await NewsletterIssue.findById(req.params.id);
    if (!newsletter) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }
    res.json(newsletter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete newsletter (admin only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const newsletter = await NewsletterIssue.findByIdAndDelete(req.params.id);
    if (!newsletter) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }
    res.json({ message: 'Newsletter deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send newsletter to all subscribers (admin only)
router.post('/:id/send', verifyToken, async (req, res) => {
  try {
    const newsletter = await NewsletterIssue.findById(req.params.id);
    if (!newsletter) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }

    const subscribers = await Subscriber.find({ status: 'active' });
    if (subscribers.length === 0) {
      return res.status(400).json({ error: 'No active subscribers found' });
    }

    const newsletterUrl = `${process.env.FRONTEND_URL || 'https://diaryofan-investor.vercel.app'}/newsletter/${newsletter._id}`;
    
    const { sendNewsletterToSubscribers } = await import('../utils/email.js');
    await sendNewsletterToSubscribers(subscribers, newsletter.title, newsletterUrl);
    
    res.json({ message: `Newsletter sent to ${subscribers.length} subscribers` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;