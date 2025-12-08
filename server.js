import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import articlesRouter from './routes/articles.js';
import pagesRouter from './routes/pages.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import newsletterRouter from './routes/newsletter.js';
import sessionsRouter from './routes/sessions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(compression());
app.use(cors({
  origin: ['https://diaryofan-investor.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Diary Investor API', status: 'running' });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/pages', pagesRouter);
app.use('/api/admin', adminRouter);
app.use('/newsletter', newsletterRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/sessions', sessionsRouter);

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