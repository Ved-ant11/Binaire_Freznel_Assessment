export class ClientSession {
  public readonly clientId: string;
  public readonly clientName: string;
  public readonly connectedAt: Date;

  private _socketId: string;
  private readonly _taskIds: Set<string>;

  constructor(params: {
    clientId: string;
    clientName: string;
    socketId: string;
  }) {
    this.clientId = params.clientId;
    this.clientName = params.clientName;
    this.connectedAt = new Date();
    this._socketId = params.socketId;
    this._taskIds = new Set();
  }

  get socketId(): string { return this._socketId; }
  get taskIds(): ReadonlySet<string> { return this._taskIds; }
  get taskCount(): number { return this._taskIds.size; }

  public updateSocketId(newSocketId: string): void {
    this._socketId = newSocketId;
  }

  public addTask(taskId: string): void {
    this._taskIds.add(taskId);
  }

  public removeTask(taskId: string): void {
    this._taskIds.delete(taskId);
  }

  public ownsTask(taskId: string): boolean {
    return this._taskIds.has(taskId);
  }

  public toJSON() {
    return {
      clientId: this.clientId,
      clientName: this.clientName,
      connectedAt: this.connectedAt.toISOString(),
      taskCount: this._taskIds.size,
    };
  }
}
