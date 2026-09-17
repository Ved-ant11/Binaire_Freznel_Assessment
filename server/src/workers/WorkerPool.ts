import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Task } from '../models/Task.js';
import { Config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKER_SCRIPT = path.resolve(__dirname, './csvProcessor.worker.ts');

type ProgressCallback = (progress: number, processId: string) => void;

interface WorkerResult {
  result: number;
  rows: number;
  cols: number;
  processId: string;
}

export class WorkerPool {
  private readonly _maxWorkers: number;
  private _activeWorkers: Map<string, Worker>;

  constructor(maxWorkers: number) {
    this._maxWorkers = maxWorkers;
    this._activeWorkers = new Map();
  }

  get activeCount(): number { return this._activeWorkers.size; }
  get maxWorkers(): number { return this._maxWorkers; }

  public hasAvailableWorker(): boolean {
    return this._activeWorkers.size < this._maxWorkers;
  }

  public execute(task: Task, onProgress: ProgressCallback): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(WORKER_SCRIPT, {
        workerData: { filePath: task.filePath, taskId: task.id },
        execArgv: ['--import', 'tsx'],
      });

      const processId = `worker-${worker.threadId}`;
      this._activeWorkers.set(task.id, worker);

      const timeout = setTimeout(() => {
        worker.terminate();
        this._activeWorkers.delete(task.id);
        reject(new Error(`Worker timeout after ${Config.WORKER_TIMEOUT_MS}ms`));
      }, Config.WORKER_TIMEOUT_MS);

      worker.on('message', (msg: { type: string; progress?: number; result?: number; rows?: number; cols?: number; error?: string }) => {
        switch (msg.type) {
          case 'progress':
            onProgress(msg.progress!, processId);
            break;

          case 'result':
            clearTimeout(timeout);
            this._activeWorkers.delete(task.id);
            resolve({
              result: msg.result!,
              rows: msg.rows!,
              cols: msg.cols!,
              processId,
            });
            break;

          case 'error':
            clearTimeout(timeout);
            this._activeWorkers.delete(task.id);
            reject(new Error(msg.error));
            break;
        }
      });

      worker.on('error', (err) => {
        clearTimeout(timeout);
        this._activeWorkers.delete(task.id);
        reject(err);
      });

      worker.on('exit', (code) => {
        clearTimeout(timeout);
        this._activeWorkers.delete(task.id);
        if (code !== 0) {
          reject(new Error(`Worker exited with code ${code}`));
        }
      });
    });
  }

  public async terminate(): Promise<void> {
    const terminations = Array.from(this._activeWorkers.values()).map((worker) =>
      worker.terminate()
    );
    await Promise.allSettled(terminations);
    this._activeWorkers.clear();
  }
}
