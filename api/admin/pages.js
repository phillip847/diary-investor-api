import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

let cachedConnection = null;

async function connectDB() {
  if (cachedConnection) return cachedConnection;
  const connection = await mongoose.connect(process.env.MONGODB_URI);
  cachedConnection = connection;
  return connection;
}

const staticPageSchema = new mongoose.Schema({
  page: { type: String, required: true, unique: true },
  content: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

const StaticPage = mongoose.models.StaticPage || mongoose.model('StaticPage', staticPageSchema);

const authenticate = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error('No token');
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
  if (!token || token === 'undefined' || token === 'null') throw new Error('Invalid token');
  return jwt.verify(token, process.env.JWT_SECRET);
};

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://diaryofan-investor.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    authenticate(req);
    await connectDB();

    const { page } = req.query;

    if (req.method === 'PUT' && page) {
      const updatedPage = await StaticPage.findOneAndUpdate(
        { page },
        { content: req.body.content },
        { new: true, upsert: true }
      );
      return res.json(updatedPage);
    }

    return res.status(400).json({ error: 'Invalid request' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(error.message === 'No token' ? 401 : 500).json({ error: error.message });
  }
};
