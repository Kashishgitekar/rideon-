import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

chatMessageSchema.index({ ride: 1, createdAt: 1 });
export default mongoose.model("ChatMessage", chatMessageSchema);
