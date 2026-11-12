import express from 'express';
import mongoose from 'mongoose';
import Image from '../models/Image.js';

// Public image delivery. Images never change once uploaded, so cache hard.
const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).end();
    const image = await Image.findById(req.params.id).lean();
    if (!image) return res.status(404).end();
    res.set({
      'Content-Type': image.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    res.send(image.data.buffer ? Buffer.from(image.data.buffer) : image.data);
  } catch {
    res.status(404).end();
  }
});

export default router;
