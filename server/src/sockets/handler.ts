import type { Server as SocketIOServer, Socket } from 'socket.io';
import { SocketEvents, type IClientRegistration } from '@binaire/shared';
import { QueueManager } from '../queue/QueueManager.js';
import { ClientSession } from '../models/ClientSession.js';

export class SocketHandler {
  private io: SocketIOServer;
  private qm: QueueManager;
  private sessions = new Map<string, ClientSession>();

  constructor(io: SocketIOServer, qm: QueueManager) {
    this.io = io;
    this.qm = qm;
    this.wireQueueEvents();
    this.io.on(SocketEvents.CONNECTION, (s: Socket) => this.onConnect(s));
  }

  private onConnect(s: Socket) {
    console.log(`[Socket] Connected: ${s.id}`);

    s.on(SocketEvents.CLIENT_REGISTER, (data: IClientRegistration) => {
      const existing = this.sessions.get(data.clientId);
      if (existing) {
        existing.reconnect(s.id);
      } else {
        this.sessions.set(data.clientId, new ClientSession(data.clientId, data.clientName, s.id));
      }

      console.log(`[Socket] Registered: ${data.clientName} (${data.clientId})`);
      s.emit(SocketEvents.QUEUE_STATUS, this.qm.getAllTasks());
      s.emit(SocketEvents.QUEUE_STATS, this.qm.getStats());
    });

    s.on(SocketEvents.DISCONNECT, () => {
      console.log(`[Socket] Disconnected: ${s.id}`);
      // TODO: consider cleaning up sessions after a timeout
    });
  }

  private wireQueueEvents() {
    this.qm.on('task:status-update', (task) => {
      this.io.emit(SocketEvents.TASK_STATUS_UPDATE, task);
      this.io.emit(SocketEvents.QUEUE_STATUS, this.qm.getAllTasks());
    });

    this.qm.on('task:progress-update', (data) => {
      this.io.emit(SocketEvents.TASK_PROGRESS_UPDATE, data);
    });

    this.qm.on('task:completed', (data) => {
      this.io.emit(SocketEvents.TASK_COMPLETED, data);
      this.io.emit(SocketEvents.QUEUE_STATS, this.qm.getStats());
    });

    this.qm.on('task:failed', (data) => {
      this.io.emit(SocketEvents.TASK_FAILED, data);
      this.io.emit(SocketEvents.QUEUE_STATS, this.qm.getStats());
    });

    this.qm.on('queue:status', (tasks) => {
      this.io.emit(SocketEvents.QUEUE_STATUS, tasks);
    });

    this.qm.on('queue:stats', (stats) => {
      this.io.emit(SocketEvents.QUEUE_STATS, stats);
    });
  }
}
