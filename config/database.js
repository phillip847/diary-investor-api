import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Reuse one connection across requests (and across warm serverless invocations).
let connecting = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connecting) {
    connecting = mongoose
      .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/diary_investor')
      .then((m) => {
        console.log('MongoDB connected');
        return m.connection;
      })
      .catch((error) => {
        connecting = null; // allow a retry on the next request
        console.error('MongoDB connection error:', error.message);
        throw error;
      });
  }
  return connecting;
};

export default connectDB;
