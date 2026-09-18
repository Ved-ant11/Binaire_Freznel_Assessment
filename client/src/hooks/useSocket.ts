import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { type ITask, type IQueueStats, type IProgressUpdate, type ITaskCompletion, SocketEvents } from '@binaire/shared';

// Use standard API proxy or direct to server depending on env
const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

interface UseSocketReturn {
  connected: boolean;
  tasks: ITask[];
  stats: IQueueStats | null;
  registerClient: (clientId: string, clientName: string) => void;
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [stats, setStats] = useState<IQueueStats | null>(null);

  useEffect(() => {
    const s = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    s.on('connect', () => {
      setConnected(true);
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    s.on(SocketEvents.QUEUE_STATUS, (allTasks: ITask[]) => {
      setTasks(allTasks);
    });

    s.on(SocketEvents.QUEUE_STATS, (newStats: IQueueStats) => {
      setStats(newStats);
    });

    s.on(SocketEvents.TASK_STATUS_UPDATE, (updatedTask: ITask) => {
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.id === updatedTask.id);
        if (idx === -1) return [...prev, updatedTask];
        const next = [...prev];
        next[idx] = updatedTask;
        return next;
      });
    });

    s.on(SocketEvents.TASK_PROGRESS_UPDATE, (data: IProgressUpdate) => {
      setTasks((prev) => prev.map((t) => 
        t.id === data.taskId 
          ? { ...t, progress: data.progress, processId: data.processId } 
          : t
      ));
    });

    s.on(SocketEvents.TASK_COMPLETED, (data: ITaskCompletion) => {
      setTasks((prev) => prev.map((t) => 
        t.id === data.taskId 
          ? { ...t, result: data.result, completedAt: data.completedAt } 
          : t
      ));
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const registerClient = useCallback((clientId: string, clientName: string) => {
    if (socket && connected) {
      socket.emit(SocketEvents.CLIENT_REGISTER, { clientId, clientName });
    }
  }, [socket, connected]);

  return { connected, tasks, stats, registerClient };
}
