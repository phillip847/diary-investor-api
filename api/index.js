import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Basic routes for testing
app.get('/api/articles', (req, res) => {
  res.json({ message: 'Articles endpoint - database not configured for production' });
});

app.get('/api/pages/:page', (req, res) => {
  res.json({ message: 'Pages endpoint - database not configured for production' });
});

// Serverless handler
export default (req, res) => {
  return app(req, res);
};