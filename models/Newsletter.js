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
}, {
  timestamps: true,
});

export const Subscriber = mongoose.model('Subscriber', subscriberSchema);
export const NewsletterIssue = mongoose.model('NewsletterIssue', newsletterIssueSchema);
export default Subscriber;