import { Router } from 'express';
import Vehicle from '../models/Vehicle.js';
import Booking from '../models/Booking.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { rankVehicles } from '../services/recommendations.js';

const router = Router();
router.get('/', async (req, res, next) => {
  try {
    const filter = { verified: true, available: true };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.fuelType) filter.fuelType = req.query.fuelType;
    if (req.query.transmission) filter.transmission = req.query.transmission;
    if (req.query.minSeats) filter.seats = { ...(filter.seats || {}), $gte: Number(req.query.minSeats) };
    if (req.query.maxPrice) filter.pricePerDay = { ...(filter.pricePerDay || {}), $lte: Number(req.query.maxPrice) };
    if (req.query.search) filter.$or = [{ name: new RegExp(req.query.search, 'i') }, { location: new RegExp(req.query.search, 'i') }];
    const vehicles = await Vehicle.find(filter).sort(req.query.sort === 'price' ? { pricePerDay: 1 } : { createdAt: -1 }).limit(50);
    res.json({ vehicles });
  } catch (error) { next(error); }
});
router.get('/recommendations', requireAuth, async (req, res, next) => {
  try {
    const [vehicles, bookings] = await Promise.all([
      Vehicle.find({ verified: true, available: true }).limit(50),
      Booking.find({ customer: req.user._id }).populate('vehicle')
    ]);
    res.json({ recommendations: rankVehicles(vehicles, bookings) });
  } catch (error) { next(error); }
});
router.get('/mine', requireAuth, allowRoles('owner', 'admin'), async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ vehicles });
  } catch (error) { next(error); }
});
router.get('/admin', requireAuth, allowRoles('admin'), async (_req, res, next) => {
  try {
    const vehicles = await Vehicle.find({}).populate('owner', 'name email').sort({ createdAt: -1 }).limit(200);
    res.json({ vehicles });
  } catch (error) { next(error); }
});
router.get('/:id', async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, verified: true }).populate('owner', 'name');
    if (!vehicle) throw Object.assign(new Error('Vehicle not found'), { status: 404 });
    res.json({ vehicle });
  } catch (error) { next(error); }
});
router.post('/', requireAuth, allowRoles('owner', 'admin'), async (req, res, next) => {
  try { res.status(201).json({ vehicle: await Vehicle.create({ ...req.body, owner: req.user._id, verified: req.user.role === 'admin' }) }); }
  catch (error) { next(error); }
});
router.patch('/:id', requireAuth, allowRoles('admin', 'owner'), async (req, res, next) => {
  try {
    const update = {};
    if (typeof req.body.available === 'boolean') update.available = req.body.available;
    if (typeof req.body.verified === 'boolean' && req.user.role === 'admin') update.verified = req.body.verified;
    const filter = req.user.role === 'owner' ? { _id: req.params.id, owner: req.user._id } : { _id: req.params.id };
    const vehicle = await Vehicle.findOneAndUpdate(filter, update, { new: true });
    if (!vehicle) throw Object.assign(new Error('Vehicle not found'), { status: 404 });
    res.json({ vehicle });
  } catch (error) { next(error); }
});
router.delete('/:id', requireAuth, allowRoles('admin', 'owner'), async (req, res, next) => {
  try {
    const filter = req.user.role === 'owner' ? { _id: req.params.id, owner: req.user._id } : { _id: req.params.id };
    const vehicle = await Vehicle.findOne(filter);
    if (!vehicle) throw Object.assign(new Error('Vehicle not found'), { status: 404 });
    const active = await Booking.countDocuments({
      vehicle: vehicle._id,
      status: { $in: ['confirmed', 'active'] },
      endAt: { $gte: new Date() }
    });
    if (active > 0) throw Object.assign(new Error('Vehicle has upcoming bookings and cannot be deleted'), { status: 409 });
    await vehicle.deleteOne();
    res.json({ message: 'Vehicle deleted' });
  } catch (error) { next(error); }
});
export default router;
