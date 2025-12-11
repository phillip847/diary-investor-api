import { NewsletterIssue } from '../../models/Newsletter.js';
import connectDB from '../../config/database.js';
import multer from 'multer';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await connectDB();

  if (req.method === 'GET') {
    try {
      const newsletters = await NewsletterIssue.find().sort({ createdAt: -1 }).lean();
      res.json(newsletters);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { title, message, fileUrl, fileName, fileSize } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }
      
      if (!fileUrl) {
        return res.status(400).json({ error: 'PDF file is required' });
      }

      const newsletter = new NewsletterIssue({
        title,
        message,
        description: message,
        fileUrl,
        fileName,
        fileSize
      });

      await newsletter.save();
      res.status(201).json(newsletter);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}