import { type ITask, TaskStatus, Priority } from '@binaire/shared';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getDuration(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function formatResult(n: number) {
  if (Math.abs(n) >= 1e9) return n.toExponential(4);
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function TaskCard({ task, isOwn }: { task: ITask; isOwn: boolean }) {
  const done = task.status === TaskStatus.COMPLETED;
  const failed = task.status === TaskStatus.FAILED;
  const processing = task.status === TaskStatus.PROCESSING;

  const borderColor = done ? 'border-green/20' : failed ? 'border-red/20' : isOwn ? 'border-accent/30' : 'border-border';

  return (
    <div className={`bg-bg-raised border ${borderColor} rounded-lg overflow-hidden`}>
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-md shrink-0 flex items-center justify-center text-xs font-mono font-medium ${done ? 'bg-green-dim text-green' : failed ? 'bg-red-dim text-red' : 'bg-accent-dim text-accent'}`}>
            {done ? '✓' : failed ? '!' : processing ? '⟳' : '⏳'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{task.fileName}</p>
            <p className="text-xs text-text-muted">
              {task.clientName}{isOwn && <span className="text-accent ml-1">you</span>} · {formatTime(task.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {task.priority === Priority.HIGH && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-dim text-amber">High</span>
          )}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${done ? 'bg-green-dim text-green' : failed ? 'bg-red-dim text-red' : processing ? 'bg-accent-dim text-accent' : 'bg-bg-elevated text-text-muted'}`}>
            {task.status.toLowerCase()}
          </span>
        </div>
      </div>

      {!failed && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
            <span className="font-mono">{task.processId || 'queued'}</span>
            <span className="tabular-nums font-mono">{task.progress}%</span>
          </div>
          <div className="h-1 w-full bg-bg-elevated rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${done ? 'bg-green' : 'bg-accent'}`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
          {done && task.startedAt && task.completedAt && (
            <p className="text-xs text-text-muted mt-2">
              Completed in {getDuration(task.startedAt, task.completedAt)}
            </p>
          )}
        </div>
      )}

      {failed && task.error && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red bg-red-dim px-3 py-2 rounded-md">{task.error}</p>
        </div>
      )}

      {done && task.result !== null && (
        <div className="px-4 py-2.5 border-t border-green/10 bg-green-dim/50 flex items-center justify-between">
          <span className="text-xs font-medium text-green">Result</span>
          <span className="text-sm font-semibold text-green font-mono tabular-nums">
            {formatResult(task.result)}
          </span>
        </div>
      )}
    </div>
  );
}
