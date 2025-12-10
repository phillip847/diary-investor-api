import connectDB from '../../config/database.js';
import { Subscriber } from '../../models/Newsletter.js';
import { verifyToken } from '../../middleware/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  // Handle DELETE /api/newsletter/subscribers/[id]
  if (req.method === 'DELETE' && id) {
    try {
      const authResult = verifyToken(req);
      if (!authResult.success) {
        return res.status(401).json({ error: authResult.error });
      }

      await connectDB();
      const subscriber = await Subscriber.findByIdAndDelete(id);
      
      if (!subscriber) {
        return res.status(404).json({ error: 'Subscriber not found' });
      }
      
      return res.json({ message: 'Subscriber deleted successfully' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Handle GET /api/newsletter/subscribers
  if (req.method === 'GET') {
    try {
      await connectDB();
      
      const subscribers = await Subscriber.find().sort({ createdAt: -1 });
      res.json(subscribers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}