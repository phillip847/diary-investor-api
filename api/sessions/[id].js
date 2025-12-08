import mongoose from 'mongoose';

let cachedConnection = null;

async function connectDB() {
  if (cachedConnection) return cachedConnection;
  const connection = await mongoose.connect(process.env.MONGODB_URI);
  cachedConnection = connection;
  return connection;
}

const sessionBookingSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, match: [/^\\S+@\\S+\\.\\S+$/, 'Please enter a valid email'] },
  phoneNumber: String,
  sessionType: { type: String, required: true },
  investmentExperience: String,
  financialGoals: { type: String, required: true },
  preferredDate: Date,
  additionalInformation: String,
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
}, { timestamps: true });

const SessionBooking = mongoose.models.SessionBooking || mongoose.model('SessionBooking', sessionBookingSchema);

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://diaryofan-investor.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;

  try {
    await connectDB();

    if (req.method === 'GET') {
      const booking = await SessionBooking.findById(id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      return res.json(booking);
    }

    if (req.method === 'PATCH') {
      const booking = await SessionBooking.findByIdAndUpdate(id, req.body, { new: true });
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      return res.json({ message: 'Booking updated', booking });
    }

    if (req.method === 'DELETE') {
      const booking = await SessionBooking.findByIdAndDelete(id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      return res.json({ message: 'Booking deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};