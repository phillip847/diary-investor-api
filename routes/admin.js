import express from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Article, { ARTICLE_STATUSES } from '../models/Article.js';
import User from '../models/User.js';
import SessionBooking from '../models/SessionBooking.js';
import { Subscriber, NewsletterIssue } from '../models/Newsletter.js';
import { authenticateToken, requireAdmin, requireReviewer, canReview, ROLES } from '../middleware/auth.js';
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

// Every admin route needs a logged-in user; individual routes narrow by role.
router.use(authenticateToken);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const isId = (id) => mongoose.Types.ObjectId.isValid(id);

// Turn validation / duplicate-key errors into readable 400s.
function sendError(res, error) {
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: Object.values(error.errors).map(e => e.message).join('. ') });
  }
  if (error.name === 'CastError') return res.status(400).json({ error: `Invalid ${error.path}` });
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'value';
    return res.status(409).json({ error: `That ${field} is already in use` });
  }
  console.error(error);
  return res.status(500).json({ error: error.message });
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

router.get('/stats', async (req, res) => {
  try {
    const scope = canReview(req.user) ? {} : { author: req.user._id };
    const count = (extra = {}) => Article.countDocuments({ ...scope, ...extra });

    const [totalArticles, publishedArticles, draftArticles, pendingArticles, rejectedArticles, featuredArticles] =
      await Promise.all([
        count(),
        count({ status: 'published' }),
        count({ status: 'draft' }),
        count({ status: 'pending' }),
        count({ status: 'rejected' }),
        count({ featured: true }),
      ]);

    const stats = { totalArticles, publishedArticles, draftArticles, pendingArticles, rejectedArticles, featuredArticles };

    if (canReview(req.user)) {
      const [totalBookings, pendingBookings, totalSubscribers, totalUsers] = await Promise.all([
        SessionBooking.countDocuments(),
        SessionBooking.countDocuments({ status: 'pending' }),
        Subscriber.countDocuments(),
        User.countDocuments(),
      ]);
      Object.assign(stats, { totalBookings, pendingBookings, totalSubscribers, totalUsers });
    }

    res.json(stats);
  } catch (error) {
    sendError(res, error);
  }
});

/* ------------------------------------------------------------------ */
/* Articles                                                            */
/* ------------------------------------------------------------------ */

const LIST_FIELDS =
  'title slug category status featured publishDate createdAt updatedAt author authorName submittedAt reviewNote reviewedByName reviewedAt';
const EDITABLE_FIELDS = ['title', 'subtitle', 'category', 'tags', 'thumbnail', 'thumbnailAlt', 'content', 'slug'];

const slugify = (text = '') => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function uniqueSlug(base, excludeId) {
  const root = slugify(base) || 'article';
  let candidate = root;
  for (let n = 2; ; n++) {
    const clash = await Article.exists({ slug: candidate, ...(excludeId && { _id: { $ne: excludeId } }) });
    if (!clash) return candidate;
    candidate = `${root}-${n}`;
  }
}

const isOwner = (article, user) => article.author && article.author.equals(user._id);

// Authors may only touch their own articles, and never once they are live.
function assertCanEdit(article, user) {
  if (canReview(user)) return;
  if (!isOwner(article, user)) throw new HttpError(403, 'You can only edit your own articles');
  if (article.status === 'published') {
    throw new HttpError(403, 'Published articles can only be changed by an editor or admin');
  }
}

function assertCanView(article, user) {
  if (canReview(user) || isOwner(article, user)) return;
  throw new HttpError(404, 'Article not found');
}

function recordReview(article, user, note) {
  article.reviewedBy = user._id;
  article.reviewedByName = user.username;
  article.reviewedAt = new Date();
  article.reviewNote = note || undefined;
}

// Move an article to a new status, enforcing who may do what.
function transition(article, requested, user, note) {
  if (!ARTICLE_STATUSES.includes(requested)) throw new HttpError(400, `Unknown status "${requested}"`);

  let next = requested;
  if (!canReview(user)) {
    if (next === 'published') next = 'pending'; // authors submit; reviewers publish
    if (next === 'rejected') throw new HttpError(403, 'Only editors and admins can reject articles');
  }

  const prev = article.status;
  if (next === 'pending' && prev !== 'pending') {
    article.submittedAt = new Date();
    article.reviewNote = undefined;
  }
  if (next === 'published') {
    if (!article.publishDate) article.publishDate = new Date();
    if (prev !== 'published') recordReview(article, user, note);
  }
  if (next === 'rejected') recordReview(article, user, note);

  article.status = next;
}

async function applyArticleInput(article, body, user) {
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) article[field] = body[field];
  }
  if (body.category === '') article.category = undefined;
  if (typeof body.tags === 'string') {
    article.tags = body.tags.split(',').map(t => t.trim()).filter(Boolean);
  }

  // The editor form calls it publishedDate; the model stores publishDate.
  const date = body.publishDate ?? body.publishedDate;
  if (date) article.publishDate = new Date(date);

  if (body.featured !== undefined && canReview(user)) article.featured = Boolean(body.featured);

  if (article.isNew || article.isModified('slug') || !article.slug) {
    article.slug = await uniqueSlug(article.slug || article.title, article._id);
  }

  if (body.status !== undefined) transition(article, body.status, user, body.reviewNote);
}

async function loadArticle(id) {
  if (!isId(id)) throw new HttpError(404, 'Article not found');
  const article = await Article.findById(id);
  if (!article) throw new HttpError(404, 'Article not found');
  return article;
}

const articleIdFrom = (req) => req.params.id || req.query.id;

// List articles. Authors see only their own.
router.get('/articles', async (req, res) => {
  try {
    const filter = canReview(req.user) ? {} : { author: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    const sort = req.query.status === 'pending' ? { submittedAt: 1 } : { createdAt: -1 };
    const articles = await Article.find(filter).sort(sort).select(LIST_FIELDS).lean();
    res.json(articles);
  } catch (error) {
    sendError(res, error);
  }
});

// Single article with full content.
router.get('/articles/:id', async (req, res) => {
  try {
    const article = await loadArticle(req.params.id);
    assertCanView(article, req.user);
    const out = article.toObject();
    out.publishedDate = (article.publishDate || new Date()).toISOString().split('T')[0];
    res.json(out);
  } catch (error) {
    sendError(res, error);
  }
});

// Create. For backwards compatibility a body containing an id updates instead.
router.post('/articles', async (req, res, next) => {
  if (req.body?.id) {
    req.params.id = req.body.id;
    return updateArticle(req, res, next);
  }
  try {
    const article = new Article({ author: req.user._id, authorName: req.user.username });
    await applyArticleInput(article, { status: 'draft', ...req.body }, req.user);
    await article.save();
    res.status(201).json(article);
  } catch (error) {
    sendError(res, error);
  }
});

async function updateArticle(req, res) {
  try {
    const article = await loadArticle(articleIdFrom(req));
    assertCanEdit(article, req.user);
    await applyArticleInput(article, req.body || {}, req.user);
    await article.save();
    res.json(article);
  } catch (error) {
    sendError(res, error);
  }
}

router.put('/articles/:id', updateArticle);
router.put('/articles', updateArticle); // ?id= form used by older dashboard builds

async function deleteArticle(req, res) {
  try {
    const article = await loadArticle(articleIdFrom(req));
    assertCanEdit(article, req.user);
    await article.deleteOne();
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    sendError(res, error);
  }
}

router.delete('/articles/:id', deleteArticle);
router.delete('/articles', deleteArticle);

// Approval workflow (editors and admins).
router.post('/articles/:id/approve', requireReviewer, async (req, res) => {
  try {
    const article = await loadArticle(req.params.id);
    transition(article, 'published', req.user, req.body?.note);
    await article.save();
    res.json(article);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/articles/:id/reject', requireReviewer, async (req, res) => {
  try {
    const note = (req.body?.note || '').trim();
    if (!note) throw new HttpError(400, 'Add a note so the author knows what to change');
    const article = await loadArticle(req.params.id);
    transition(article, 'rejected', req.user, note);
    await article.save();
    res.json(article);
  } catch (error) {
    sendError(res, error);
  }
});

/* ------------------------------------------------------------------ */
/* Users (admins only)                                                 */
/* ------------------------------------------------------------------ */

const MIN_PASSWORD = 8;

const userOut = (u) => ({
  _id: u._id,
  username: u.username,
  email: u.email,
  role: u.role,
  hasPassword: Boolean(u.passwordHash),
  createdAt: u.createdAt,
});

async function assertNotLastAdmin(user) {
  if (user.role !== 'admin') return;
  const admins = await User.countDocuments({ role: 'admin' });
  if (admins <= 1) throw new HttpError(400, 'There must be at least one admin');
}

function checkPassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD} characters`);
  }
}

function checkRole(role) {
  if (!ROLES.includes(role)) throw new HttpError(400, `Role must be one of: ${ROLES.join(', ')}`);
}

router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('+passwordHash').sort({ createdAt: 1 }).lean();
    res.json(users.map(userOut));
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role = 'author' } = req.body || {};
    if (!username?.trim()) throw new HttpError(400, 'Username is required');
    if (!/^\S+@\S+\.\S+$/.test(email || '')) throw new HttpError(400, 'A valid email is required');
    checkPassword(password);
    checkRole(role);

    const user = await User.create({
      username: username.trim(),
      email,
      role,
      passwordHash: await bcrypt.hash(password, 12),
    });
    res.status(201).json(userOut(user));
  } catch (error) {
    sendError(res, error);
  }
});

router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    if (!isId(req.params.id)) throw new HttpError(404, 'User not found');
    const user = await User.findById(req.params.id).select('+passwordHash');
    if (!user) throw new HttpError(404, 'User not found');

    const { username, email, role, password } = req.body || {};
    if (username !== undefined) {
      if (!username.trim()) throw new HttpError(400, 'Username is required');
      user.username = username.trim();
    }
    if (email !== undefined) {
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'A valid email is required');
      user.email = email;
    }
    if (role !== undefined && role !== user.role) {
      checkRole(role);
      await assertNotLastAdmin(user);
      user.role = role;
    }
    if (password) {
      checkPassword(password);
      user.passwordHash = await bcrypt.hash(password, 12);
    }

    await user.save();
    res.json(userOut(user));
  } catch (error) {
    sendError(res, error);
  }
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    if (!isId(req.params.id)) throw new HttpError(404, 'User not found');
    if (req.user._id.equals(req.params.id)) throw new HttpError(400, 'You cannot delete your own account');
    const user = await User.findById(req.params.id);
    if (!user) throw new HttpError(404, 'User not found');
    await assertNotLastAdmin(user);
    await user.deleteOne();
    res.json({ message: 'User deleted' });
  } catch (error) {
    sendError(res, error);
  }
});

/* ------------------------------------------------------------------ */
/* Newsletters & subscribers (editors and admins)                      */
/* ------------------------------------------------------------------ */

router.get('/newsletter/subscribers', requireReviewer, async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 });
    res.json(subscribers);
  } catch (error) {
    sendError(res, error);
  }
});

router.delete('/newsletter/subscribers/:id', requireReviewer, async (req, res) => {
  try {
    const subscriber = await Subscriber.findByIdAndDelete(req.params.id);
    if (!subscriber) return res.status(404).json({ error: 'Subscriber not found' });
    res.json({ message: 'Subscriber deleted successfully' });
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/newsletter', requireReviewer, async (req, res) => {
  try {
    const newsletters = await NewsletterIssue.find().sort({ createdAt: -1 }).lean();
    res.json(newsletters);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/newsletter', requireReviewer, upload.single('pdf'), async (req, res) => {
  try {
    const { title, message } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'PDF file is required' });
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const newsletter = new NewsletterIssue({
      title,
      message,
      description: message,
      fileUrl: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      fileName: file.originalname,
      fileSize: file.size
    });
    await newsletter.save();
    res.status(201).json(newsletter);
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/newsletter/:id', requireReviewer, async (req, res) => {
  try {
    const newsletter = await NewsletterIssue.findById(req.params.id).lean();
    if (!newsletter) return res.status(404).json({ error: 'Newsletter not found' });
    res.json(newsletter);
  } catch (error) {
    sendError(res, error);
  }
});

router.put('/newsletter/:id', requireReviewer, upload.single('pdf'), async (req, res) => {
  try {
    const { title, message } = req.body;
    const updateData = { title, message, description: message };
    if (req.file) {
      updateData.fileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      updateData.fileName = req.file.originalname;
      updateData.fileSize = req.file.size;
    }
    const newsletter = await NewsletterIssue.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!newsletter) return res.status(404).json({ error: 'Newsletter not found' });
    res.json(newsletter);
  } catch (error) {
    sendError(res, error);
  }
});

router.delete('/newsletter/:id', requireReviewer, async (req, res) => {
  try {
    const newsletter = await NewsletterIssue.findByIdAndDelete(req.params.id);
    if (!newsletter) return res.status(404).json({ error: 'Newsletter not found' });
    res.json({ message: 'Newsletter deleted successfully' });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/newsletter/:id/send', requireReviewer, async (req, res) => {
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

    await NewsletterIssue.findByIdAndUpdate(req.params.id, { sentAt: new Date(), sentCount });
    res.json({ message: `Newsletter sent to ${sentCount} of ${subscribers.length} subscribers`, sentCount });
  } catch (error) {
    sendError(res, error);
  }
});

// Multer errors (wrong file type, too large) arrive here.
// eslint-disable-next-line no-unused-vars
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError || error.message === 'Only PDF files are allowed') {
    return res.status(400).json({ error: error.message });
  }
  sendError(res, error);
});

export default router;
