import connectDB from '../config/database.js';
import SessionBooking from '../models/SessionBooking.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectDB();
    
    if (req.method === 'GET') {
      const sessions = await SessionBooking.find().sort({ createdAt: -1 });
      return res.json(sessions);
    }
    
    if (req.method === 'POST') {
      const session = new SessionBooking(req.body);
      await session.save();
      return res.status(201).json(session);
    }
    
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}