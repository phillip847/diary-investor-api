import mongoose from 'mongoose';

// One "Send" of a newsletter issue to subscribers, with the outcome for each
// recipient. "sent" means the email service accepted the message; "failed"
// means it was rejected (bad address, quota, missing PDF...) with the reason.
const recipientSchema = new mongoose.Schema({
  email: { type: String, required: true },
  status: { type: String, enum: ['sent', 'failed'], required: true },
  error: String,
}, { _id: false });

const newsletterSendSchema = new mongoose.Schema({
  issue: { type: mongoose.Schema.Types.ObjectId, ref: 'NewsletterIssue', index: true },
  title: String, // kept so history survives the issue being deleted
  sentBy: String,
  total: { type: Number, default: 0 },
  sent: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  recipients: [recipientSchema],
  createdAt: { type: Date, default: Date.now, index: true },
}, { versionKey: false });

export default mongoose.model('NewsletterSend', newsletterSendSchema);
