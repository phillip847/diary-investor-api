import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  // bcrypt hash; excluded from queries unless explicitly selected
  passwordHash: {
    type: String,
    select: false,
  },
  role: {
    type: String,
    enum: ['admin', 'editor', 'author'],
    default: 'author',
  },
}, {
  timestamps: true,
});

export default mongoose.model('User', userSchema);
