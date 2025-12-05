import mongoose from 'mongoose';

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
  title: String,
  status: String,
  featured: Boolean,
  createdAt: Date
});

const newsletterSchema = new mongoose.Schema({
  email: String,
  createdAt: Date
});

const Article = mongoose.models.Article || mongoose.model('Article', articleSchema);
const Newsletter = mongoose.models.Newsletter || mongoose.model('Newsletter', newsletterSchema);

export default async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://diaryofan-investor.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();
    
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
    console.error('Admin stats error:', error);
    // Return fallback data if DB fails
    return res.json({
      totalArticles: 0,
      publishedArticles: 0,
      featuredArticles: 0,
      totalSubscribers: 0
    });
  }
};