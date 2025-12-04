// Serverless handler with mock data
export default async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, method } = req;

  try {
    // Health check
    if (url === '/api/health') {
      return res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        mode: 'serverless'
      });
    }

    // Hero section
    if (url === '/api/pages/hero') {
      return res.json({
        page: 'hero',
        content: {
          title: 'Welcome to Diary Investor',
          subtitle: 'Your investment journey starts here'
        }
      });
    }

    // Mock articles
    if (url.startsWith('/api/articles')) {
      return res.json({
        rows: [
          {
            id: 1,
            title: 'Getting Started with Investing',
            subtitle: 'A beginner\'s guide',
            category: 'education',
            status: 'published',
            featured: true,
            createdAt: new Date().toISOString()
          }
        ],
        count: 1
      });
    }

    // Mock pages
    if (url.startsWith('/api/pages')) {
      return res.json({
        page: 'about',
        content: {
          title: 'About Us',
          description: 'Learn more about Diary Investor'
        }
      });
    }

    // Newsletter endpoint
    if (url.startsWith('/api/newsletter')) {
      if (method === 'POST') {
        return res.status(201).json({ message: 'Subscribed successfully' });
      }
      return res.json({ subscribers: 0 });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};