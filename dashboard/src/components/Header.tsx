import { Crosshair } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-ink shadow-sm">
            <Crosshair className="h-[18px] w-[18px]" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight text-content">
              Drop Catch Engine
            </h1>
            <p className="text-xs text-content-subtle">Backlink Arbitrage Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-positive" aria-hidden="true" />
          <span className="text-xs font-medium text-content-muted">Live</span>
        </div>
      </div>
    </header>
  );
}
