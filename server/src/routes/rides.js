import crypto from "crypto";
import { Router } from "express";
import { z } from "zod";
import Ride from "../models/Ride.js";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import WalletTransaction from "../models/WalletTransaction.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";
import { calculateRideFare, getSurgeMultiplier } from "../services/fare.js";
import { notify } from "../services/notifications.js";

const router = Router();
const rideInput = z.object({
  vehicleType: z.enum(["bike", "auto", "car"]),
  pickup: z.string().min(2),
  destination: z.string().min(2),
  distanceKm: z.coerce.number().positive(),
  couponCode: z.string().trim().optional(),
  paymentMethod: z.enum(["cash", "wallet"]).default("cash"),
});

function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function payoutFor(fare) {
  // Captain keeps 80% of the fare; platform commission is 20%.
  return Math.round(fare * 0.8);
}

router.post("/quote", requireAuth, async (req, res, next) => {
  try {
    const { vehicleType, distanceKm } = rideInput
      .pick({
        vehicleType: true,
        distanceKm: true,
      })
      .parse(req.body);
    const surgeMultiplier = getSurgeMultiplier();
    const fare = calculateRideFare(vehicleType, distanceKm);
    res.json({ fare, surgeMultiplier, surge: surgeMultiplier > 1 });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const input = rideInput.parse(req.body);
    const activeRide = await Ride.exists({
      rider: req.user._id,
      status: { $in: ["requested", "accepted", "arriving", "started"] },
    });
    if (activeRide)
      throw Object.assign(new Error("You already have an active ride"), {
        status: 409,
      });

    const surgeMultiplier = getSurgeMultiplier();
    const fare = calculateRideFare(input.vehicleType, input.distanceKm);

    let discount = 0;
    let coupon = null;
    if (input.couponCode) {
      coupon = await Coupon.findOne({
        code: input.couponCode.toUpperCase(),
        active: true,
      });
      if (
        !coupon ||
        (coupon.expiresAt && coupon.expiresAt < new Date()) ||
        (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit)
      ) {
        throw Object.assign(new Error("Coupon is invalid or expired"), {
          status: 400,
        });
      }
      discount = coupon.computeDiscount(fare);
      if (discount <= 0)
        throw Object.assign(new Error("Coupon does not apply to this fare"), {
          status: 400,
        });
    }

    const otp = generateOtp();
    const ride = await Ride.create({
      ...input,
      couponCode: undefined,
      rider: req.user._id,
      fare,
      surgeMultiplier,
      coupon: coupon?._id,
      discount,
      finalFare: fare - discount,
      otpHash: hashOtp(otp),
      paymentMethod: input.paymentMethod,
    });
    if (coupon)
      await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });

    const io = req.app.locals.io;
    io?.to(`user:${req.user._id}`).emit("ride:otp", { rideId: ride.id, otp });
    io?.emit("ride:requested", {
      rideId: ride.id,
      vehicleType: ride.vehicleType,
      pickup: ride.pickup,
      destination: ride.destination,
      fare: ride.finalFare,
      surgeMultiplier,
    });
    notify(io, req.user._id, {
      title: "Ride requested",
      body: `Your ${ride.vehicleType} ride to ${ride.destination} is looking for captains. Use OTP ${otp} to start.`,
      type: "ride",
      meta: { rideId: ride.id },
    });
    res.status(201).json({ ride, otp }); // otp returned for dev/testing; production would send via SMS
  } catch (error) {
    next(error);
  }
});

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const filter =
      req.user.role === "driver"
        ? { driver: req.user._id }
        : { rider: req.user._id };
    res.json({
      rides: await Ride.find(filter)
        .populate("rider driver", "name email")
        .sort({ createdAt: -1 })
        .limit(50),
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/available",
  requireAuth,
  allowRoles("driver", "admin"),
  async (_req, res, next) => {
    try {
      res.json({
        rides: await Ride.find({ status: "requested" })
          .populate("rider", "name")
          .sort({ createdAt: 1 })
          .limit(50),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/:id/accept",
  requireAuth,
  allowRoles("driver", "admin"),
  async (req, res, next) => {
    try {
      if (
        req.user.role === "driver" &&
        (!req.user.driverProfile?.online || !req.user.driverProfile?.verified)
      ) {
        throw Object.assign(
          new Error("You must be verified and online to accept rides"),
          { status: 403 },
        );
      }
      const ride = await Ride.findOneAndUpdate(
        { _id: req.params.id, status: "requested" },
        { driver: req.user._id, status: "accepted", acceptedAt: new Date() },
        { new: true },
      ).populate("rider driver", "name email");
      if (!ride)
        throw Object.assign(new Error("Ride is no longer available"), {
          status: 409,
        });
      const io = req.app.locals.io;
      io?.to(`ride:${ride.id}`).emit("ride:accepted", { ride });
      io?.emit("ride:assignment", { rideId: ride.id, driverId: req.user.id });
      notify(io, ride.rider._id ?? ride.rider, {
        title: "Captain on the way",
        body: `${req.user.name} accepted your ride to ${ride.destination}.`,
        type: "ride",
        meta: { rideId: ride.id },
      });
      res.json({ ride });
    } catch (error) {
      next(error);
    }
  },
);

// Rider verifies the OTP shown by the captain before the ride starts
router.post("/:id/verify-otp", requireAuth, async (req, res, next) => {
  try {
    const { otp } = z
      .object({ otp: z.string().regex(/^\d{4}$/) })
      .parse(req.body);
    const ride = await Ride.findById(req.params.id);
    if (!ride)
      throw Object.assign(new Error("Ride not found"), { status: 404 });
    const isRider = String(ride.rider) === String(req.user._id);
    const isAssignedDriver =
      ride.driver && String(ride.driver) === String(req.user._id);
    if (!isRider && !isAssignedDriver && req.user.role !== "admin") {
      throw Object.assign(new Error("Not authorized for this ride"), {
        status: 403,
      });
    }
    if (ride.status !== "arriving" && ride.status !== "accepted") {
      throw Object.assign(
        new Error("OTP can only be verified before the ride starts"),
        { status: 409 },
      );
    }
    if (ride.otpHash !== hashOtp(otp)) {
      throw Object.assign(new Error("Incorrect OTP"), { status: 400 });
    }
    ride.otpVerifiedAt = new Date();
    ride.status = "started";
    await ride.save();
    req.app.locals.io?.to(`ride:${ride.id}`).emit("ride:status", { ride });
    res.json({ ride });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", requireAuth, async (req, res, next) => {
  try {
    const status = z
      .enum(["arriving", "started", "completed", "cancelled"])
      .parse(req.body.status);
    const ownerFilter =
      req.user.role === "driver"
        ? { driver: req.user._id }
        : { rider: req.user._id };
    const ride = await Ride.findOne({
      _id: req.params.id,
      ...ownerFilter,
      status: { $nin: ["completed", "cancelled"] },
    });
    if (!ride)
      throw Object.assign(new Error("Ride cannot be updated"), { status: 404 });
    if (status === "started" && !ride.otpVerifiedAt) {
      throw Object.assign(
        new Error("Rider must verify the OTP before the ride starts"),
        { status: 409 },
      );
    }
    ride.status = status;
    if (status === "completed") {
      ride.completedAt = new Date();
      if (ride.paymentMethod === "wallet" && !ride.paidFromWallet) {
        const due = ride.finalFare ?? ride.fare;
        if (req.user.walletBalance < due) {
          throw Object.assign(
            new Error("Insufficient wallet balance for this ride"),
            { status: 402 },
          );
        }
        const balanceAfter = req.user.walletBalance - due;
        await User.updateOne(
          { _id: req.user._id },
          { $set: { walletBalance: balanceAfter } },
        );
        await WalletTransaction.create({
          user: req.user._id,
          type: "debit",
          amount: due,
          reason: "ride_payment",
          ride: ride._id,
          balanceAfter,
        });
        ride.paidFromWallet = true;
      }
      if (ride.driver) {
        const payout = payoutFor(ride.finalFare ?? ride.fare);
        await User.updateOne(
          { _id: ride.driver },
          { $inc: { walletBalance: payout } },
        );
        const driver = await User.findById(ride.driver).select("walletBalance");
        await WalletTransaction.create({
          user: ride.driver,
          type: "credit",
          amount: payout,
          reason: "ride_payment",
          ride: ride._id,
          balanceAfter: driver.walletBalance,
        });
      }
    }
    await ride.save();
    const populated = await Ride.findById(ride._id).populate(
      "rider driver",
      "name email",
    );
    const io = req.app.locals.io;
    io?.to(`ride:${ride.id}`).emit("ride:status", { ride: populated });
    if (status === "completed") {
      notify(io, ride.rider, {
        title: "Ride completed",
        body: `You paid ₹${populated.finalFare ?? populated.fare} for the ride. Thanks for riding with RideOn!`,
        type: "ride",
        meta: { rideId: ride.id },
      });
    }
    res.json({ ride: populated });
  } catch (error) {
    next(error);
  }
});

export default router;
