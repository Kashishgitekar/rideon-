import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, unique: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
  pickupLocation: { type: String, required: true }, destination: { type: String, required: true },
  startAt: { type: Date, required: true, index: true }, endAt: { type: Date, required: true, index: true },
  passengers: { type: Number, min: 1, max: 20, default: 1 },
  totalAmount: { type: Number, required: true }, paymentMethod: { type: String, enum: ['cash', 'upi', 'card'], default: 'cash' }, status: { type: String, enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'], default: 'pending', index: true },
  paymentStatus: { type: String, enum: ['pending', 'successful', 'failed', 'refunded'], default: 'pending' },
  interstate: { type: Boolean, default: false }
}, { timestamps: true });
bookingSchema.index({ vehicle: 1, startAt: 1, endAt: 1, status: 1 });
export default mongoose.model('Booking', bookingSchema);
