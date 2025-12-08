import express from 'express';
import SessionBooking from '../models/SessionBooking.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public: Create session booking
router.post('/', async (req, res) => {
  try {
    const booking = new SessionBooking(req.body);
    await booking.save();
    res.status(201).json({ message: 'Session booked successfully', booking });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Admin: Get all bookings
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const bookings = await SessionBooking.find(filter).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update booking status
router.patch('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const booking = await SessionBooking.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Admin: Delete booking
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const booking = await SessionBooking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
