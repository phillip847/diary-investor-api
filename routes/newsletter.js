import express from 'express';
import { Subscriber, NewsletterIssue } from '../models/Newsletter.js';
import { authenticateToken, requireReviewer } from '../middleware/auth.js';

// Public newsletter endpoints. Uploading, editing, deleting and sending
// newsletters lives under /api/admin/newsletter and needs an editor or admin.
const router = express.Router();

// Run auth middleware inline for the few ?action= requests that need it.
const asReviewer = (req, res, handler) =>
  authenticateToken(req, res, () => requireReviewer(req, res, () => handler(req, res)));

async function subscribe(req, res) {
  try {
    const { email, name } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const subscriber = new Subscriber({ email, name });
    await subscriber.save();

    try {
      const { sendWelcomeEmail } = await import('../utils/email.js');
      await sendWelcomeEmail(email, name);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    res.status(201).json({ message: 'Newsletter subscription successful', subscriber });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'Email already subscribed' });
    res.status(400).json({ error: error.message });
  }
}

async function listPublished(req, res) {
  try {
    const newsletters = await NewsletterIssue.find({ status: 'published' })
      .sort({ issueDate: -1 })
      .select('-fileUrl'); // file data is large; fetch one issue to get it
    res.json(newsletters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getOne(req, res, id) {
  try {
    const newsletter = await NewsletterIssue.findById(id);
    if (!newsletter) return res.status(404).json({ error: 'Newsletter not found' });
    res.json(newsletter);
  } catch {
    res.status(404).json({ error: 'Newsletter not found' });
  }
}

async function listSubscribers(req, res) {
  try {
    res.json(await Subscriber.find().sort({ createdAt: -1 }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function notify(req, res) {
  try {
    const { title, newsletterId } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const subscribers = await Subscriber.find({ status: 'active' });
    if (subscribers.length === 0) return res.status(400).json({ error: 'No active subscribers found' });

    const newsletterUrl = `${process.env.FRONTEND_URL || 'https://diaryofan-investor.vercel.app'}/newsletter/${newsletterId}`;
    const { sendNewsletterToSubscribers } = await import('../utils/email.js');
    await sendNewsletterToSubscribers(subscribers, title, newsletterUrl);
    res.json({ message: `Newsletter notification sent to ${subscribers.length} subscribers` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Query-string style used by the website: /api/newsletter?action=...
router.get('/', (req, res) => {
  const { action, id } = req.query;
  if (action === 'subscribers') return asReviewer(req, res, listSubscribers);
  if (id) return getOne(req, res, id);
  return listPublished(req, res);
});

router.post('/', (req, res) => {
  const { action } = req.query;
  if (action === 'subscribe') return subscribe(req, res);
  if (action === 'notify') return asReviewer(req, res, notify);
  res.status(400).json({ error: 'Unknown action' });
});

// Path style.
router.post('/subscribe', subscribe);
router.get('/list', listPublished);

// Public archive, including file data so issues can be opened directly.
router.get('/public', async (req, res) => {
  try {
    res.json(await NewsletterIssue.find({ status: 'published' }).sort({ createdAt: -1 }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => getOne(req, res, req.params.id));

export default router;
