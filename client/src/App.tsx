import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Layout } from './components/Layout';
import { QueueMetrics } from './components/QueueMetrics';
import { FileUpload } from './components/FileUpload';
import { TaskCard } from './components/TaskCard';
import { useSocket } from './hooks/useSocket';

export default function App() {
  const [clientId] = useState(() => {
    const saved = localStorage.getItem('binaire_client_id');
    if (saved) return saved;
    const id = uuidv4();
    localStorage.setItem('binaire_client_id', id);
    return id;
  });

  const [clientName, setClientName] = useState(() => localStorage.getItem('binaire_client_name') || '');
  const [isRegistered, setIsRegistered] = useState(!!localStorage.getItem('binaire_client_name'));
  const [nameInput, setNameInput] = useState('');

  const { connected, tasks, stats, registerClient } = useSocket();

  useEffect(() => {
    if (isRegistered && connected) {
      registerClient(clientId, clientName);
    }
  }, [isRegistered, connected, clientId, clientName, registerClient]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    setClientName(name);
    localStorage.setItem('binaire_client_name', name);
    setIsRegistered(true);
  };

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="w-10 h-10 rounded-lg bg-accent mx-auto mb-4 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <h1 className="text-xl font-semibold text-text-primary mb-1">Binaire Freznel</h1>
            <p className="text-sm text-text-muted">Enter a name to join the queue</p>
          </div>

          <form onSubmit={handleRegister}>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              autoFocus
              maxLength={20}
              className="w-full bg-bg-raised border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent transition-colors mb-3"
            />
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="w-full py-2.5 text-sm font-medium rounded-lg bg-accent text-bg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  const sorted = [...tasks].sort((a, b) => {
    const doneA = a.status === 'COMPLETED' || a.status === 'FAILED';
    const doneB = b.status === 'COMPLETED' || b.status === 'FAILED';

    if (doneA !== doneB) return doneA ? 1 : -1;

    if (doneA && doneB) {
      return new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime();
    }

    if (a.priority !== b.priority) return a.priority === 'HIGH' ? -1 : 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <Layout connected={connected}>
      <QueueMetrics stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <FileUpload clientId={clientId} clientName={clientName} />

          <div className="bg-bg-raised border border-border rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-dim text-accent flex items-center justify-center text-xs font-semibold uppercase">
                {clientName.slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{clientName}</p>
                <p className="text-[11px] text-text-muted font-mono">{clientId.slice(0, 8)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Queue</h2>
            <span className="text-xs text-text-muted font-mono tabular-nums">{tasks.length} tasks</span>
          </div>

          <div className="space-y-3">
            {sorted.length === 0 ? (
              <div className="border border-border border-dashed rounded-lg py-16 flex flex-col items-center justify-center text-center">
                <p className="text-sm text-text-secondary mb-1">No tasks yet</p>
                <p className="text-xs text-text-muted">Upload a CSV to start processing</p>
              </div>
            ) : (
              sorted.map(task => (
                <TaskCard key={task.id} task={task} isOwn={task.clientId === clientId} />
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
