import mongoose from "mongoose";

const damageReportSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: { type: String, required: true, trim: true, minlength: 5 },
    chargeAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["open", "charged", "resolved"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("DamageReport", damageReportSchema);
