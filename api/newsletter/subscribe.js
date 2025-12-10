import connectDB from '../../config/database.js';
import { Subscriber } from '../../models/Newsletter.js';
import sgMail from '@sendgrid/mail';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Newsletter subscription request:', req.body);
  console.log('SendGrid API Key exists:', !!process.env.SENDGRID_API_KEY);
  console.log('SendGrid From Email:', process.env.SENDGRID_FROM_EMAIL);

  try {
    await connectDB();
    
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    console.log('Saving subscriber to database...');
    const subscriber = new Subscriber({ email, name });
    await subscriber.save();
    console.log('Subscriber saved successfully');
    
    // Send welcome email
    if (process.env.SENDGRID_API_KEY) {
      console.log('Attempting to send welcome email...');
      try {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        
        const msg = {
          to: email,
          from: process.env.SENDGRID_FROM_EMAIL,
          subject: 'Welcome to Diary of an Investor Newsletter!',
          text: `Welcome ${name || 'there'}! Thank you for subscribing to the Diary of an Investor newsletter.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Welcome ${name || 'there'}!</h2>
              <p>Thank you for subscribing to the Diary of an Investor newsletter.</p>
              <p>You'll receive our latest insights on investing, market analysis, and financial tips directly in your inbox.</p>
              <p>Best regards,<br><strong>The Diary of an Investor Team</strong></p>
            </div>
          `
        };
        
        console.log('Sending email to:', email);
        await sgMail.send(msg);
        console.log('Welcome email sent successfully!');
      } catch (emailError) {
        console.error('SendGrid error:', emailError.message);
      }
    }
    
    res.status(201).json({ message: 'Newsletter subscription successful', subscriber });
  } catch (error) {
    console.error('Subscription error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already subscribed' });
    }
    res.status(400).json({ error: error.message });
  }
}