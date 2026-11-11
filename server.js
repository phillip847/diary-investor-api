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
import contactRouter from './routes/contact.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(compression());

// CORS configuration - Allow all origins
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Make sure the database is connected before any handler runs.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch {
    res.status(503).json({ error: 'Database unavailable, please try again shortly' });
  }
});

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
app.use('/api/contact', contactRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Listen everywhere except on Vercel, which invokes the exported app itself
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;