import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { Priority, TaskStatus } from '@binaire/shared';
import { Task } from '../models/Task.js';
import { QueueManager } from '../queue/QueueManager.js';
import { Config } from '../config.js';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, Config.UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: Config.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

export function createUploadRouter(queueManager: QueueManager): Router {
  const router = Router();

  router.post('/', upload.single('file'), (req: Request, res: Response): void => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }

      const { clientId, clientName, priority } = req.body;

      if (!clientId || !clientName) {
        res.status(400).json({ success: false, message: 'clientId and clientName are required' });
        return;
      }

      const taskPriority = priority === 'HIGH' ? Priority.HIGH : Priority.LOW;

      const activeCount = queueManager.getActiveTaskCountForClient(clientId);
      if (activeCount >= Config.MAX_TASKS_PER_CLIENT) {
        res.status(429).json({
          success: false,
          message: `Max ${Config.MAX_TASKS_PER_CLIENT} concurrent tasks per client`,
        });
        return;
      }

      const task = new Task({
        clientId,
        clientName,
        fileName: file.originalname,
        filePath: file.path,
        priority: taskPriority,
        fileSize: file.size,
      });

      task.updateStatus(TaskStatus.UPLOADED);
      queueManager.enqueue(task);

      res.status(201).json({
        success: true,
        taskId: task.id,
        message: 'File uploaded and queued for processing',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      res.status(500).json({ success: false, message });
    }
  });

  return router;
}
