import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  // bcrypt hash; excluded from queries unless explicitly selected
  passwordHash: {
    type: String,
    select: false,
  },
  role: {
    type: String,
    enum: ['admin'],
    default: 'admin',
  },
}, {
  timestamps: true,
});

export default mongoose.model('User', userSchema);