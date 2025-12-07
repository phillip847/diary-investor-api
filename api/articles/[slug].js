import mongoose from 'mongoose';

let cachedConnection = null;

async function connectDB() {
  if (cachedConnection) return cachedConnection;
  const connection = await mongoose.connect(process.env.MONGODB_URI);
  cachedConnection = connection;
  return connection;
}

const articleSchema = new mongoose.Schema({
  title: String,
  subtitle: String,
  slug: String,
  category: String,
  tags: [String],
  thumbnail: String,
  thumbnailAlt: String,
  content: String,
  featured: Boolean,
  status: String,
  publishDate: Date,
}, { timestamps: true });

const Article = mongoose.models.Article || mongoose.model('Article', articleSchema);

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();
    const { slug } = req.query;
    
    const article = await Article.findOne({ slug });
    if (!article) return res.status(404).json({ error: 'Article not found' });
    
    return res.json(article);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
