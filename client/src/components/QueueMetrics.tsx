import { type IQueueStats } from '@binaire/shared';

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-bg-raised border border-border rounded-lg px-4 py-3">
      <p className="text-text-muted text-xs font-medium mb-1">{label}</p>
      <p className={`text-2xl font-semibold font-mono tabular-nums ${color || 'text-text-primary'}`}>{value}</p>
    </div>
  );
}

export function QueueMetrics({ stats }: { stats: IQueueStats | null }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      <Stat label="High Priority" value={stats.highPriorityCount} color="text-amber" />
      <Stat label="Low Priority" value={stats.lowPriorityCount} />
      <Stat label="Waiting" value={stats.waitingCount} color="text-text-secondary" />
      <Stat label="Processing" value={stats.processingCount} color="text-accent" />
      <Stat label="Completed" value={stats.completedCount} color="text-green" />
    </div>
  );
}
