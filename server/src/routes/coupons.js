import { Router } from "express";
import { z } from "zod";
import Coupon from "../models/Coupon.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";

const router = Router();

// List active coupons available to customers
router.get("/", requireAuth, async (_req, res, next) => {
  try {
    const coupons = await Coupon.find({
      active: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      $expr: [
        { $eq: ["$usageLimit", 0] },
        { $lt: ["$usedCount", "$usageLimit"] },
      ],
    })
      .select("code percentOff amountOff maxDiscount minFare expiresAt")
      .lean();
    res.json({ coupons });
  } catch (error) {
    next(error);
  }
});

// Admin creates a coupon
router.post("/", requireAuth, allowRoles("admin"), async (req, res, next) => {
  try {
    const input = z
      .object({
        code: z
          .string()
          .min(3)
          .transform((s) => s.toUpperCase()),
        percentOff: z.coerce.number().min(1).max(100).optional(),
        amountOff: z.coerce.number().min(0).optional(),
        maxDiscount: z.coerce.number().min(0).optional(),
        minFare: z.coerce.number().min(0).optional(),
        expiresAt: z.coerce.date().optional(),
        usageLimit: z.coerce.number().int().min(0).optional(),
      })
      .refine((d) => d.percentOff || d.amountOff, {
        message: "percentOff or amountOff is required",
      });
    const coupon = await Coupon.create({
      ...input.parse(req.body),
      createdBy: req.user._id,
    });
    res.status(201).json({ coupon });
  } catch (error) {
    next(error);
  }
});

// Validate a coupon against a fare without consuming it
router.post("/validate", requireAuth, async (req, res, next) => {
  try {
    const { code, fare } = z
      .object({ code: z.string(), fare: z.coerce.number().positive() })
      .parse(req.body);
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      active: true,
    });
    if (!coupon)
      throw Object.assign(new Error("Coupon not found"), { status: 404 });
    const discount = coupon.computeDiscount(fare);
    if (discount <= 0)
      throw Object.assign(new Error("Coupon is not applicable to this fare"), {
        status: 400,
      });
    res.json({ code: coupon.code, discount, finalFare: fare - discount });
  } catch (error) {
    next(error);
  }
});

export default router;
