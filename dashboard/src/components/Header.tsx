import RelativeTime from './RelativeTime';

interface HeaderProps {
  /** Timestamp of the most recent successful data fetch, for "Last refreshed". */
  lastUpdated: number | null;
}

export default function Header({ lastUpdated }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-end justify-between px-6 py-3">
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight text-content">
            Drop Catch Engine
          </h1>
          <p className="text-xs text-content-subtle">Backlink Arbitrage Intelligence</p>
        </div>

        <p className="text-xs text-content-subtle">
          {lastUpdated !== null ? (
            <>
              Last refreshed: <RelativeTime value={lastUpdated} className="text-content-muted" />
            </>
          ) : (
            'Loading…'
          )}
        </p>
      </div>
    </header>
  );
}
