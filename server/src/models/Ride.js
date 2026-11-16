import mongoose from 'mongoose';

const rideSchema = new mongoose.Schema({
  rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  vehicleType: { type: String, enum: ['bike', 'auto', 'car'], required: true },
  pickup: { type: String, required: true, trim: true },
  destination: { type: String, required: true, trim: true },
  distanceKm: { type: Number, required: true, min: 0.1 },
  fare: { type: Number, required: true, min: 1 },
  surgeMultiplier: { type: Number, default: 1 },
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
  discount: { type: Number, default: 0 },
  finalFare: { type: Number },
  // 4-digit OTP the rider shares with the captain to start the ride
  otpHash: { type: String },
  otpVerifiedAt: Date,
  paymentMethod: { type: String, enum: ['cash', 'wallet'], default: 'cash' },
  paidFromWallet: { type: Boolean, default: false },
  status: { type: String, enum: ['requested', 'accepted', 'arriving', 'started', 'completed', 'cancelled'], default: 'requested', index: true },
  requestedAt: { type: Date, default: Date.now },
  acceptedAt: Date,
  completedAt: Date
}, { timestamps: true });

rideSchema.index({ status: 1, vehicleType: 1, createdAt: 1 });
export default mongoose.model('Ride', rideSchema);
