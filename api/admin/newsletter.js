import { NewsletterIssue } from '../../models/Newsletter.js';
import connectDB from '../../config/database.js';
import multer from 'multer';
import { promisify } from 'util';

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

const uploadMiddleware = promisify(upload.single('pdf'));

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
      // Handle file upload
      await uploadMiddleware(req, res);
      
      const { title, message } = req.body;
      const file = req.file;
      
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }
      
      let fileUrl, fileName, fileSize;
      
      if (file) {
        // Convert file to base64 for MongoDB storage
        fileUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        fileName = file.originalname;
        fileSize = file.size;
      } else {
        // Handle JSON data (when file is sent as base64 in body)
        fileUrl = req.body.fileUrl || `data:application/pdf;base64,placeholder`;
        fileName = req.body.fileName || 'newsletter.pdf';
        fileSize = req.body.fileSize || 0;
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
      console.error('Newsletter creation error:', error);
      if (error.message === 'Only PDF files are allowed') {
        return res.status(400).json({ error: 'Only PDF files are allowed' });
      }
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