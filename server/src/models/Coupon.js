import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    // percentage discount (percentOff) or flat amount off (amountOff)
    percentOff: { type: Number, min: 1, max: 100 },
    amountOff: { type: Number, min: 0 },
    maxDiscount: { type: Number, default: 0 }, // cap for percent discounts, 0 = uncapped
    minFare: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    expiresAt: Date,
    usageLimit: { type: Number, default: 0 }, // 0 = unlimited
    usedCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

couponSchema.methods.computeDiscount = function computeDiscount(fare) {
  if (this.expiresAt && this.expiresAt < new Date()) return 0;
  if (!this.active) return 0;
  if (fare < (this.minFare || 0)) return 0;
  let discount = 0;
  if (this.percentOff) {
    discount = Math.round((fare * this.percentOff) / 100);
    if (this.maxDiscount > 0) discount = Math.min(discount, this.maxDiscount);
  } else if (this.amountOff) {
    discount = this.amountOff;
  }
  return Math.min(discount, fare);
};

export default mongoose.model("Coupon", couponSchema);
