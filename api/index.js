import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from '../config/database.js';
import Newsletter from '../models/Newsletter.js';
import articlesRouter from '../routes/articles.js';
import pagesRouter from '../routes/pages.js';
import newsletterRouter from '../routes/newsletter.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/articles', articlesRouter);
app.use('/api/pages', pagesRouter);
app.use('/api/newsletter', newsletterRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: process.env.VERCEL ? 'mock' : 'connected'
  });
});

// Mock data endpoint for serverless
if (process.env.VERCEL) {
  app.get('/api/pages/hero', (req, res) => {
    res.json({
      page: 'hero',
      content: {
        title: 'Welcome to Diary Investor',
        subtitle: 'Your investment journey starts here'
      }
    });
  });
}

// Initialize database
let dbInitialized = false;
const initDB = async () => {
  if (!dbInitialized) {
    try {
      // Skip DB connection in serverless if no cloud DB
      if (process.env.VERCEL && !process.env.DB_HOST?.includes('planetscale')) {
        console.log('Skipping DB connection in serverless environment');
        dbInitialized = true;
        return;
      }
      await sequelize.authenticate();
      await sequelize.sync({ force: false });
      dbInitialized = true;
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection failed:', error.message);
      // Don't throw in serverless, just log
      if (process.env.VERCEL) {
        console.log('Running in mock mode without database');
        dbInitialized = true;
      } else {
        throw error;
      }
    }
  }
};

// Serverless handler
export default async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Skip DB init if it's just a health check
    if (req.url !== '/api/health') {
      await initDB();
    }
    return app(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};