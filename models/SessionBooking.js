import mongoose from 'mongoose';

const sessionBookingSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  phoneNumber: String,
  sessionType: {
    type: String,
    required: true,
  },
  investmentExperience: String,
  financialGoals: {
    type: String,
    required: true,
  },
  preferredDate: Date,
  additionalInformation: String,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

// Performance indexes
sessionBookingSchema.index({ status: 1 });
sessionBookingSchema.index({ createdAt: -1 });

export default mongoose.model('SessionBooking', sessionBookingSchema);
