import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Ride from '../models/Ride.js';
import ChatMessage from '../models/ChatMessage.js';

function roomForRide(id) { return `ride:${id}`; }

export function attachRealtime(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.sub).select('-passwordHash');
      if (!user || user.status !== 'active') return next(new Error('Account is unavailable'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', socket => {
    socket.join(`user:${socket.user._id}`); // personal room for direct notifications

    socket.on('ride:join', async ({ rideId } = {}, acknowledge = () => {}) => {
      try {
        const ride = await Ride.findById(rideId).select('rider driver status');
        if (!ride) throw new Error('Ride not found');
        const isParticipant = [String(ride.rider), String(ride.driver)].includes(String(socket.user._id));
        if (!isParticipant && socket.user.role !== 'admin') throw new Error('Not authorized for this ride');
        socket.join(roomForRide(rideId));
        acknowledge({ ok: true, ride });
      } catch (error) {
        acknowledge({ ok: false, message: error.message });
      }
    });

    socket.on('captain:location', async ({ latitude, longitude, rideId } = {}, acknowledge = () => {}) => {
      try {
        if (socket.user.role !== 'driver') throw new Error('Captain access required');
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          throw new Error('Valid coordinates are required');
        }
        await User.updateOne({ _id: socket.user._id }, {
          $set: {
            'driverProfile.currentLocation': { type: 'Point', coordinates: [longitude, latitude] },
            'driverProfile.lastLocationAt': new Date()
          }
        });
        if (rideId) io.to(roomForRide(rideId)).emit('captain:location', { latitude, longitude, updatedAt: new Date().toISOString() });
        acknowledge({ ok: true });
      } catch (error) {
        acknowledge({ ok: false, message: error.message });
      }
    });

    // In-ride chat: persists the message and broadcasts it to the ride room
    socket.on('chat:send', async ({ rideId, message } = {}, acknowledge = () => {}) => {
      try {
        if (!message || typeof message !== 'string' || message.trim().length === 0 || message.length > 1000) {
          throw new Error('Message text is required');
        }
        const ride = await Ride.findById(rideId).select('rider driver');
        if (!ride) throw new Error('Ride not found');
        const isParticipant = [String(ride.rider), String(ride.driver)].includes(String(socket.user._id));
        if (!isParticipant) throw new Error('Not authorized for this ride');
        const chat = await ChatMessage.create({ ride: rideId, sender: socket.user._id, message: message.trim() });
        io.to(roomForRide(rideId)).emit('chat:message', chat.toObject());
        acknowledge({ ok: true, message: chat.toObject() });
      } catch (error) {
        acknowledge({ ok: false, message: error.message });
      }
    });

    socket.on('disconnect', () => {
      if (socket.user?.role === 'driver') {
        User.updateOne({ _id: socket.user._id }, { $set: { 'driverProfile.lastLocationAt': new Date() } }).catch(() => {});
      }
    });
  });
}
