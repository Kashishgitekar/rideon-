import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['customer', 'driver', 'owner', 'admin'], default: 'customer' },
  driverProfile: {
    vehicleType: { type: String, enum: ['bike', 'auto', 'car'] },
    vehicleNumber: { type: String, trim: true },
    licenseNumber: { type: String, trim: true },
    online: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }
    },
    lastLocationAt: Date
  },
  walletBalance: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' }
}, { timestamps: true });
userSchema.index({ 'driverProfile.currentLocation': '2dsphere' });
export default mongoose.model('User', userSchema);
