import { v4 as uuidv4 } from 'uuid';
import { type ITask, Priority, TaskStatus, STATUS_ORDER } from '@binaire/shared';

export class Task {
  public readonly id: string;
  public readonly clientId: string;
  public readonly clientName: string;
  public readonly fileName: string;
  public readonly filePath: string;
  public readonly priority: Priority;
  public readonly fileSize: number;
  public readonly createdAt: Date;

  private _status: TaskStatus;
  private _progress: number;
  private _result: number | null;
  private _rows: number;
  private _cols: number;
  private _processId: string | null;
  private _error: string | null;
  private _startedAt: Date | null;
  private _completedAt: Date | null;

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

    this._status = TaskStatus.UPLOADING;
    this._progress = 0;
    this._result = null;
    this._rows = 0;
    this._cols = 0;
    this._processId = null;
    this._error = null;
    this._startedAt = null;
    this._completedAt = null;
  }

  get status(): TaskStatus { return this._status; }
  get progress(): number { return this._progress; }
  get result(): number | null { return this._result; }
  get rows(): number { return this._rows; }
  get cols(): number { return this._cols; }
  get rank(): string { return `${this._rows}x${this._cols}`; }
  get processId(): string | null { return this._processId; }
  get error(): string | null { return this._error; }
  get startedAt(): Date | null { return this._startedAt; }
  get completedAt(): Date | null { return this._completedAt; }

  get waitTimeMs(): number {
    const end = this._startedAt || new Date();
    return end.getTime() - this.createdAt.getTime();
  }

  public updateStatus(newStatus: TaskStatus): void {
    if (newStatus === TaskStatus.FAILED) {
      this._status = TaskStatus.FAILED;
      this._completedAt = new Date();
      return;
    }

    const currentIndex = STATUS_ORDER.indexOf(this._status);
    const newIndex = STATUS_ORDER.indexOf(newStatus);

    if (newIndex <= currentIndex) {
      throw new Error(
        `Invalid status transition: ${this._status} → ${newStatus}`
      );
    }

    this._status = newStatus;

    if (newStatus === TaskStatus.PROCESSING) {
      this._startedAt = new Date();
    }

    if (newStatus === TaskStatus.COMPLETED) {
      this._completedAt = new Date();
      this._progress = 100;
    }
  }

  public updateProgress(percentage: number): void {
    this._progress = Math.max(0, Math.min(100, Math.round(percentage)));
  }

  public setDimensions(rows: number, cols: number): void {
    this._rows = rows;
    this._cols = cols;
  }

  public setProcessId(processId: string): void {
    this._processId = processId;
  }

  public setResult(result: number): void {
    this._result = result;
  }

  public fail(error: string): void {
    this._error = error;
    this.updateStatus(TaskStatus.FAILED);
  }

  public toJSON(): ITask {
    return {
      id: this.id,
      clientId: this.clientId,
      clientName: this.clientName,
      fileName: this.fileName,
      filePath: this.filePath,
      priority: this.priority,
      status: this._status,
      progress: this._progress,
      result: this._result,
      rank: this.rank,
      rows: this._rows,
      cols: this._cols,
      fileSize: this.fileSize,
      processId: this._processId,
      error: this._error,
      createdAt: this.createdAt.toISOString(),
      startedAt: this._startedAt?.toISOString() ?? null,
      completedAt: this._completedAt?.toISOString() ?? null,
    };
  }
}
