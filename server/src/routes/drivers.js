import { Router } from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import Ride from '../models/Ride.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const router = Router();
const profileInput = z.object({
  vehicleType: z.enum(['bike', 'auto', 'car']),
  vehicleNumber: z.string().min(4).max(20),
  licenseNumber: z.string().min(4).max(30)
});

router.get('/', requireAuth, allowRoles('admin'), async (_req, res, next) => {
  try {
    const drivers = await User.find({ role: 'driver' })
      .select('name email status driverProfile createdAt')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ drivers });
  } catch (error) { next(error); }
});

router.patch('/:id/verify', requireAuth, allowRoles('admin'), async (req, res, next) => {
  try {
    const verified = z.boolean().default(true).parse(req.body.verified);
    const driver = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'driver' },
      { $set: { 'driverProfile.verified': verified } },
      { new: true }
    ).select('name email role driverProfile');
    if (!driver) throw Object.assign(new Error('Driver not found'), { status: 404 });
    res.json({ driver });
  } catch (error) { next(error); }
});

router.use(requireAuth, allowRoles('driver'));

router.get('/me', (req, res) => res.json({ driver: req.user.driverProfile || null }));

router.put('/me', async (req, res, next) => {
  try {
    const profile = profileInput.parse(req.body);
    const driver = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { driverProfile: { ...profile, online: false, verified: false } } },
      { new: true }
    ).select('name email role driverProfile');
    res.json({ driver });
  } catch (error) { next(error); }
});

router.patch('/availability', async (req, res, next) => {
  try {
    const online = z.boolean().parse(req.body.online);
    if (online && (!req.user.driverProfile?.verified || !req.user.driverProfile?.vehicleType)) {
      throw Object.assign(new Error('Complete driver verification before going online'), { status: 403 });
    }
    const driver = await User.findByIdAndUpdate(req.user._id, { $set: { 'driverProfile.online': online } }, { new: true }).select('driverProfile');
    res.json({ driver });
  } catch (error) { next(error); }
});

router.get('/rides', async (req, res, next) => {
  try {
    const filter = req.user.driverProfile?.online
      ? { status: 'requested', vehicleType: req.user.driverProfile.vehicleType }
      : { driver: req.user._id };
    res.json({ rides: await Ride.find(filter).populate('rider', 'name').sort({ createdAt: 1 }).limit(50) });
  } catch (error) { next(error); }
});

export default router;
