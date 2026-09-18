import { EventEmitter } from 'node:events';
import { Priority, TaskStatus, type ITask, type IQueueStats } from '@binaire/shared';
import { Task } from '../models/Task.js';
import { PriorityQueue } from './PriorityQueue.js';
import { WorkerPool } from '../workers/WorkerPool.js';
import { Config } from '../config.js';

export class QueueManager extends EventEmitter {
  private highQ = new PriorityQueue();
  private lowQ = new PriorityQueue();
  private pool: WorkerPool;
  private tasks = new Map<string, Task>();
  private consecutiveHigh = 0;

  constructor() {
    super();
    this.pool = new WorkerPool(Config.WORKER_POOL_SIZE);

    // check for starved low-priority tasks every 5s
    setInterval(() => this.ageLowPriorityTasks(), 5000);
  }

  enqueue(task: Task) {
    this.tasks.set(task.id, task);
    task.updateStatus(TaskStatus.QUEUED);
    this.broadcastTask(task);

    if (task.priority === Priority.HIGH) {
      this.highQ.enqueue(task);
    } else {
      this.lowQ.enqueue(task);
    }

    this.broadcastAll();
    this.processNext();
  }

  getTask(id: string) { return this.tasks.get(id) ?? null; }

  getAllTasks(): ITask[] {
    return [...this.tasks.values()].map(t => t.toJSON());
  }

  getStats(): IQueueStats {
    const all = [...this.tasks.values()];
    return {
      totalTasks: all.length,
      highPriorityCount: this.highQ.size,
      lowPriorityCount: this.lowQ.size,
      processingCount: all.filter(t => t.status === TaskStatus.PROCESSING).length,
      waitingCount: all.filter(t => t.status === TaskStatus.WAITING).length,
      completedCount: all.filter(t => t.status === TaskStatus.COMPLETED).length,
      activeWorkers: this.pool.activeCount,
      maxWorkers: this.pool.maxWorkers,
    };
  }

  activeCountFor(clientId: string): number {
    let n = 0;
    for (const t of this.tasks.values()) {
      if (t.clientId === clientId && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.FAILED) {
        n++;
      }
    }
    return n;
  }

  async shutdown() {
    await this.pool.terminate();
  }

  // scheduling

  private processNext() {
    while (this.pool.hasAvailableWorker()) {
      const task = this.pickNext();
      if (!task) break;

      this.runTask(task).finally(() => this.processNext());
    }
  }

  private pickNext(): Task | null {
    // anti-starvation: after N consecutive high-pri tasks, force a low-pri one
    if (this.consecutiveHigh >= Config.STARVATION_RATIO && !this.lowQ.isEmpty()) {
      this.consecutiveHigh = 0;
      return this.lowQ.dequeue();
    }

    if (!this.highQ.isEmpty()) {
      this.consecutiveHigh++;
      return this.highQ.dequeue();
    }

    if (!this.lowQ.isEmpty()) {
      this.consecutiveHigh = 0;
      return this.lowQ.dequeue();
    }

    return null;
  }

  private async runTask(task: Task) {
    try {
      task.updateStatus(TaskStatus.WAITING);
      this.broadcastTask(task);
      this.emit('queue:status', this.getAllTasks());

      const { result, rows, cols, processId } = await this.pool.execute(
        task,
        (progress, pid) => {
          if (task.status === TaskStatus.WAITING) {
            task.updateStatus(TaskStatus.PROCESSING);
            task.setProcessId(pid);
          }
          task.updateProgress(progress);
          this.emit('task:progress-update', { taskId: task.id, progress: task.progress, processId: pid });
        }
      );

      task.setDimensions(rows, cols);
      task.setResult(result);
      task.updateStatus(TaskStatus.COMPLETED);
      this.broadcastTask(task);
      this.emit('task:completed', { taskId: task.id, result, completedAt: task.completedAt?.toISOString() });

    } catch (err: any) {
      task.fail(err?.message ?? 'Unknown error');
      this.broadcastTask(task);
      this.emit('task:failed', { taskId: task.id, error: task.error });
    } finally {
      this.broadcastAll();
    }
  }

  private ageLowPriorityTasks() {
    for (const task of this.lowQ.toArray()) {
      if (task.waitTimeMs > Config.AGING_THRESHOLD_MS) {
        this.lowQ.remove(task.id);
        this.highQ.enqueue(task);
        console.log(`[Queue] Promoted ${task.fileName} to HIGH (waited ${Math.round(task.waitTimeMs / 1000)}s)`);
      }
    }
    this.processNext();
  }

  // broadcast helpers

  private broadcastTask(task: Task) {
    this.emit('task:status-update', task.toJSON());
  }

  private broadcastAll() {
    this.emit('queue:status', this.getAllTasks());
    this.emit('queue:stats', this.getStats());
  }
}
