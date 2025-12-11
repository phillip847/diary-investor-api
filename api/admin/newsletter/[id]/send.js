import { NewsletterIssue, Subscriber } from '../../../../models/Newsletter.js';
import connectDB from '../../../../config/database.js';
import { sendNewsletterEmail } from '../../../../utils/email.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await connectDB();

  const { id } = req.query;

  if (req.method === 'POST') {
    try {
      const newsletter = await NewsletterIssue.findById(id);
      if (!newsletter) return res.status(404).json({ error: 'Newsletter not found' });
      
      const subscribers = await Subscriber.find({ status: 'active' });
      let sentCount = 0;
      
      for (const subscriber of subscribers) {
        try {
          await sendNewsletterEmail(subscriber.email, newsletter);
          sentCount++;
        } catch (emailError) {
          console.error(`Failed to send to ${subscriber.email}:`, emailError);
        }
      }
      
      // Update newsletter with sent info
      await NewsletterIssue.findByIdAndUpdate(id, {
        sentAt: new Date(),
        sentCount
      });
      
      res.json({ message: `Newsletter sent to ${sentCount} of ${subscribers.length} subscribers` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}