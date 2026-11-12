import mongoose from 'mongoose';

// Article images, stored in MongoDB and served from /api/images/:id.
const imageSchema = new mongoose.Schema({
  data: { type: Buffer, required: true },
  contentType: { type: String, required: true },
  size: Number,
  fileName: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedByName: String,
}, { timestamps: true });

export default mongoose.model('Image', imageSchema);
