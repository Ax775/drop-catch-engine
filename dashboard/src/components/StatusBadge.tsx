import type { DomainStatus } from '../types';
import { cn } from './ui';

/**
 * Domain lifecycle status pill. Four semantic states, each with a distinct,
 * low-contrast tint so an analyst can scan status at a glance:
 *   Scanned (grey) · High Value (emerald) · Deployed (blue) · Archived (dimmed)
 *
 * Status colour is functional, not decorative — these are the only colours in
 * the table besides the violet primary accent and the red/green ROI signal.
 */
const STATUS_MAP: Record<DomainStatus, { className: string; dot: string; label: string }> = {
  scanned: {
    className: 'bg-white/[0.06] text-content-muted',
    dot: 'bg-content-muted',
    label: 'Scanned',
  },
  high_value: {
    className: 'bg-emerald-500/15 text-emerald-400',
    dot: 'bg-emerald-400',
    label: 'High Value',
  },
  deployed: {
    className: 'bg-blue-500/15 text-blue-400',
    dot: 'bg-blue-400',
    label: 'Deployed',
  },
  archived: {
    className: 'bg-white/[0.04] text-content-subtle',
    dot: 'bg-content-subtle',
    label: 'Archived',
  },
};

export default function StatusBadge({ status }: { status: DomainStatus }) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.scanned;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} aria-hidden="true" />
      {config.label}
    </span>
  );
}
