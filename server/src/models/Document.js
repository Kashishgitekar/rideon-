import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    kind: {
      type: String,
      enum: ["govt_id", "passport", "booking_proof", "damage_photo"],
      required: true,
    },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, max: 5 * 1024 * 1024 },
    dataBase64: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewNote: String,
  },
  { timestamps: true },
);

documentSchema.index({ owner: 1, kind: 1, status: 1 });
export default mongoose.model("Document", documentSchema);
