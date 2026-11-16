import mongoose from "mongoose";

const walletTxnSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: { type: String, enum: ["credit", "debit"], required: true },
    amount: { type: Number, required: true, min: 1 },
    reason: {
      type: String,
      enum: ["topup", "ride_payment", "refund", "promo"],
      required: true,
    },
    ride: { type: mongoose.Schema.Types.ObjectId, ref: "Ride" },
    balanceAfter: { type: Number, required: true },
  },
  { timestamps: true },
);

walletTxnSchema.index({ user: 1, createdAt: -1 });
export default mongoose.model("WalletTransaction", walletTxnSchema);
