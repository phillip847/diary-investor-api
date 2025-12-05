import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: String,
  content: String,
  category: String,
  status: { type: String, default: 'published' },
  featured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Article = mongoose.models.Article || mongoose.model('Article', articleSchema);

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Clear existing articles
    await Article.deleteMany({});
    
    // Add sample articles
    const articles = [
      {
        title: 'Getting Started with Investing',
        subtitle: 'A beginner\'s guide to building wealth',
        content: 'Learn the basics of investing and start your journey to financial freedom.',
        category: 'education',
        status: 'published',
        featured: true
      },
      {
        title: 'Understanding Market Volatility',
        subtitle: 'How to navigate market ups and downs',
        content: 'Market volatility is normal. Here\'s how to stay calm and make smart decisions.',
        category: 'market-analysis',
        status: 'published',
        featured: true
      },
      {
        title: 'Diversification Strategies',
        subtitle: 'Don\'t put all your eggs in one basket',
        content: 'Learn how to spread risk across different asset classes.',
        category: 'strategy',
        status: 'published',
        featured: false
      }
    ];
    
    await Article.insertMany(articles);
    console.log('Sample data seeded successfully');
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

seedData();