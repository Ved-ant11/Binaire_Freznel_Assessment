import { EventEmitter } from 'node:events';
import { Priority, TaskStatus, type ITask, type IQueueStats } from '@binaire/shared';
import { Task } from '../models/Task.js';
import { PriorityQueue } from './PriorityQueue.js';
import { WorkerPool } from '../workers/WorkerPool.js';
import { Config } from '../config.js';

export class QueueManager extends EventEmitter {
  private readonly _highQueue: PriorityQueue;
  private readonly _lowQueue: PriorityQueue;
  private readonly _workerPool: WorkerPool;
  private readonly _allTasks: Map<string, Task>;
  private _consecutiveHighCount: number;
  private _isProcessing: boolean;

  constructor() {
    super();
    this._highQueue = new PriorityQueue();
    this._lowQueue = new PriorityQueue();
    this._workerPool = new WorkerPool(Config.WORKER_POOL_SIZE);
    this._allTasks = new Map();
    this._consecutiveHighCount = 0;
    this._isProcessing = false;

    this._startAgingInterval();
  }

  public enqueue(task: Task): void {
    this._allTasks.set(task.id, task);

    task.updateStatus(TaskStatus.QUEUED);
    this._emitTaskUpdate(task);

    if (task.priority === Priority.HIGH) {
      this._highQueue.enqueue(task);
    } else {
      this._lowQueue.enqueue(task);
    }

    this._emitQueueStatus();
    this._emitQueueStats();
    this._processNext();
  }

  public getTask(taskId: string): Task | null {
    return this._allTasks.get(taskId) ?? null;
  }

  public getAllTasks(): ITask[] {
    return Array.from(this._allTasks.values()).map((task) => task.toJSON());
  }

  public getStats(): IQueueStats {
    const tasks = Array.from(this._allTasks.values());
    return {
      totalTasks: tasks.length,
      highPriorityCount: this._highQueue.size,
      lowPriorityCount: this._lowQueue.size,
      processingCount: tasks.filter((t) => t.status === TaskStatus.PROCESSING).length,
      waitingCount: tasks.filter((t) => t.status === TaskStatus.WAITING).length,
      completedCount: tasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
      activeWorkers: this._workerPool.activeCount,
      maxWorkers: this._workerPool.maxWorkers,
    };
  }

  public getActiveTaskCountForClient(clientId: string): number {
    let count = 0;
    for (const task of this._allTasks.values()) {
      if (
        task.clientId === clientId &&
        task.status !== TaskStatus.COMPLETED &&
        task.status !== TaskStatus.FAILED
      ) {
        count++;
      }
    }
    return count;
  }

  public async shutdown(): Promise<void> {
    await this._workerPool.terminate();
  }

  private _processNext(): void {
    if (this._isProcessing) return;
    if (!this._workerPool.hasAvailableWorker()) return;

    const task = this._selectNextTask();
    if (!task) return;

    this._isProcessing = true;
    this._executeTask(task).finally(() => {
      this._isProcessing = false;
      this._processNext();
    });
  }

  private _selectNextTask(): Task | null {
    const forceLow =
      this._consecutiveHighCount >= Config.STARVATION_RATIO &&
      !this._lowQueue.isEmpty();

    if (forceLow) {
      this._consecutiveHighCount = 0;
      return this._lowQueue.dequeue();
    }

    if (!this._highQueue.isEmpty()) {
      this._consecutiveHighCount++;
      return this._highQueue.dequeue();
    }

    if (!this._lowQueue.isEmpty()) {
      this._consecutiveHighCount = 0;
      return this._lowQueue.dequeue();
    }

    return null;
  }

  private async _executeTask(task: Task): Promise<void> {
    try {
      task.updateStatus(TaskStatus.WAITING);
      this._emitTaskUpdate(task);
      this._emitQueueStatus();

      const { result, rows, cols, processId } = await this._workerPool.execute(
        task,
        (progress: number, pid: string) => {
          if (task.status === TaskStatus.WAITING) {
            task.updateStatus(TaskStatus.PROCESSING);
            task.setProcessId(pid);
          }
          task.updateProgress(progress);
          this.emit('task:progress-update', {
            taskId: task.id,
            progress: task.progress,
            processId: pid,
          });
        }
      );

      task.setDimensions(rows, cols);
      task.setResult(result);
      task.updateStatus(TaskStatus.COMPLETED);
      this._emitTaskUpdate(task);
      this.emit('task:completed', {
        taskId: task.id,
        result,
        completedAt: task.completedAt?.toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown processing error';
      task.fail(message);
      this._emitTaskUpdate(task);
      this.emit('task:failed', { taskId: task.id, error: message });
    } finally {
      this._emitQueueStatus();
      this._emitQueueStats();
    }
  }

  private _startAgingInterval(): void {
    setInterval(() => {
      const lowTasks = this._lowQueue.toArray();

      for (const task of lowTasks) {
        if (task.waitTimeMs > Config.AGING_THRESHOLD_MS) {
          this._lowQueue.remove(task.id);
          this._highQueue.enqueue(task);
          console.log(
            `[QueueManager] Promoted task ${task.id} (${task.fileName}) ` +
            `LOW → HIGH (waited ${Math.round(task.waitTimeMs / 1000)}s)`
          );
        }
      }

      this._processNext();
    }, 5000);
  }

  private _emitTaskUpdate(task: Task): void {
    this.emit('task:status-update', task.toJSON());
  }

  private _emitQueueStatus(): void {
    this.emit('queue:status', this.getAllTasks());
  }

  private _emitQueueStats(): void {
    this.emit('queue:stats', this.getStats());
  }
}
