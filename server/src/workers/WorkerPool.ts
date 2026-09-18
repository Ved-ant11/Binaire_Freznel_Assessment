import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Task } from '../models/Task.js';
import { Config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isTsNode = import.meta.url.endsWith('.ts');
const workerExt = isTsNode ? '.ts' : '.js';
const WORKER_PATH = path.resolve(__dirname, `./csvProcessor.worker${workerExt}`);

type OnProgress = (progress: number, processId: string) => void;

interface WorkerResult {
  result: number;
  rows: number;
  cols: number;
  processId: string;
}

export class WorkerPool {
  readonly maxWorkers: number;
  private active = new Map<string, Worker>();

  constructor(max: number) {
    this.maxWorkers = max;
  }

  get activeCount() { return this.active.size; }

  hasAvailableWorker() { return this.active.size < this.maxWorkers; }

  execute(task: Task, onProgress: OnProgress): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      const w = new Worker(WORKER_PATH, {
        workerData: { filePath: task.filePath, taskId: task.id },
        execArgv: isTsNode ? ['--import', 'tsx'] : [],
      });

      const pid = `worker-${w.threadId}`;
      this.active.set(task.id, w);

      const timer = setTimeout(() => {
        w.terminate();
        this.active.delete(task.id);
        reject(new Error(`Timeout after ${Config.WORKER_TIMEOUT_MS / 1000}s`));
      }, Config.WORKER_TIMEOUT_MS);

      w.on('message', (msg: any) => {
        if (msg.type === 'progress') {
          onProgress(msg.progress, pid);
        } else if (msg.type === 'result') {
          clearTimeout(timer);
          this.active.delete(task.id);
          resolve({ result: msg.result, rows: msg.rows, cols: msg.cols, processId: pid });
        } else if (msg.type === 'error') {
          clearTimeout(timer);
          this.active.delete(task.id);
          reject(new Error(msg.error));
        }
      });

      w.on('error', (err) => {
        clearTimeout(timer);
        this.active.delete(task.id);
        reject(err);
      });

      w.on('exit', (code) => {
        clearTimeout(timer);
        this.active.delete(task.id);
        if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
      });
    });
  }

  async terminate() {
    await Promise.allSettled([...this.active.values()].map(w => w.terminate()));
    this.active.clear();
  }
}
