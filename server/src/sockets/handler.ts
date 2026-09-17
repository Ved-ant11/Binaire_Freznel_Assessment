import { Server as SocketIOServer, type Socket } from 'socket.io';
import { SocketEvents, type IClientRegistration } from '@binaire/shared';
import { QueueManager } from '../queue/QueueManager.js';
import { ClientSession } from '../models/ClientSession.js';

export class SocketHandler {
  private readonly _io: SocketIOServer;
  private readonly _queueManager: QueueManager;
  private readonly _sessions: Map<string, ClientSession>;

  constructor(io: SocketIOServer, queueManager: QueueManager) {
    this._io = io;
    this._queueManager = queueManager;
    this._sessions = new Map();

    this._bindQueueEvents();
    this._io.on(SocketEvents.CONNECTION, (socket: Socket) => this._onConnection(socket));
  }

  private _onConnection(socket: Socket): void {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on(SocketEvents.CLIENT_REGISTER, (data: IClientRegistration) => {
      const existing = this._sessions.get(data.clientId);

      if (existing) {
        existing.updateSocketId(socket.id);
      } else {
        const session = new ClientSession({
          clientId: data.clientId,
          clientName: data.clientName,
          socketId: socket.id,
        });
        this._sessions.set(data.clientId, session);
      }

      console.log(`[Socket] Registered: ${data.clientName} (${data.clientId})`);

      socket.emit(SocketEvents.QUEUE_STATUS, this._queueManager.getAllTasks());
      socket.emit(SocketEvents.QUEUE_STATS, this._queueManager.getStats());
    });

    socket.on(SocketEvents.DISCONNECT, () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  }

  private _bindQueueEvents(): void {
    this._queueManager.on('task:status-update', (task) => {
      this._io.emit(SocketEvents.TASK_STATUS_UPDATE, task);
      this._io.emit(SocketEvents.QUEUE_STATUS, this._queueManager.getAllTasks());
    });

    this._queueManager.on('task:progress-update', (data) => {
      const session = this._findSessionByClientId(data.taskId);
      if (session) {
        this._io.to(session.socketId).emit(SocketEvents.TASK_PROGRESS_UPDATE, data);
      }
      this._io.emit(SocketEvents.TASK_PROGRESS_UPDATE, data);
    });

    this._queueManager.on('task:completed', (data) => {
      this._io.emit(SocketEvents.TASK_COMPLETED, data);
      this._io.emit(SocketEvents.QUEUE_STATS, this._queueManager.getStats());
    });

    this._queueManager.on('task:failed', (data) => {
      this._io.emit(SocketEvents.TASK_FAILED, data);
      this._io.emit(SocketEvents.QUEUE_STATS, this._queueManager.getStats());
    });

    this._queueManager.on('queue:status', (tasks) => {
      this._io.emit(SocketEvents.QUEUE_STATUS, tasks);
    });

    this._queueManager.on('queue:stats', (stats) => {
      this._io.emit(SocketEvents.QUEUE_STATS, stats);
    });
  }

  private _findSessionByClientId(taskId: string): ClientSession | null {
    const task = this._queueManager.getTask(taskId);
    if (!task) return null;
    return this._sessions.get(task.clientId) ?? null;
  }
}
