import mongoose from 'mongoose';

// One anonymous page view on the public website. No IP address or cookie is
// stored: visitorId is a random id the browser keeps in localStorage.
const pageViewSchema = new mongoose.Schema({
  path: { type: String, required: true },
  articleSlug: String,
  referrer: String, // host only, e.g. "google.com"; empty for direct visits
  device: { type: String, enum: ['mobile', 'tablet', 'desktop'], default: 'desktop' },
  visitorId: String,
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

pageViewSchema.index({ articleSlug: 1, createdAt: -1 });
// Keep roughly 13 months of history.
pageViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 400 * 24 * 60 * 60, name: 'ttl_createdAt' });

export default mongoose.model('PageView', pageViewSchema);
