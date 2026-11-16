import { Router } from "express";
import { z } from "zod";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";
import {
  createOrder,
  verifySignature,
  refundPayment,
  paymentMode,
} from "../services/payments.js";

const router = Router();

router.post("/order", requireAuth, async (req, res, next) => {
  try {
    const { bookingId } = z.object({ bookingId: z.string() }).parse(req.body);
    const booking = await Booking.findOne({
      _id: bookingId,
      customer: req.user._id,
    });
    if (!booking)
      throw Object.assign(new Error("Booking not found"), { status: 404 });
    if (booking.paymentStatus === "successful")
      throw Object.assign(new Error("Booking is already paid"), {
        status: 409,
      });
    const existing = await Payment.findOne({
      booking: booking._id,
      status: "paid",
    });
    if (existing)
      throw Object.assign(
        new Error("Payment already completed for this booking"),
        { status: 409 },
      );
    const order = await createOrder(booking.totalAmount, booking.bookingId);
    const payment = await Payment.create({
      booking: booking._id,
      customer: req.user._id,
      amount: booking.totalAmount,
      provider: order.provider === "razorpay" ? "razorpay" : "simulated",
      orderId: order.orderId,
      status: "created",
    });
    res
      .status(201)
      .json({ payment: { id: payment._id, status: payment.status }, order });
  } catch (error) {
    next(error);
  }
});

router.post("/verify", requireAuth, async (req, res, next) => {
  try {
    const input = z
      .object({
        paymentId: z.string(),
        razorpayPaymentId: z.string().optional(),
        razorpaySignature: z.string().optional(),
      })
      .parse(req.body);
    const payment = await Payment.findOne({
      _id: input.paymentId,
      customer: req.user._id,
    });
    if (!payment)
      throw Object.assign(new Error("Payment not found"), { status: 404 });
    if (payment.status === "paid")
      throw Object.assign(new Error("Payment already verified"), {
        status: 409,
      });
    const remotePaymentId =
      payment.provider === "razorpay"
        ? input.razorpayPaymentId
        : `sim_pay_${payment.orderId}`;
    if (
      payment.provider === "razorpay" &&
      !verifySignature(
        payment.orderId,
        remotePaymentId,
        input.razorpaySignature,
      )
    ) {
      payment.status = "failed";
      await payment.save();
      await Booking.findByIdAndUpdate(payment.booking, {
        paymentStatus: "failed",
      });
      throw Object.assign(new Error("Payment signature verification failed"), {
        status: 400,
      });
    }
    payment.paymentId = remotePaymentId;
    payment.signature = input.razorpaySignature || "simulated";
    payment.status = "paid";
    await payment.save();
    await Booking.findByIdAndUpdate(payment.booking, {
      paymentStatus: "successful",
      paymentMethod: "card",
    });
    res.json({
      payment: {
        id: payment._id,
        status: payment.status,
        paymentId: payment.paymentId,
      },
      mode: paymentMode(),
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/refund",
  requireAuth,
  allowRoles("admin"),
  async (req, res, next) => {
    try {
      const input = z
        .object({
          paymentId: z.string(),
          amount: z.coerce.number().positive().optional(),
        })
        .parse(req.body);
      const payment = await Payment.findById(input.paymentId);
      if (!payment)
        throw Object.assign(new Error("Payment not found"), { status: 404 });
      if (payment.status !== "paid")
        throw Object.assign(
          new Error("Only successful payments can be refunded"),
          { status: 409 },
        );
      const amount = input.amount || payment.amount;
      if (amount > payment.amount - payment.refundedAmount)
        throw Object.assign(new Error("Refund exceeds paid amount"), {
          status: 400,
        });
      const refund = await refundPayment(payment.paymentId, amount);
      payment.refundedAmount += amount;
      payment.refundId = refund.refundId;
      payment.status =
        payment.refundedAmount >= payment.amount ? "refunded" : "paid";
      await payment.save();
      await Booking.findByIdAndUpdate(payment.booking, {
        paymentStatus:
          payment.status === "refunded" ? "refunded" : "successful",
      });
      res.json({ refund: { id: refund.refundId, amount } });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
