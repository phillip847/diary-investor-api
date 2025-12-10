export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const categories = [
    'Namibia',
    'South Africa', 
    'Global Markets',
    'Crypto',
    'Investing Guides',
    'Housing & Personal Finance',
    'Business & Entrepreneurship'
  ];

  res.json({ categories });
}