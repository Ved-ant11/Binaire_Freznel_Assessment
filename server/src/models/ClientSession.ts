export class ClientSession {
  readonly clientId: string;
  readonly clientName: string;
  readonly connectedAt = new Date();
  private socketId_: string;
  private tasks_ = new Set<string>();

  constructor(clientId: string, clientName: string, socketId: string) {
    this.clientId = clientId;
    this.clientName = clientName;
    this.socketId_ = socketId;
  }

  get socketId() { return this.socketId_; }
  get taskCount() { return this.tasks_.size; }

  reconnect(socketId: string) { this.socketId_ = socketId; }

  addTask(id: string) { this.tasks_.add(id); }
  removeTask(id: string) { this.tasks_.delete(id); }
  ownsTask(id: string) { return this.tasks_.has(id); }

  toJSON() {
    return {
      clientId: this.clientId,
      clientName: this.clientName,
      connectedAt: this.connectedAt.toISOString(),
      taskCount: this.tasks_.size,
    };
  }
}
