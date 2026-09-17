import { Task } from '../models/Task.js';

export class PriorityQueue {
  private _items: (Task | undefined)[];
  private _head: number;
  private _tail: number;
  private readonly COMPACT_THRESHOLD = 1000;

  constructor() {
    this._items = [];
    this._head = 0;
    this._tail = 0;
  }

  public enqueue(task: Task): void {
    this._items[this._tail] = task;
    this._tail++;
  }

  public dequeue(): Task | null {
    if (this.isEmpty()) return null;

    const task = this._items[this._head]!;
    this._items[this._head] = undefined;
    this._head++;

    if (this._head > this.COMPACT_THRESHOLD) {
      this._compact();
    }

    return task;
  }

  public peek(): Task | null {
    if (this.isEmpty()) return null;
    return this._items[this._head] ?? null;
  }

  public get size(): number {
    return this._tail - this._head;
  }

  public isEmpty(): boolean {
    return this._head >= this._tail;
  }

  public toArray(): Task[] {
    return this._items
      .slice(this._head, this._tail)
      .filter((item): item is Task => item !== undefined);
  }

  public remove(taskId: string): Task | null {
    for (let i = this._head; i < this._tail; i++) {
      if (this._items[i]?.id === taskId) {
        const task = this._items[i]!;
        this._items[i] = undefined;
        return task;
      }
    }
    return null;
  }

  private _compact(): void {
    this._items = this._items.slice(this._head, this._tail);
    this._tail = this._items.length;
    this._head = 0;
  }
}
