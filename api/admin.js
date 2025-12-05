export default async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://diaryofan-investor.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Return static stats for fast loading
    return res.json({
      totalArticles: 3,
      publishedArticles: 3,
      featuredArticles: 2,
      totalSubscribers: 0
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch stats',
      message: error.message 
    });
  }
};