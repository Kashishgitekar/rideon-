import { Router } from "express";
import { z } from "zod";
import Notification from "../models/Notification.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({
      notifications,
      unread: await Notification.countDocuments({
        user: req.user._id,
        readAt: null,
      }),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/read", requireAuth, async (req, res, next) => {
  try {
    const ids = z.array(z.string()).parse(req.body.ids);
    await Notification.updateMany(
      { _id: { $in: ids }, user: req.user._id, readAt: null },
      { readAt: new Date() },
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
