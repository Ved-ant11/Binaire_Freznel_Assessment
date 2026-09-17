import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const Config = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  UPLOAD_DIR: path.resolve(__dirname, '../../uploads'),
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  // leave one core free for the main thread
  WORKER_POOL_SIZE: Math.max(2, os.cpus().length - 1),
  AGING_THRESHOLD_MS: 30_000,
  STARVATION_RATIO: 3,
  MAX_TASKS_PER_CLIENT: 10,
  WORKER_TIMEOUT_MS: 5 * 60 * 1000,
} as const;
