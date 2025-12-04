import mongoose from 'mongoose';

const staticPageSchema = new mongoose.Schema({
  page: {
    type: String,
    enum: ['about', 'contact', 'newsletter', 'book-session', 'tools'],
    unique: true,
    required: true,
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
}, {
  timestamps: true,
});

export default mongoose.model('StaticPage', staticPageSchema);