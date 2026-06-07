import { useEffect, useMemo, useRef } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Archive,
  FileCode,
  Rocket,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import type { DomainFilters, DomainRow, SortBy } from '../types';
import { blueprintUrl } from '../api/client';
import StatusBadge from './StatusBadge';
import { Button, Card, cn, EmptyState, Input, Select, Skeleton, type SelectOption } from './ui';

interface DomainTableProps {
  domains: DomainRow[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  filters: DomainFilters;
  onFiltersChange: (next: Partial<DomainFilters>) => void;
  onDeploy: (domain: DomainRow) => void;
  onArchive: (domain: DomainRow) => void;
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: (ids: string[], checked: boolean) => void;
  onClearSelection: () => void;
  onBulkDeploy: () => void;
  onBulkArchive: () => void;
  bulkBusy: boolean;
}

const CHECKBOX_CLASS =
  'h-4 w-4 cursor-pointer rounded border-line bg-surface-raised accent-accent';

const SORTABLE: Record<string, SortBy> = {
  'DA Score': 'da_score',
  Backlinks: 'backlink_count',
  'Est. Value (€)': 'estimated_value_eur',
  Created: 'created_at',
};

const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'All statuses' },
  { value: 'scanned', label: 'Scanned' },
  { value: 'high_value', label: 'High Value' },
  { value: 'deployed', label: 'Deployed' },
  { value: 'archived', label: 'Archived' },
];

function formatEur(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function roiPercent(estimated: number | null, cost: number | null): string {
  if (estimated === null || cost === null || cost === 0) return 'N/A';
  return `${(((estimated - cost) / cost) * 100).toFixed(1)}%`;
}

function formatDate(iso: string): string {
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IE', { year: 'numeric', month: 'short', day: 'numeric' });
}

function SortHeader({
  label,
  filters,
  onFiltersChange,
}: {
  label: string;
  filters: DomainFilters;
  onFiltersChange: (next: Partial<DomainFilters>) => void;
}) {
  const sortKey = SORTABLE[label];
  const isActive = sortKey !== undefined && filters.sortBy === sortKey;

  if (!sortKey) {
    return <th className="px-4 py-3 text-left text-xs font-medium text-content-subtle">{label}</th>;
  }

  const toggle = () => {
    if (isActive) {
      onFiltersChange({ sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc', page: 1 });
    } else {
      onFiltersChange({ sortBy: sortKey, sortDir: 'desc', page: 1 });
    }
  };

  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-content-subtle"
      aria-sort={isActive ? (filters.sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'inline-flex items-center gap-1 rounded outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent',
          isActive ? 'text-content' : 'hover:text-content',
        )}
      >
        {label}
        {isActive ? (
          filters.sortDir === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          )
        ) : (
          <span className="text-content-subtle/50" aria-hidden="true">
            ↕
          </span>
        )}
      </button>
    </th>
  );
}

export default function DomainTable({
  domains,
  total,
  totalPages,
  isLoading,
  error,
  filters,
  onFiltersChange,
  onDeploy,
  onArchive,
  selectedIds,
  onToggleRow,
  onToggleAll,
  onClearSelection,
  onBulkDeploy,
  onBulkArchive,
  bulkBusy,
}: DomainTableProps) {
  const page = filters.page ?? 1;
  const headers = useMemo(
    () => [
      'Domain Name',
      'TLD',
      'DA Score',
      'Backlinks',
      'Status',
      'Est. Value (€)',
      'Acquisition Cost (€)',
      'ROI %',
      'Created',
      'Actions',
    ],
    [],
  );
  // total columns including the leading checkbox column
  const colCount = headers.length + 1;

  const pageIds = useMemo(() => domains.map((d) => d.id), [domains]);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someSelected = pageIds.some((id) => selectedIds.has(id));
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  return (
    <Card>
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
        <div className="min-w-[200px] flex-1">
          <Input
            label="Search domains"
            hideLabel
            type="search"
            placeholder="Search domains…"
            leftIcon={<Search className="h-4 w-4" />}
            value={filters.search ?? ''}
            onChange={(e) => onFiltersChange({ search: e.target.value || undefined, page: 1 })}
          />
        </div>

        <div className="w-44">
          <Select
            label="Filter by status"
            hideLabel
            options={STATUS_OPTIONS}
            value={filters.status ?? ''}
            onChange={(e) =>
              onFiltersChange({
                status: (e.target.value || undefined) as DomainFilters['status'],
                page: 1,
              })
            }
          />
        </div>

        <div className="w-28">
          <Input
            label="Min DA"
            hideLabel
            type="number"
            min={0}
            max={100}
            placeholder="Min DA"
            value={filters.minDa ?? ''}
            onChange={(e) =>
              onFiltersChange({
                minDa: e.target.value === '' ? undefined : Number(e.target.value),
                page: 1,
              })
            }
          />
        </div>
      </div>

      {/* Selection / bulk-action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 border-b border-line bg-surface-raised px-4 py-2.5 text-sm">
          <span className="font-medium text-content">
            {selectedIds.size} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={onBulkDeploy}
              isLoading={bulkBusy}
              leftIcon={<Rocket className="h-3.5 w-3.5" />}
            >
              Deploy
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onBulkArchive}
              disabled={bulkBusy}
              leftIcon={<Archive className="h-3.5 w-3.5" />}
            >
              Archive
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearSelection}
              disabled={bulkBusy}
              leftIcon={<X className="h-3.5 w-3.5" />}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="w-10 px-4 py-3">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className={CHECKBOX_CLASS}
                  checked={allSelected}
                  onChange={(e) => onToggleAll(pageIds, e.target.checked)}
                  aria-label="Select all domains on this page"
                  disabled={domains.length === 0}
                />
              </th>
              {headers.map((h) => (
                <SortHeader
                  key={h}
                  label={h}
                  filters={filters}
                  onFiltersChange={onFiltersChange}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-line/60">
                  <td className="px-4 py-4">
                    <Skeleton className="h-4 w-4" />
                  </td>
                  {headers.map((h) => (
                    <td key={h} className="px-4 py-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading && error && (
              <tr>
                <td colSpan={colCount} className="px-4 py-12 text-center text-sm text-negative">
                  {error}
                </td>
              </tr>
            )}

            {!isLoading && !error && domains.length === 0 && (
              <tr>
                <td colSpan={colCount}>
                  <EmptyState
                    size="sm"
                    title="No domains found"
                    description="Try adjusting your filters, or ingest new domains to get started."
                  />
                </td>
              </tr>
            )}

            {!isLoading &&
              !error &&
              domains.map((d) => {
                const isHigh = d.status === 'high_value';
                return (
                  <tr
                    key={d.id}
                    className={cn(
                      'border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.02]',
                      isHigh && 'bg-accent-soft/30',
                      selectedIds.has(d.id) && 'bg-accent-soft/50',
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className={CHECKBOX_CLASS}
                        checked={selectedIds.has(d.id)}
                        onChange={() => onToggleRow(d.id)}
                        aria-label={`Select ${d.domain_name}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 font-medium text-content">
                        {isHigh && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                        )}
                        {d.domain_name}
                      </span>
                    </td>
                    <td className="nums px-4 py-3 text-content-muted">{d.tld ?? '—'}</td>
                    <td className="nums px-4 py-3 text-content">{d.da_score}</td>
                    <td className="nums px-4 py-3 text-content">
                      {d.backlink_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="nums px-4 py-3 font-medium text-content">
                      {formatEur(d.estimated_value_eur)}
                    </td>
                    <td className="nums px-4 py-3 text-content-muted">
                      {formatEur(d.acquisition_cost_eur)}
                    </td>
                    <td className="nums px-4 py-3">
                      {(() => {
                        const roi = roiPercent(d.estimated_value_eur, d.acquisition_cost_eur);
                        if (roi === 'N/A') return <span className="text-content-subtle">N/A</span>;
                        const positive = !roi.startsWith('-');
                        return (
                          <span className={positive ? 'text-positive' : 'text-negative'}>{roi}</span>
                        );
                      })()}
                    </td>
                    <td className="nums px-4 py-3 text-content-muted">{formatDate(d.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={blueprintUrl(d.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-medium text-content-muted outline-none transition-colors hover:bg-surface-hover hover:text-content focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                        >
                          <FileCode className="h-3.5 w-3.5" aria-hidden="true" />
                          Blueprint
                        </a>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => onDeploy(d)}
                          disabled={d.status === 'deployed'}
                          leftIcon={<Rocket className="h-3.5 w-3.5" />}
                        >
                          Deploy
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onArchive(d)}
                          disabled={d.status === 'archived'}
                          leftIcon={<Archive className="h-3.5 w-3.5" />}
                        >
                          Archive
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-content-muted">
        <span className="nums">
          {total.toLocaleString()} domain{total === 1 ? '' : 's'} · page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onFiltersChange({ page: Math.max(1, page - 1) })}
            disabled={page <= 1}
            leftIcon={<ChevronLeft className="h-4 w-4" />}
          >
            Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onFiltersChange({ page: Math.min(totalPages, page + 1) })}
            disabled={page >= totalPages}
            rightIcon={<ChevronRight className="h-4 w-4" />}
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
