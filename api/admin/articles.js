import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

let cachedConnection = null;

async function connectDB() {
  if (cachedConnection) return cachedConnection;
  const connection = await mongoose.connect(process.env.MONGODB_URI);
  cachedConnection = connection;
  return connection;
}

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: String,
  slug: { type: String, unique: true, required: true },
  category: { type: String, enum: ['Namibia', 'South Africa', 'Global Markets', 'Crypto', 'Investing Guides', 'Housing & Personal Finance', 'Business & Entrepreneurship'], required: true },
  tags: [String],
  thumbnail: String,
  thumbnailAlt: String,
  content: { type: String, required: true },
  featured: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  publishDate: Date,
}, { timestamps: true });

const Article = mongoose.models.Article || mongoose.model('Article', articleSchema);

const authenticate = (req) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  if (!token) throw new Error('No token');
  return jwt.verify(token, process.env.JWT_SECRET);
};

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://diaryofan-investor.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    authenticate(req);
    await connectDB();

    const { id } = req.query;

    if (req.method === 'GET' && !id) {
      const { category, status, search, limit = 50, offset = 0 } = req.query;
      const filter = {};
      if (category) filter.category = category;
      if (status) filter.status = status;
      if (search) filter.$or = [{ title: { $regex: search, $options: 'i' } }, { subtitle: { $regex: search, $options: 'i' } }];

      const articles = await Article.find(filter).limit(parseInt(limit)).skip(parseInt(offset)).sort({ createdAt: -1 });
      const count = await Article.countDocuments(filter);
      return res.json({ rows: articles, count });
    }

    if (req.method === 'GET' && id) {
      if (!id || id === 'undefined') return res.status(400).json({ error: 'Invalid article ID' });
      const article = await Article.findById(id);
      if (!article) return res.status(404).json({ error: 'Article not found' });
      return res.json(article);
    }

    if (req.method === 'POST') {
      const data = { ...req.body };
      if (!data.slug) data.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (data.status === 'published' && !data.publishDate) data.publishDate = new Date();
      const article = new Article(data);
      await article.save();
      return res.status(201).json(article);
    }

    if (req.method === 'PUT' && id) {
      if (!id || id === 'undefined') return res.status(400).json({ error: 'Invalid article ID' });
      const data = { ...req.body };
      const existing = await Article.findById(id);
      if (data.status === 'published' && existing.status === 'draft' && !data.publishDate) {
        data.publishDate = new Date();
      }
      const article = await Article.findByIdAndUpdate(id, data, { new: true, runValidators: true });
      if (!article) return res.status(404).json({ error: 'Article not found' });
      return res.json(article);
    }

    if (req.method === 'DELETE' && id) {
      if (!id || id === 'undefined') return res.status(400).json({ error: 'Invalid article ID' });
      const article = await Article.findByIdAndDelete(id);
      if (!article) return res.status(404).json({ error: 'Article not found' });
      return res.status(204).end();
    }

    return res.status(400).json({ error: 'Invalid request' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(error.message === 'No token' ? 401 : 500).json({ error: error.message });
  }
};
