import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true, minlength: 3, maxlength: 500 }
}, { timestamps: true });

reviewSchema.index({ customer: 1, vehicle: 1 }, { unique: true });
export default mongoose.model('Review', reviewSchema);
