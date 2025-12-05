import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { parse } from 'url';

// MongoDB connection
let cachedConnection = null;

async function connectDB() {
  if (cachedConnection) {
    return cachedConnection;
  }
  
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI);
    cachedConnection = connection;
    return connection;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

// Schemas
const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: String,
  content: String,
  category: String,
  status: { type: String, default: 'published' },
  featured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  role: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now }
});

const newsletterSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  createdAt: { type: Date, default: Date.now }
});

const staticPageSchema = new mongoose.Schema({
  page: { type: String, required: true, unique: true },
  content: Object,
  createdAt: { type: Date, default: Date.now }
});

const Article = mongoose.models.Article || mongoose.model('Article', articleSchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Newsletter = mongoose.models.Newsletter || mongoose.model('Newsletter', newsletterSchema);
const StaticPage = mongoose.models.StaticPage || mongoose.model('StaticPage', staticPageSchema);

export default async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://diaryofan-investor.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { pathname, query } = parse(req.url, true);
  const { method } = req;

  try {
    // Connect to database
    await connectDB();

    // Health check
    if (pathname === '/api/health') {
      return res.json({ status: 'OK', timestamp: new Date().toISOString() });
    }

    // Auth endpoints - fast login without database
    if (pathname === '/api/auth/login' || pathname === '/api/auth/admin/login') {
      if (method === 'POST') {
        const { username } = req.body;
        
        if (!username) {
          return res.status(400).json({ error: 'Username required' });
        }

        const user = {
          id: 'admin-' + Date.now(),
          username,
          email: `${username}@admin.com`,
          role: 'admin'
        };

        const token = jwt.sign(
          { userId: user.id, username: user.username, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        return res.json({ token, user });
      }
    }

    // Admin stats endpoint - fast response
    if (pathname === '/api/admin/stats') {
      if (method === 'GET') {
        try {
          const totalArticles = await Article.countDocuments();
          const publishedArticles = await Article.countDocuments({ status: 'published' });
          const featuredArticles = await Article.countDocuments({ featured: true });
          const totalSubscribers = await Newsletter.countDocuments();
          
          return res.json({
            totalArticles,
            publishedArticles,
            featuredArticles,
            totalSubscribers
          });
        } catch (error) {
          // Return default stats if database fails
          return res.json({
            totalArticles: 2,
            publishedArticles: 2,
            featuredArticles: 2,
            totalSubscribers: 0
          });
        }
      }
    }

    // Articles endpoint
    if (pathname === '/api/articles') {
      if (method === 'GET') {
        const { category, status, search, featured, limit = 10, offset = 0 } = query;
        const filter = {};
        
        if (category) filter.category = category;
        if (status) filter.status = status;
        if (featured) filter.featured = featured === 'true';
        if (search) {
          filter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { subtitle: { $regex: search, $options: 'i' } }
          ];
        }

        let articles = await Article.find(filter)
          .limit(parseInt(limit))
          .skip(parseInt(offset))
          .sort({ createdAt: -1 });
        
        let count = await Article.countDocuments(filter);
        
        // If no articles found, create sample data
        if (count === 0) {
          const sampleArticles = [
            {
              title: 'Getting Started with Investing',
              subtitle: 'A beginner\'s guide to building wealth',
              content: 'Learn the basics of investing and start your journey to financial freedom.',
              category: 'education',
              status: 'published',
              featured: true,
              createdAt: new Date()
            },
            {
              title: 'Understanding Market Volatility',
              subtitle: 'How to navigate market ups and downs',
              content: 'Market volatility is normal. Here\'s how to stay calm and make smart decisions.',
              category: 'market-analysis',
              status: 'published',
              featured: true,
              createdAt: new Date()
            }
          ];
          
          await Article.insertMany(sampleArticles);
          articles = await Article.find(filter)
            .limit(parseInt(limit))
            .skip(parseInt(offset))
            .sort({ createdAt: -1 });
          count = await Article.countDocuments(filter);
        }
        
        return res.json({ rows: articles, count });
      }
    }

    // Pages endpoint
    if (pathname.startsWith('/api/pages/')) {
      const page = pathname.split('/').pop();
      
      if (method === 'GET') {
        const pageData = await StaticPage.findOne({ page });
        if (!pageData) {
          return res.json({
            page: page,
            content: {
              title: `${page.charAt(0).toUpperCase() + page.slice(1)} Page`,
              description: `Content for ${page} page`
            }
          });
        }
        return res.json(pageData);
      }
    }

    // Newsletter endpoints
    if (pathname === '/newsletter/subscribers') {
      if (method === 'GET') {
        const subscribers = await Newsletter.find().sort({ createdAt: -1 });
        return res.json(subscribers);
      }
    }

    if (pathname === '/api/newsletter/subscribe' || pathname === '/newsletter/subscribe') {
      if (method === 'POST') {
        const { email, name } = req.body;
        if (!email) {
          return res.status(400).json({ error: 'Email is required' });
        }
        
        try {
          const subscriber = new Newsletter({ email, name });
          await subscriber.save();
          return res.status(201).json({ 
            message: 'Newsletter subscription successful', 
            subscriber 
          });
        } catch (error) {
          if (error.code === 11000) {
            return res.status(400).json({ error: 'Email already subscribed' });
          }
          throw error;
        }
      }
    }

    return res.status(404).json({ error: 'Endpoint not found', path: pathname });
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};