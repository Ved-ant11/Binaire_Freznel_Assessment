import { type ReactNode } from 'react';

export function Layout({ children, connected }: { children: ReactNode; connected: boolean }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border h-14 flex items-center px-6 shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <span className="font-semibold text-sm tracking-tight text-text-primary">Binaire Freznel</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${connected ? 'bg-green' : 'bg-red'}`} />
          {connected ? 'Connected' : 'Disconnected'}
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  );
}
