import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  brand: String, model: String, category: { type: String, required: true, index: true },
  fuelType: { type: String, default: 'Petrol' }, transmission: { type: String, default: 'Automatic' },
  seats: { type: Number, default: 5 }, pricePerDay: { type: Number, required: true, min: 1 },
  location: { type: String, required: true }, description: String,
  imageUrl: { type: String, default: 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80' },
  verified: { type: Boolean, default: true }, available: { type: Boolean, default: true }
}, { timestamps: true });
vehicleSchema.index({ category: 1, pricePerDay: 1, available: 1 });
export default mongoose.model('Vehicle', vehicleSchema);
