import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { v4 as uuid } from 'uuid';
import { Priority, TaskStatus } from '@binaire/shared';
import { Task } from '../models/Task.js';
import { QueueManager } from '../queue/QueueManager.js';
import { Config } from '../config.js';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, Config.UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: Config.MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    if (path.extname(file.originalname).toLowerCase() === '.csv') cb(null, true);
    else cb(new Error('Only CSV files are allowed'));
  },
});

export function createUploadRouter(qm: QueueManager): Router {
  const router = Router();

  router.post('/', upload.single('file'), (req, res): void => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }

      const { clientId, clientName, priority } = req.body;
      if (!clientId || !clientName) {
        res.status(400).json({ success: false, message: 'clientId and clientName required' });
        return;
      }

      if (qm.activeCountFor(clientId) >= Config.MAX_TASKS_PER_CLIENT) {
        res.status(429).json({ success: false, message: `Max ${Config.MAX_TASKS_PER_CLIENT} concurrent tasks` });
        return;
      }

      const task = new Task({
        clientId,
        clientName,
        fileName: req.file.originalname,
        filePath: req.file.path,
        priority: priority === 'HIGH' ? Priority.HIGH : Priority.LOW,
        fileSize: req.file.size,
      });

      task.updateStatus(TaskStatus.UPLOADED);
      qm.enqueue(task);

      res.status(201).json({ success: true, taskId: task.id, message: 'Queued for processing' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message ?? 'Upload failed' });
    }
  });

  return router;
}
