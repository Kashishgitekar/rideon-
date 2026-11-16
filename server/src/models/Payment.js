import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "INR" },
    provider: { type: String, enum: ["razorpay", "simulated"], required: true },
    orderId: { type: String, required: true },
    paymentId: String,
    signature: String,
    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
      index: true,
    },
    refundId: String,
    refundedAmount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model("Payment", paymentSchema);
