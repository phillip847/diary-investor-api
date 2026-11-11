import mongoose from 'mongoose';

export const ARTICLE_STATUSES = ['draft', 'pending', 'published', 'rejected'];

// Drafts may be incomplete; anything submitted or live needs a category and body.
function requiredUnlessDraft() {
  return this.status === 'pending' || this.status === 'published';
}

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
    enum: ['Namibia', 'South Africa', 'Global Markets', 'Crypto', 'Investing Guides', 'Housing & Personal Finance', 'Business & Entrepreneurship', 'education'],
    required: [requiredUnlessDraft, 'Choose a category before submitting or publishing'],
  },
  tags: [String],
  thumbnail: String,
  thumbnailAlt: String,
  content: {
    type: String,
    default: '',
    validate: {
      validator(value) {
        if (!requiredUnlessDraft.call(this)) return true;
        return Boolean((value || '').replace(/<[^>]*>/g, '').trim());
      },
      message: 'Add some content before submitting or publishing',
    },
  },
  featured: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ARTICLE_STATUSES,
    default: 'draft',
  },
  publishDate: Date,

  // Authorship and review trail. Older articles predate these fields.
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: String,
  submittedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedByName: String,
  reviewedAt: Date,
  reviewNote: String,
}, {
  timestamps: true,
});

articleSchema.pre('validate', function(next) {
  if (!this.slug && this.title) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

// Performance indexes
articleSchema.index({ category: 1, status: 1 });
articleSchema.index({ status: 1, publishDate: -1 });
articleSchema.index({ featured: 1, status: 1 });
articleSchema.index({ createdAt: -1 });
articleSchema.index({ author: 1, status: 1 });

export default mongoose.model('Article', articleSchema);
