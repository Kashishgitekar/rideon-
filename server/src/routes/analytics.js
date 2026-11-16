import { Router } from "express";
import Booking from "../models/Booking.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, allowRoles("admin"), async (_req, res, next) => {
  try {
    const since = new Date(Date.now() - 30 * 86400000);
    const [bookings, agg] = await Promise.all([
      Booking.find({ createdAt: { $gte: since } })
        .populate("vehicle", "name")
        .limit(1000),
      Booking.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
          },
        },
      ]),
    ]);
    const revenueByDay = {};
    for (const booking of bookings) {
      if (!["confirmed", "active", "completed"].includes(booking.status))
        continue;
      const day = booking.createdAt.toISOString().slice(0, 10);
      revenueByDay[day] = (revenueByDay[day] || 0) + booking.totalAmount;
    }
    const topVehicles = {};
    for (const booking of bookings) {
      const name = booking.vehicle?.name || "Unknown";
      topVehicles[name] = (topVehicles[name] || 0) + 1;
    }
    const total = agg.reduce((sum, row) => sum + row.count, 0);
    const cancelled = agg.find((row) => row._id === "cancelled")?.count || 0;
    res.json({
      totals: Object.fromEntries(agg.map((row) => [row._id, row.count])),
      totalRevenue: agg
        .filter((r) => ["confirmed", "active", "completed"].includes(r._id))
        .reduce((s, r) => s + r.revenue, 0),
      cancellationRate: total ? Math.round((cancelled / total) * 100) : 0,
      revenueByDay: Object.entries(revenueByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-30),
      topVehicles: Object.entries(topVehicles)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
