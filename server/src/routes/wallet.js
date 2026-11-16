import { Router } from "express";
import { z } from "zod";
import User from "../models/User.js";
import WalletTransaction from "../models/WalletTransaction.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("walletBalance");
    const transactions = await WalletTransaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ balance: user.walletBalance, transactions });
  } catch (error) {
    next(error);
  }
});

// Top up (simulated gateway — swap in Razorpay/Stripe by crediting after webhook confirmation)
router.post("/topup", requireAuth, async (req, res, next) => {
  try {
    const { amount } = z
      .object({ amount: z.coerce.number().min(10).max(100000) })
      .parse(req.body);
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { walletBalance: amount } },
      { new: true, select: "walletBalance" },
    );
    const transaction = await WalletTransaction.create({
      user: req.user._id,
      type: "credit",
      amount,
      reason: "topup",
      balanceAfter: user.walletBalance,
    });
    res.status(201).json({ balance: user.walletBalance, transaction });
  } catch (error) {
    next(error);
  }
});

export default router;
