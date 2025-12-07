import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  subtitle: String,
  slug: {
    type: String,
    unique: true,
    required: true,
  },
  category: {
    type: String,
    enum: ['Namibia', 'South Africa', 'Global Markets', 'Crypto', 'Investing Guides', 'Housing & Personal Finance', 'Business & Entrepreneurship'],
    required: true,
  },
  tags: [String],
  thumbnail: String,
  thumbnailAlt: String,
  content: {
    type: String,
    required: true,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
  },
  publishDate: Date,
}, {
  timestamps: true,
});

articleSchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

export default mongoose.model('Article', articleSchema);