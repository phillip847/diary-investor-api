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
  email: { type: String, required: true, match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'] },
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await connectDB();

    if (req.method === 'POST') {
      const booking = new SessionBooking(req.body);
      await booking.save();
      return res.status(201).json({ message: 'Session booked successfully', booking });
    }

    if (req.method === 'GET') {
      const { status } = req.query;
      const filter = status ? { status } : {};
      const bookings = await SessionBooking.find(filter).sort({ createdAt: -1 });
      return res.json(bookings);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
