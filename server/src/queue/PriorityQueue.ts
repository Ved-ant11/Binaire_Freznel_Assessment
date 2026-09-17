import { Task } from '../models/Task.js';

export class PriorityQueue {
  private items: Task[] = [];
  private head = 0;

  enqueue(task: Task) {
    this.items.push(task);
  }

  dequeue(): Task | null {
    if (this.isEmpty()) return null;

    const task = this.items[this.head];
    this.items[this.head] = undefined!; // let GC reclaim
    this.head++;

    // compact once we've accumulated a lot of dead slots
    if (this.head > 500) {
      this.items = this.items.slice(this.head);
      this.head = 0;
    }

    return task;
  }

  peek(): Task | null {
    return this.isEmpty() ? null : this.items[this.head];
  }

  get size() { return this.items.length - this.head; }

  isEmpty() { return this.head >= this.items.length; }

  toArray(): Task[] {
    return this.items.slice(this.head).filter(Boolean);
  }

  remove(taskId: string): Task | null {
    for (let i = this.head; i < this.items.length; i++) {
      if (this.items[i]?.id === taskId) {
        const t = this.items[i];
        this.items[i] = undefined!;
        return t;
      }
    }
    return null;
  }
}
