export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://diaryofan-investor.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.json({
      totalArticles: 2,
      publishedArticles: 2,
      featuredArticles: 2,
      totalSubscribers: 0,
      totalBookings: 0,
      pendingBookings: 0,
      completedBookings: 0
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}