import { v4 as uuidv4 } from 'uuid';
import { type ITask, Priority, TaskStatus, STATUS_ORDER } from '@binaire/shared';

export class Task {
  readonly id: string;
  readonly clientId: string;
  readonly clientName: string;
  readonly fileName: string;
  readonly filePath: string;
  readonly priority: Priority;
  readonly fileSize: number;
  readonly createdAt: Date;

  private status_: TaskStatus = TaskStatus.UPLOADING;
  private progress_ = 0;
  private result_: number | null = null;
  private rows_ = 0;
  private cols_ = 0;
  private processId_: string | null = null;
  private error_: string | null = null;
  private startedAt_: Date | null = null;
  private completedAt_: Date | null = null;

  constructor(params: {
    clientId: string;
    clientName: string;
    fileName: string;
    filePath: string;
    priority: Priority;
    fileSize: number;
  }) {
    this.id = uuidv4();
    this.clientId = params.clientId;
    this.clientName = params.clientName;
    this.fileName = params.fileName;
    this.filePath = params.filePath;
    this.priority = params.priority;
    this.fileSize = params.fileSize;
    this.createdAt = new Date();
  }

  get status() { return this.status_; }
  get progress() { return this.progress_; }
  get result() { return this.result_; }
  get rows() { return this.rows_; }
  get cols() { return this.cols_; }
  get processId() { return this.processId_; }
  get error() { return this.error_; }
  get startedAt() { return this.startedAt_; }
  get completedAt() { return this.completedAt_; }
  get rank() { return `${this.rows_}x${this.cols_}`; }

  get waitTimeMs(): number {
    return (this.startedAt_ || new Date()).getTime() - this.createdAt.getTime();
  }

  updateStatus(next: TaskStatus) {
    // FAILED is reachable from any state
    if (next === TaskStatus.FAILED) {
      this.status_ = TaskStatus.FAILED;
      this.completedAt_ = new Date();
      return;
    }

    const cur = STATUS_ORDER.indexOf(this.status_);
    const nxt = STATUS_ORDER.indexOf(next);
    if (nxt <= cur) {
      throw new Error(`Invalid transition: ${this.status_} → ${next}`);
    }

    this.status_ = next;
    if (next === TaskStatus.PROCESSING) this.startedAt_ = new Date();
    if (next === TaskStatus.COMPLETED) {
      this.completedAt_ = new Date();
      this.progress_ = 100;
    }
  }

  updateProgress(pct: number) {
    this.progress_ = Math.max(0, Math.min(100, Math.round(pct)));
  }

  setDimensions(rows: number, cols: number) {
    this.rows_ = rows;
    this.cols_ = cols;
  }

  setProcessId(pid: string) { this.processId_ = pid; }
  setResult(val: number) { this.result_ = val; }

  fail(msg: string) {
    this.error_ = msg;
    this.updateStatus(TaskStatus.FAILED);
  }

  toJSON(): ITask {
    return {
      id: this.id,
      clientId: this.clientId,
      clientName: this.clientName,
      fileName: this.fileName,
      filePath: this.filePath,
      priority: this.priority,
      status: this.status_,
      progress: this.progress_,
      result: this.result_,
      rank: this.rank,
      rows: this.rows_,
      cols: this.cols_,
      fileSize: this.fileSize,
      processId: this.processId_,
      error: this.error_,
      createdAt: this.createdAt.toISOString(),
      startedAt: this.startedAt_?.toISOString() ?? null,
      completedAt: this.completedAt_?.toISOString() ?? null,
    };
  }
}
