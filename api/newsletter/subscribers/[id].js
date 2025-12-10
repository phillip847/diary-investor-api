import connectDB from '../../../config/database.js';
import { Subscriber } from '../../../models/Newsletter.js';
import jwt from 'jsonwebtoken';
import User from '../../../models/User.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Admin access required' });
    }

    await connectDB();
    
    const { id } = req.query;
    const subscriber = await Subscriber.findByIdAndDelete(id);
    
    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }
    
    res.json({ message: 'Subscriber deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}