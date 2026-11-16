import dotenv from 'dotenv';
dotenv.config();
import { createServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { attachRealtime } from './sockets/realtime.js';

const port = Number(process.env.PORT || 5000);
try {
  await connectDatabase();
  const httpServer = createServer(app);
  const io = new SocketServer(httpServer, {
    cors: { origin: process.env.SOCKET_CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173' }
  });
  app.locals.io = io;
  attachRealtime(io);
  httpServer.listen(port, () => console.log(`RideOn API listening on http://localhost:${port}`));
} catch (error) {
  console.error('Unable to start RideOn API:', error.message);
  process.exitCode = 1;
}
