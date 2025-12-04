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

// Initialize database connection (lazy)
let dbInitialized = false;
const initDB = async () => {
  if (!dbInitialized) {
    try {
      await sequelize.authenticate();
      await sequelize.sync({ force: false });
      dbInitialized = true;
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }
};

// Serverless handler
export default async (req, res) => {
  try {
    await initDB();
    return app(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};