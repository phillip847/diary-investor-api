import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  company: { type: String },
  partnershipType: { type: String },
  message: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['new', 'read', 'responded'], default: 'new' }
});

export const Contact = mongoose.models.Contact || mongoose.model('Contact', contactSchema);