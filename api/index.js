import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from '../config/database.js';
import articlesRouter from '../routes/articles.js';
import pagesRouter from '../routes/pages.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/articles', articlesRouter);
app.use('/api/pages', pagesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Newsletter endpoint
app.post('/api/newsletter', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  res.json({ message: 'Newsletter subscription successful', email });
});

// Initialize database
let dbInitialized = false;
const initDB = async () => {
  if (!dbInitialized) {
    try {
      await sequelize.authenticate();
      await sequelize.sync({ force: false });
      dbInitialized = true;
    } catch (error) {
      console.error('Database connection failed:', error.message);
    }
  }
};

// Serverless handler
export default async (req, res) => {
  try {
    await initDB();
  } catch (error) {
    console.error('DB init error:', error);
  }
  return app(req, res);
};