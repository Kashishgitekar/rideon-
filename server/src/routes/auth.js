import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const credentials = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(2).optional(), role: z.enum(['customer', 'driver']).optional() });
function tokenFor(user) { return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }); }
function publicUser(user) { return { id: user.id, name: user.name, email: user.email, role: user.role }; }

router.post('/register', async (req, res, next) => {
  try {
    const input = credentials.parse(req.body);
    if (!input.name) throw Object.assign(new Error('Name is required'), { status: 400 });
    const exists = await User.findOne({ email: input.email });
    if (exists) throw Object.assign(new Error('An account with this email already exists'), { status: 409 });
    const user = await User.create({ ...input, passwordHash: await bcrypt.hash(input.password, 12) });
    res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) { next(error); }
});
router.post('/login', async (req, res, next) => {
  try {
    const input = credentials.pick({ email: true, password: true }).parse(req.body);
    const user = await User.findOne({ email: input.email });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw Object.assign(new Error('Invalid email or password'), { status: 401 });
    res.json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) { next(error); }
});
router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
router.patch('/password', requireAuth, async (req, res, next) => {
  try {
    const input = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) }).parse(req.body);
    const user = await User.findById(req.user._id);
    if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
      throw Object.assign(new Error('Current password is incorrect'), { status: 401 });
    }
    user.passwordHash = await bcrypt.hash(input.newPassword, 12);
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (error) { next(error); }
});
export default router;
