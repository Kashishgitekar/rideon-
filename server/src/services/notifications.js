import Notification from "../models/Notification.js";

/**
 * Persist an in-app notification and push it over Socket.IO to the user's personal room.
 * Never throws — notification failures must not break the main flow.
 */
export async function notify(
  io,
  userId,
  { title, body, type = "system", meta = {} },
) {
  try {
    const notification = await Notification.create({
      user: userId,
      title,
      body,
      type,
      meta,
    });
    io?.to(`user:${userId}`).emit("notification:new", notification.toObject());
    return notification;
  } catch {
    return null;
  }
}
