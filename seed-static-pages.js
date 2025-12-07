import mongoose from 'mongoose';
import dotenv from 'dotenv';
import StaticPage from './models/StaticPage.js';

dotenv.config();

const pages = [
  {
    page: 'about',
    content: {
      title: 'About Us',
      body: '<p>Welcome to Diary of an Investor</p>',
      sections: []
    }
  },
  {
    page: 'contact',
    content: {
      title: 'Contact Us',
      email: 'contact@diaryinvestor.com',
      body: '<p>Get in touch with us</p>'
    }
  },
  {
    page: 'newsletter',
    content: {
      title: 'Newsletter',
      description: 'Subscribe to our newsletter',
      body: '<p>Stay updated with market insights</p>'
    }
  },
  {
    page: 'book-session',
    content: {
      title: 'Book a Session',
      description: 'Schedule a consultation',
      body: '<p>Book your investment consultation</p>'
    }
  },
  {
    page: 'tools',
    content: {
      title: 'Investment Tools',
      description: 'Financial calculators and tools',
      body: '<p>Access our investment tools</p>',
      tools: []
    }
  }
];

async function seedPages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const pageData of pages) {
      await StaticPage.findOneAndUpdate(
        { page: pageData.page },
        pageData,
        { upsert: true, new: true }
      );
      console.log(`✓ Seeded ${pageData.page} page`);
    }

    console.log('All pages seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding pages:', error);
    process.exit(1);
  }
}

seedPages();
