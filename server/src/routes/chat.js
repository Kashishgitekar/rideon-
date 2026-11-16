import { Router } from "express";
import { z } from "zod";
import Ride from "../models/Ride.js";
import ChatMessage from "../models/ChatMessage.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function authorize(ride, userId) {
  return [String(ride.rider), String(ride.driver)].includes(String(userId));
}

// Message history for a ride
router.get("/:rideId", requireAuth, async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId).select("rider driver");
    if (!ride)
      throw Object.assign(new Error("Ride not found"), { status: 404 });
    if (!authorize(ride, req.user._id) && req.user.role !== "admin") {
      throw Object.assign(new Error("Not authorized"), { status: 403 });
    }
    res.json({
      messages: await ChatMessage.find({ ride: ride._id })
        .sort({ createdAt: 1 })
        .limit(200),
    });
  } catch (error) {
    next(error);
  }
});

// Send a message; delivered live via the ride room
router.post("/:rideId", requireAuth, async (req, res, next) => {
  try {
    const { message } = z
      .object({ message: z.string().min(1).max(1000) })
      .parse(req.body);
    const ride = await Ride.findById(req.params.rideId).select("rider driver");
    if (!ride)
      throw Object.assign(new Error("Ride not found"), { status: 404 });
    if (!authorize(ride, req.user._id))
      throw Object.assign(new Error("Not authorized"), { status: 403 });
    const chat = await ChatMessage.create({
      ride: ride._id,
      sender: req.user._id,
      message,
    });
    req.app.locals.io
      ?.to(`ride:${ride._id}`)
      .emit("chat:message", chat.toObject());
    res.status(201).json({ message: chat });
  } catch (error) {
    next(error);
  }
});

export default router;
