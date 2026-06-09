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
import { formatEur } from '../lib/format';
import { roiPercent } from '../lib/value';
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
  onBulkArchive: () => void;
  bulkBusy: boolean;
}

const CHECKBOX_CLASS =
  'h-4 w-4 cursor-pointer rounded border-line bg-surface-raised accent-accent ' +
  'outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

/** Shared focus-ring treatment for the icon-only row actions. */
const ICON_ACTION_CLASS =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-content-muted ' +
  'outline-none transition-colors hover:bg-surface-hover hover:text-content ' +
  'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ' +
  'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-content-muted';

interface Column {
  label: string;
  sortKey?: SortBy;
  align?: 'left' | 'right';
}

const COLUMNS: Column[] = [
  { label: 'Domain' },
  { label: 'TLD' },
  { label: 'DA', sortKey: 'da_score' },
  { label: 'Backlinks', sortKey: 'backlink_count', align: 'right' },
  { label: 'Est. Value', sortKey: 'estimated_value_eur', align: 'right' },
  { label: 'ROI %', align: 'right' },
  { label: 'Status' },
  { label: 'Actions', align: 'right' },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'All statuses' },
  { value: 'scanned', label: 'Scanned' },
  { value: 'high_value', label: 'High Value' },
  { value: 'deployed', label: 'Deployed' },
  { value: 'archived', label: 'Archived' },
];

/** ROI as a signed percentage, or null when it can't be computed. */
function roiValue(estimated: number | null, cost: number | null): number | null {
  if (estimated === null || cost === null) return null;
  return roiPercent(estimated, cost);
}

function SortableHeader({
  column,
  filters,
  onFiltersChange,
}: {
  column: Column;
  filters: DomainFilters;
  onFiltersChange: (next: Partial<DomainFilters>) => void;
}) {
  const alignClass = column.align === 'right' ? 'text-right' : 'text-left';

  if (!column.sortKey) {
    return (
      <th className={cn('px-4 py-3 text-xs font-medium text-content-subtle', alignClass)}>
        {column.label}
      </th>
    );
  }

  const isActive = filters.sortBy === column.sortKey;
  const toggle = () => {
    if (isActive) {
      onFiltersChange({ sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc', page: 1 });
    } else {
      onFiltersChange({ sortBy: column.sortKey, sortDir: 'desc', page: 1 });
    }
  };

  return (
    <th
      className={cn('px-4 py-3 text-xs font-medium text-content-subtle', alignClass)}
      aria-sort={isActive ? (filters.sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'inline-flex items-center gap-1 rounded outline-none transition-colors',
          'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
          column.align === 'right' && 'flex-row-reverse',
          isActive ? 'text-content' : 'hover:text-content',
        )}
      >
        {column.label}
        {isActive ? (
          filters.sortDir === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          )
        ) : (
          <span className="text-content-subtle/40" aria-hidden="true">
            ↕
          </span>
        )}
      </button>
    </th>
  );
}

/** DA score: number plus a thin 0–100 progress bar beneath it. */
function DaScore({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="w-14">
      <span className="nums text-content">{score}</span>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
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
  onBulkArchive,
  bulkBusy,
}: DomainTableProps) {
  const page = filters.page ?? 1;
  // total columns including the leading checkbox column
  const colCount = COLUMNS.length + 1;
  const hasFilters =
    Boolean(filters.search) || Boolean(filters.status) || filters.minDa !== undefined;

  const pageIds = useMemo(() => domains.map((d) => d.id), [domains]);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someSelected = pageIds.some((id) => selectedIds.has(id));
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  return (
    <Card>
      {/* Filter bar — single row: search left, status middle, min DA right */}
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
          <span className="font-medium text-content">{selectedIds.size} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onBulkArchive}
              isLoading={bulkBusy}
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
              {COLUMNS.map((col) => (
                <SortableHeader
                  key={col.label}
                  column={col}
                  filters={filters}
                  onFiltersChange={onFiltersChange}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-line/60">
                  <td className="px-4 py-4">
                    <Skeleton className="h-4 w-4" />
                  </td>
                  {COLUMNS.map((col) => (
                    <td key={col.label} className="px-4 py-4">
                      <Skeleton
                        className={cn(
                          'h-4',
                          col.label === 'Domain' ? 'w-40' : col.label === 'Actions' ? 'w-24' : 'w-12',
                          col.align === 'right' && 'ml-auto',
                        )}
                      />
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
                    title={hasFilters ? 'No matching domains' : 'No domains tracked yet'}
                    description={
                      hasFilters
                        ? 'No domains match the current filters. Try clearing search, status, or min DA.'
                        : 'Use the form above to add your first domain.'
                    }
                  />
                </td>
              </tr>
            )}

            {!isLoading &&
              !error &&
              domains.map((d) => {
                const roi = roiValue(d.estimated_value_eur, d.acquisition_cost_eur);
                return (
                  <tr
                    key={d.id}
                    className={cn(
                      'border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.02]',
                      selectedIds.has(d.id) && 'bg-accent-soft/40',
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
                    <td className="px-4 py-3 font-medium text-content">{d.domain_name}</td>
                    <td className="nums px-4 py-3 text-content-muted">{d.tld ?? '—'}</td>
                    <td className="px-4 py-3">
                      <DaScore score={d.da_score} />
                    </td>
                    <td className="nums px-4 py-3 text-right text-content">
                      {d.backlink_count.toLocaleString('en-IE')}
                    </td>
                    <td className="nums px-4 py-3 text-right font-medium text-content">
                      {formatEur(d.estimated_value_eur)}
                    </td>
                    <td className="nums px-4 py-3 text-right">
                      {roi === null ? (
                        <span className="text-content-subtle">—</span>
                      ) : (
                        <span className={roi >= 0 ? 'text-positive' : 'text-negative'}>
                          {roi >= 0 ? '+' : ''}
                          {roi.toFixed(0)}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={blueprintUrl(d.id)}
                          target="_blank"
                          rel="noreferrer"
                          className={ICON_ACTION_CLASS}
                          title="Open blueprint"
                          aria-label={`Open blueprint for ${d.domain_name}`}
                        >
                          <FileCode className="h-4 w-4" aria-hidden="true" />
                        </a>
                        <button
                          type="button"
                          onClick={() => onDeploy(d)}
                          disabled={d.status === 'deployed'}
                          className={ICON_ACTION_CLASS}
                          title={d.status === 'deployed' ? 'Already deployed' : 'Deploy'}
                          aria-label={`Deploy ${d.domain_name}`}
                        >
                          <Rocket className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onArchive(d)}
                          disabled={d.status === 'archived'}
                          className={ICON_ACTION_CLASS}
                          title={d.status === 'archived' ? 'Already archived' : 'Archive'}
                          aria-label={`Archive ${d.domain_name}`}
                        >
                          <Archive className="h-4 w-4" aria-hidden="true" />
                        </button>
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
