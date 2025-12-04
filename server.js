import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/database.js';
import Article from './models/Article.js';
import StaticPage from './models/StaticPage.js';
import articlesRouter from './routes/articles.js';
import pagesRouter from './routes/pages.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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

// Initialize database
const initDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    
    await sequelize.sync({ force: false });
    console.log('Database synced successfully.');
  } catch (error) {
    console.error('Unable to connect to database:', error);
  }
};

initDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;