import { Router } from 'express';
import { z } from 'zod';
import Review from '../models/Review.js';
import Vehicle from '../models/Vehicle.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const reviewInput = z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().min(3).max(500) });

router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const reviews = await Review.find({ customer: req.user._id }).populate('vehicle', 'name').sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (error) { next(error); }
});

router.get('/vehicle/:vehicleId', async (req, res, next) => {
  try {
    const reviews = await Review.find({ vehicle: req.params.vehicleId }).populate('customer', 'name').sort({ createdAt: -1 }).limit(50);
    res.json({ reviews });
  } catch (error) { next(error); }
});

router.post('/vehicle/:vehicleId', requireAuth, async (req, res, next) => {
  try {
    const input = reviewInput.parse(req.body);
    const vehicle = await Vehicle.findOne({ _id: req.params.vehicleId, verified: true });
    if (!vehicle) throw Object.assign(new Error('Vehicle not found'), { status: 404 });
    const review = await Review.findOneAndUpdate(
      { customer: req.user._id, vehicle: vehicle._id },
      { ...input, customer: req.user._id, vehicle: vehicle._id },
      { new: true, upsert: true, runValidators: true }
    ).populate('customer', 'name');
    res.status(201).json({ review });
  } catch (error) { next(error); }
});

export default router;
