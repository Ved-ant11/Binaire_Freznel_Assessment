import express from 'express';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { mkdirSync } from 'node:fs';
import { Config } from './config.js';
import { QueueManager } from './queue/QueueManager.js';
import { SocketHandler } from './sockets/handler.js';
import { createUploadRouter } from './routes/upload.js';

const app = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: Config.CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

mkdirSync(Config.UPLOAD_DIR, { recursive: true });

app.use(cors({ origin: Config.CORS_ORIGIN }));
app.use(express.json());

const queueManager = new QueueManager();
new SocketHandler(io, queueManager);

app.use('/api/upload', createUploadRouter(queueManager));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    stats: queueManager.getStats(),
  });
});

app.get('/api/tasks', (_req, res) => {
  res.json(queueManager.getAllTasks());
});

const shutdown = async () => {
  console.log('\n[Server] Shutting down gracefully...');
  await queueManager.shutdown();
  httpServer.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

httpServer.listen(Config.PORT, () => {
  console.log(`[Server] Running on http://localhost:${Config.PORT}`);
  console.log(`[Server] Worker pool size: ${Config.WORKER_POOL_SIZE}`);
  console.log(`[Server] Upload dir: ${Config.UPLOAD_DIR}`);
});
