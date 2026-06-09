import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Header from './components/Header';
import DomainTable from './components/DomainTable';
import ROICalculator from './components/ROICalculator';
import DeployModal from './components/DeployModal';
import IngestModal from './components/IngestModal';
import { useDomains } from './hooks/useDomains';
import { getDomainStats, getLogs, updateDomainStatus } from './api/client';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Spinner,
  Tabs,
  useToast,
  type BadgeVariant,
} from './components/ui';
import { ApiError, type DomainFilters, type DomainRow, type SystemLog, type LogStatus } from './types';
import { formatEur } from './lib/format';

type Tab = 'domains' | 'roi' | 'logs';

interface Stats {
  total: number;
  highValue: number;
  deployed: number;
  totalValue: number;
}

const LOG_STATUS_VARIANT: Record<LogStatus, BadgeVariant> = {
  info: 'neutral',
  success: 'success',
  warning: 'warning',
  error: 'danger',
};

/**
 * Compact inline stat summary — a single line of figures, no cards or icons,
 * the way a data tool surfaces totals. Example:
 *   "47 domains · 12 high value · 3 deployed · Total est. €24,380"
 */
function StatsBar({ refreshKey }: { refreshKey: number }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Single authoritative call — totals (incl. estimated value) are summed
        // server-side across the whole portfolio, not over a capped page.
        const s = await getDomainStats();
        if (cancelled) return;
        setStats({
          total: s.total,
          highValue: s.high_value_count,
          deployed: s.deployed_count,
          totalValue: s.total_estimated_value_eur,
        });
      } catch {
        if (!cancelled) setStats(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (!stats) {
    return <p className="text-sm text-content-subtle">Loading totals…</p>;
  }

  return (
    <p className="nums text-sm text-content-muted">
      <span className="font-semibold text-content">{stats.total.toLocaleString()}</span> domains
      <span className="px-1.5 text-content-subtle">·</span>
      <span className="font-semibold text-content">{stats.highValue.toLocaleString()}</span> high value
      <span className="px-1.5 text-content-subtle">·</span>
      <span className="font-semibold text-content">{stats.deployed.toLocaleString()}</span> deployed
      <span className="px-1.5 text-content-subtle">·</span>
      Total est.{' '}
      <span className="font-semibold text-content">{formatEur(stats.totalValue)}</span>
    </p>
  );
}

function LogsView() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await getLogs({ limit: 50 });
        if (!cancelled) {
          setLogs(res.data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load logs');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-xs font-medium text-content-subtle">
              <th className="px-5 py-3 text-left">Event</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Payload</th>
              <th className="px-5 py-3 text-left">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-content-muted">
                  <span className="inline-flex items-center gap-2">
                    <Spinner size="sm" label="Loading logs" />
                    Loading logs…
                  </span>
                </td>
              </tr>
            )}
            {!isLoading && error && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-negative">
                  {error}
                </td>
              </tr>
            )}
            {!isLoading && !error && logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-content-muted">
                  No log entries yet
                </td>
              </tr>
            )}
            {!isLoading &&
              !error &&
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-3 font-medium text-content">{log.event}</td>
                  <td className="px-5 py-3">
                    <Badge variant={LOG_STATUS_VARIANT[log.status]} dot>
                      {log.status}
                    </Badge>
                  </td>
                  <td className="max-w-md truncate px-5 py-3 font-mono text-xs text-content-subtle">
                    {log.payload ?? '—'}
                  </td>
                  <td className="nums whitespace-nowrap px-5 py-3 text-content-muted">
                    {log.timestamp}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('domains');
  const [filters, setFilters] = useState<DomainFilters>({
    sortBy: 'created_at',
    sortDir: 'desc',
    page: 1,
    limit: 20,
  });
  const [selectedDomain, setSelectedDomain] = useState<DomainRow | null>(null);
  const [ingestOpen, setIngestOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<DomainRow | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { toast } = useToast();
  const { data, total, totalPages, isLoading, error, lastUpdated, refetch } = useDomains(filters);

  const onFiltersChange = useCallback((next: Partial<DomainFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  }, []);

  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Archive is destructive-ish, so it goes through a confirmation dialog and
  // offers an Undo that restores the domain to its previous status.
  const confirmArchive = useCallback(async () => {
    if (!archiveTarget) return;
    const target = archiveTarget;
    const previousStatus = target.status;
    setArchiving(true);
    try {
      await updateDomainStatus(target.id, 'archived');
      setArchiveTarget(null);
      refetch();
      bumpRefresh();
      toast({
        title: 'Domain archived',
        description: target.domain_name,
        variant: 'success',
        action: {
          label: 'Undo',
          onClick: () => {
            void (async () => {
              try {
                await updateDomainStatus(target.id, previousStatus);
                toast({
                  title: 'Archive undone',
                  description: target.domain_name,
                  variant: 'info',
                });
                refetch();
                bumpRefresh();
              } catch (err) {
                toast({
                  title: 'Undo failed',
                  description: err instanceof ApiError ? err.message : 'Please try again.',
                  variant: 'error',
                });
              }
            })();
          },
        },
      });
    } catch (err) {
      toast({
        title: 'Archive failed',
        description: err instanceof ApiError ? err.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setArchiving(false);
    }
  }, [archiveTarget, refetch, bumpRefresh, toast]);

  const handleDeployed = useCallback(
    (domain: DomainRow) => {
      toast({ title: 'Domain deployed', description: domain.domain_name, variant: 'success' });
      refetch();
      bumpRefresh();
    },
    [refetch, bumpRefresh, toast],
  );

  // Returning from Stripe Checkout: the success_url carries ?session_id & domain_id.
  // Confirm payment to the user, refresh (the webhook flips status → deployed),
  // and scrub the params so a reload doesn't re-fire the toast.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('session_id') || !params.get('domain_id')) return;

    toast({
      title: 'Payment successful',
      description: 'Blueprint unlocked — the domain will show as deployed shortly.',
      variant: 'success',
    });
    refetch();
    bumpRefresh();

    params.delete('session_id');
    params.delete('domain_id');
    const qs = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    // Run once on mount; the callbacks are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Multi-select bulk actions ----
  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((ids: string[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Archive all selected domains concurrently; returns the count changed.
  // (Deploy is intentionally NOT a bulk action — it requires per-domain payment
  // via Stripe Checkout, enforced server-side. There is no free deploy path.)
  const applyBulkArchive = useCallback(async (): Promise<number> => {
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(
      ids.map((id) => updateDomainStatus(id, 'archived')),
    );
    return results.filter((r) => r.status === 'fulfilled').length;
  }, [selectedIds]);

  const confirmBulkArchive = useCallback(async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    setBulkBusy(true);
    try {
      const ok = await applyBulkArchive();
      setBulkArchiveOpen(false);
      toast({
        title: `Archived ${ok} domain${ok === 1 ? '' : 's'}`,
        variant: ok === count ? 'success' : 'warning',
        description: ok === count ? undefined : `${count - ok} failed`,
      });
      clearSelection();
      refetch();
      bumpRefresh();
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, applyBulkArchive, clearSelection, refetch, bumpRefresh, toast]);

  return (
    <div className="min-h-full bg-canvas">
      <Header lastUpdated={lastUpdated} />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Tabs value={tab} onChange={(id) => setTab(id as Tab)}>
          <Tabs.List aria-label="Dashboard sections" className="mb-6">
            <Tabs.Trigger id="domains">Domains</Tabs.Trigger>
            <Tabs.Trigger id="roi">ROI Calculator</Tabs.Trigger>
            <Tabs.Trigger id="logs">System Logs</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Panel id="domains">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold tracking-tight text-content">Domains</h2>
                <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIngestOpen(true)}>
                  Add domains
                </Button>
              </div>
              <StatsBar refreshKey={refreshKey} />
              <DomainTable
                domains={data}
                total={total}
                totalPages={totalPages}
                isLoading={isLoading}
                error={error}
                filters={filters}
                onFiltersChange={onFiltersChange}
                onDeploy={setSelectedDomain}
                onArchive={setArchiveTarget}
                selectedIds={selectedIds}
                onToggleRow={toggleRow}
                onToggleAll={toggleAll}
                onClearSelection={clearSelection}
                onBulkArchive={() => setBulkArchiveOpen(true)}
                bulkBusy={bulkBusy}
              />
            </div>
          </Tabs.Panel>

          <Tabs.Panel id="roi">
            <ROICalculator />
          </Tabs.Panel>

          <Tabs.Panel id="logs">
            <LogsView />
          </Tabs.Panel>
        </Tabs>
      </main>

      {selectedDomain && (
        <DeployModal
          domain={selectedDomain}
          onClose={() => setSelectedDomain(null)}
          onDeployed={() => {
            const deployed = selectedDomain;
            setSelectedDomain(null);
            if (deployed) handleDeployed(deployed);
          }}
        />
      )}

      <IngestModal
        open={ingestOpen}
        onClose={() => setIngestOpen(false)}
        onIngested={(res) => {
          const anyNew = res.accepted > 0;
          toast({
            title: anyNew
              ? `${res.accepted} domain${res.accepted === 1 ? '' : 's'} queued for scoring`
              : 'No new domains added',
            description: anyNew
              ? res.duplicates > 0
                ? `${res.duplicates} duplicate${res.duplicates === 1 ? '' : 's'} skipped · scores appear shortly`
                : 'Scoring in progress — scores appear shortly'
              : `All ${res.duplicates} already existed`,
            variant: anyNew ? 'success' : 'info',
          });
          setIngestOpen(false);
          refetch();
          bumpRefresh();
        }}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        onClose={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
        title="Archive domain?"
        description={
          archiveTarget
            ? `“${archiveTarget.domain_name}” will be moved to Archived. You can still find it via the status filter.`
            : undefined
        }
        confirmLabel="Archive"
        variant="danger"
        isLoading={archiving}
      />

      <ConfirmDialog
        open={bulkArchiveOpen}
        onClose={() => setBulkArchiveOpen(false)}
        onConfirm={confirmBulkArchive}
        title={`Archive ${selectedIds.size} domain${selectedIds.size === 1 ? '' : 's'}?`}
        description="The selected domains will be moved to Archived. You can still find them via the status filter."
        confirmLabel="Archive all"
        variant="danger"
        isLoading={bulkBusy}
      />
    </div>
  );
}
