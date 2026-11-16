import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function requireAuth(req, _res, next) {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null;
    if (!token) return next(Object.assign(new Error('Authentication required'), { status: 401 }));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(payload.sub).select('-passwordHash');
    if (!req.user || req.user.status !== 'active') {
      return next(Object.assign(new Error('Account is unavailable'), { status: 401 }));
    }
    next();
  } catch {
    next(Object.assign(new Error('Invalid or expired token'), { status: 401 }));
  }
}

export function allowRoles(...roles) {
  return (req, _res, next) => roles.includes(req.user?.role)
    ? next()
    : next(Object.assign(new Error('You do not have permission for this action'), { status: 403 }));
}
