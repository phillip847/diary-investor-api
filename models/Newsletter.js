import mongoose from 'mongoose';

const subscriberSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
}, {
  timestamps: true,
});

const newsletterIssueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  message: String, // For admin message/description
  fileUrl: {
    type: String,
    required: true,
  },
  fileName: String,
  fileSize: Number,
  issueDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'published',
  },
  sentAt: Date, // Track when newsletter was sent
  sentCount: { type: Number, default: 0 }, // Track how many emails were sent
}, {
  timestamps: true,
});

export const Subscriber = mongoose.model('Subscriber', subscriberSchema);
export const NewsletterIssue = mongoose.model('NewsletterIssue', newsletterIssueSchema);
export default Subscriber;