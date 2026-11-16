import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import Booking from '../models/Booking.js';
import Vehicle from '../models/Vehicle.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { calculatePrice } from '../services/pricing.js';
import { refundQuote } from '../services/refund.js';
import Document from '../models/Document.js';

const CITY_STATES = { mumbai: 'MH', pune: 'MH', nagpur: 'MH', delhi: 'DL', gurugram: 'HR', noida: 'UP', bengaluru: 'KA', bangalore: 'KA', mysuru: 'KA', hyderabad: 'TS', chennai: 'TN', coimbatore: 'TN', kolkata: 'WB', jaipur: 'RJ', goa: 'GA', ahmedabad: 'GJ', surat: 'GJ' };
export function stateOf(location) {
  const text = String(location || '').toLowerCase();
  const hit = Object.keys(CITY_STATES).find(city => text.includes(city));
  return hit ? CITY_STATES[hit] : null;
}

const router = Router();
const bookingInput = z.object({ vehicleId: z.string(), pickupLocation: z.string().min(2), destination: z.string().min(2), startAt: z.coerce.date(), endAt: z.coerce.date(), passengers: z.coerce.number().int().min(1).max(20).default(1), paymentMethod: z.enum(['cash', 'upi', 'card']).default('cash') }).refine(input => input.endAt > input.startAt, { message: 'Return time must be after pickup time' });
router.get('/mine', requireAuth, async (req, res, next) => {
  try { res.json({ bookings: await Booking.find({ customer: req.user._id }).populate('vehicle').sort({ createdAt: -1 }) }); }
  catch (error) { next(error); }
});
router.get('/', requireAuth, allowRoles('admin'), async (_req, res, next) => {
  try {
    const bookings = await Booking.find({}).populate('vehicle', 'name').populate('customer', 'name email').sort({ createdAt: -1 }).limit(200);
    res.json({ bookings });
  } catch (error) { next(error); }
});
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const input = bookingInput.parse(req.body);
    const vehicle = await Vehicle.findOne({ _id: input.vehicleId, verified: true, available: true });
    if (!vehicle) throw Object.assign(new Error('Vehicle is unavailable'), { status: 404 });
    const conflict = await Booking.exists({ vehicle: vehicle._id, status: { $in: ['pending', 'confirmed', 'active'] }, startAt: { $lt: input.endAt }, endAt: { $gt: input.startAt } });
    if (conflict) throw Object.assign(new Error('Vehicle is already booked for these dates'), { status: 409 });
    const price = calculatePrice(vehicle.pricePerDay, input.startAt, input.endAt);
    const fromState = stateOf(input.pickupLocation);
    const toState = stateOf(input.destination);
    const interstateTravel = Boolean(fromState && toState && fromState !== toState);
    if (interstateTravel) {
      const approvedPassport = await Document.findOne({ owner: req.user._id, kind: 'passport', status: 'approved' });
      if (!approvedPassport) throw Object.assign(new Error('Interstate travel requires an approved passport on file. Upload it from your profile.'), { status: 403 });
    }
    const booking = await Booking.create({ ...input, vehicle: vehicle._id, customer: req.user._id, bookingId: `RO-${randomUUID().slice(0, 8).toUpperCase()}`, totalAmount: price.total, interstate: interstateTravel });
    res.status(201).json({ booking, price, interstate: interstateTravel });
  } catch (error) { next(error); }
});
router.patch('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const booking = await Booking.findOneAndUpdate({ _id: req.params.id, customer: req.user._id, status: { $in: ['pending', 'confirmed'] } }, { status: 'cancelled' }, { new: true });
    if (!booking) throw Object.assign(new Error('Booking cannot be cancelled'), { status: 404 });
    const refund = refundQuote(booking.totalAmount, booking.startAt);
    res.json({ booking, refund });
  } catch (error) { next(error); }
});
router.patch('/:id/status', requireAuth, allowRoles('admin'), async (req, res, next) => {
  try {
    const status = z.enum(['pending', 'confirmed', 'active', 'completed', 'cancelled']).parse(req.body.status);
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate('vehicle', 'name').populate('customer', 'name email');
    if (!booking) throw Object.assign(new Error('Booking not found'), { status: 404 });
    res.json({ booking });
  } catch (error) { next(error); }
});
export default router;
