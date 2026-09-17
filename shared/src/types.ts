export enum Priority {
  HIGH = 'HIGH',
  LOW = 'LOW',
}

export enum TaskStatus {
  UPLOADING = 'UPLOADING',
  UPLOADED = 'UPLOADED',
  QUEUED = 'QUEUED',
  WAITING = 'WAITING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ITask {
  readonly id: string;
  clientId: string;
  clientName: string;
  fileName: string;
  filePath: string;
  priority: Priority;
  status: TaskStatus;
  progress: number;
  result: number | null;
  rank: string;
  rows: number;
  cols: number;
  fileSize: number;
  processId: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface IQueueStats {
  totalTasks: number;
  highPriorityCount: number;
  lowPriorityCount: number;
  processingCount: number;
  waitingCount: number;
  completedCount: number;
  activeWorkers: number;
  maxWorkers: number;
}

export interface IClientRegistration {
  clientId: string;
  clientName: string;
}

export interface IUploadResponse {
  success: boolean;
  taskId: string;
  message: string;
}

export interface IProgressUpdate {
  taskId: string;
  progress: number;
  processId: string;
}

export interface ITaskCompletion {
  taskId: string;
  result: number;
  completedAt: string;
}

export const STATUS_ORDER: readonly TaskStatus[] = Object.freeze([
  TaskStatus.UPLOADING,
  TaskStatus.UPLOADED,
  TaskStatus.QUEUED,
  TaskStatus.WAITING,
  TaskStatus.PROCESSING,
  TaskStatus.COMPLETED,
]);

export const SocketEvents = Object.freeze({
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  CLIENT_REGISTER: 'client:register',
  TASK_SUBSCRIBE: 'task:subscribe',
  TASK_STATUS_UPDATE: 'task:status-update',
  TASK_PROGRESS_UPDATE: 'task:progress-update',
  TASK_COMPLETED: 'task:completed',
  TASK_FAILED: 'task:failed',
  QUEUE_STATUS: 'queue:status',
  QUEUE_STATS: 'queue:stats',
} as const);

export const Defaults = Object.freeze({
  MAX_FILE_SIZE_MB: 50,
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['text/csv', 'application/vnd.ms-excel'] as readonly string[],
  AGING_THRESHOLD_MS: 30_000,
  MAX_CONCURRENT_PER_CLIENT: 10,
  STARVATION_RATIO: 3,
});
