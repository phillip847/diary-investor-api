// Simple serverless API without database dependencies
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
        timestamp: new Date().toISOString()
      });
    }

    // Hero section
    if (url === '/api/pages/hero') {
      return res.json({
        page: 'hero',
        content: {
          title: 'Welcome to Diary Investor',
          subtitle: 'Your investment journey starts here',
          description: 'Track your investments and build wealth with our comprehensive platform.'
        }
      });
    }

    // Articles endpoint
    if (url.startsWith('/api/articles')) {
      if (method === 'GET') {
        return res.json({
          rows: [
            {
              id: 1,
              title: 'Getting Started with Investing',
              subtitle: 'A beginner\'s guide to building wealth',
              category: 'education',
              status: 'published',
              featured: true,
              createdAt: new Date().toISOString()
            },
            {
              id: 2,
              title: 'Understanding Market Volatility',
              subtitle: 'How to navigate market ups and downs',
              category: 'market-analysis',
              status: 'published',
              featured: false,
              createdAt: new Date().toISOString()
            }
          ],
          count: 2
        });
      }
    }

    // Pages endpoint
    if (url.startsWith('/api/pages')) {
      const page = url.split('/').pop();
      return res.json({
        page: page,
        content: {
          title: `${page.charAt(0).toUpperCase() + page.slice(1)} Page`,
          description: `Content for ${page} page`
        }
      });
    }

    // Newsletter endpoint
    if (url.startsWith('/api/newsletter')) {
      if (method === 'POST') {
        return res.status(201).json({ 
          message: 'Successfully subscribed to newsletter',
          success: true 
        });
      }
      return res.json({ subscribers: 150 });
    }

    return res.status(404).json({ error: 'Endpoint not found' });
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};