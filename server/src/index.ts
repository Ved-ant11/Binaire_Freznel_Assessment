import express from 'express';
import { createServer } from 'node:http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import { mkdirSync } from 'node:fs';
import { Config } from './config.js';
import { QueueManager } from './queue/QueueManager.js';
import { SocketHandler } from './sockets/handler.js';
import { createUploadRouter } from './routes/upload.js';

const app = express();
const server = createServer(app);

const io = new SocketIO(server, {
  cors: { origin: Config.CORS_ORIGIN, methods: ['GET', 'POST'] },
});

// ensure uploads dir exists
mkdirSync(Config.UPLOAD_DIR, { recursive: true });

app.use(cors({ origin: Config.CORS_ORIGIN }));
app.use(express.json());

const qm = new QueueManager();
new SocketHandler(io, qm);

app.use('/api/upload', createUploadRouter(qm));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), stats: qm.getStats() });
});

app.get('/api/tasks', (_req, res) => {
  res.json(qm.getAllTasks());
});

// graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await qm.shutdown();
  server.close();
  process.exit(0);
});

server.listen(Config.PORT, () => {
  console.log(`Server running on http://localhost:${Config.PORT}`);
  console.log(`Workers: ${Config.WORKER_POOL_SIZE} | Uploads: ${Config.UPLOAD_DIR}`);
});
