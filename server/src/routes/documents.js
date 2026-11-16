import { Router } from "express";
import { z } from "zod";
import Document from "../models/Document.js";
import DamageReport from "../models/DamageReport.js";
import Booking from "../models/Booking.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";

const router = Router();
const ALLOWED_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];
const MAX_BYTES = 5 * 1024 * 1024;

function decodeUpload(payload) {
  const cleaned = payload.replace(/^data:[^;]+;base64,/, "");
  return Buffer.from(cleaned, "base64");
}

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const input = z
      .object({
        kind: z.enum(["govt_id", "passport", "booking_proof", "damage_photo"]),
        fileName: z.string().min(1).max(120),
        mimeType: z.string(),
        bookingId: z.string().optional(),
        dataBase64: z.string().min(50),
      })
      .parse(req.body);
    if (!ALLOWED_MIME.includes(input.mimeType))
      throw Object.assign(new Error("Unsupported file type"), { status: 400 });
    const buffer = decodeUpload(input.dataBase64);
    if (buffer.length > MAX_BYTES)
      throw Object.assign(new Error("File exceeds the 5 MB limit"), {
        status: 413,
      });
    let booking = null;
    if (input.bookingId) {
      booking = await Booking.findOne({
        _id: input.bookingId,
        customer: req.user._id,
      });
      if (!booking)
        throw Object.assign(new Error("Booking not found"), { status: 404 });
    }
    if (input.kind === "passport" && !booking)
      throw Object.assign(
        new Error("Passport verification requires a booking reference"),
        { status: 400 },
      );
    const doc = await Document.create({
      owner: req.user._id,
      kind: input.kind,
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: buffer.length,
      dataBase64: buffer.toString("base64"),
      booking: booking?._id || undefined,
    });
    res
      .status(201)
      .json({
        document: {
          id: doc._id,
          kind: doc.kind,
          status: doc.status,
          fileName: doc.fileName,
          createdAt: doc.createdAt,
        },
      });
  } catch (error) {
    next(error);
  }
});

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const docs = await Document.find({ owner: req.user._id })
      .select("-dataBase64")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ documents: docs });
  } catch (error) {
    next(error);
  }
});

router.get("/", requireAuth, allowRoles("admin"), async (_req, res, next) => {
  try {
    const docs = await Document.find({})
      .select("-dataBase64")
      .populate("owner", "name email")
      .populate("booking", "bookingId")
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ documents: docs });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/download", requireAuth, async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc)
      throw Object.assign(new Error("Document not found"), { status: 404 });
    const isOwner = String(doc.owner) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin")
      throw Object.assign(new Error("Not authorized"), { status: 403 });
    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${doc.fileName.replace(/"/g, "")}"`,
    );
    res.send(Buffer.from(doc.dataBase64, "base64"));
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/:id/review",
  requireAuth,
  allowRoles("admin"),
  async (req, res, next) => {
    try {
      const input = z
        .object({
          status: z.enum(["approved", "rejected"]),
          note: z.string().max(300).optional(),
        })
        .parse(req.body);
      const doc = await Document.findByIdAndUpdate(
        req.params.id,
        {
          status: input.status,
          reviewNote: input.note,
          reviewedBy: req.user._id,
        },
        { new: true },
      )
        .select("-dataBase64")
        .populate("owner", "name email");
      if (!doc)
        throw Object.assign(new Error("Document not found"), { status: 404 });
      res.json({ document: doc });
    } catch (error) {
      next(error);
    }
  },
);

// Damage reports
router.post("/damage-reports", requireAuth, async (req, res, next) => {
  try {
    const input = z
      .object({
        bookingId: z.string(),
        description: z.string().min(5).max(1000),
      })
      .parse(req.body);
    const booking = await Booking.findOne({
      _id: input.bookingId,
      customer: req.user._id,
      status: { $in: ["active", "completed"] },
    });
    if (!booking)
      throw Object.assign(
        new Error("Booking not found or not eligible for damage reports"),
        { status: 404 },
      );
    const report = await DamageReport.create({
      booking: booking._id,
      reportedBy: req.user._id,
      description: input.description,
    });
    res.status(201).json({ report });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/damage-reports",
  requireAuth,
  allowRoles("admin"),
  async (_req, res, next) => {
    try {
      const reports = await DamageReport.find({})
        .populate("booking", "bookingId")
        .populate("reportedBy", "name email")
        .sort({ createdAt: -1 })
        .limit(100);
      res.json({ reports });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/damage-reports/:id",
  requireAuth,
  allowRoles("admin"),
  async (req, res, next) => {
    try {
      const input = z
        .object({
          chargeAmount: z.coerce.number().min(0),
          status: z.enum(["open", "charged", "resolved"]),
        })
        .parse(req.body);
      const report = await DamageReport.findByIdAndUpdate(
        req.params.id,
        input,
        { new: true },
      ).populate("booking", "bookingId");
      if (!report)
        throw Object.assign(new Error("Damage report not found"), {
          status: 404,
        });
      if (input.chargeAmount > 0) {
        await Booking.findByIdAndUpdate(report.booking, {
          $inc: { totalAmount: input.chargeAmount },
        });
      }
      res.json({ report });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
