import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import articlesRouter from './routes/articles.js';
import pagesRouter from './routes/pages.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Diary Investor API', status: 'running' });
});

// Routes
app.use('/api/articles', articlesRouter);
app.use('/api/pages', pagesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize database
connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;