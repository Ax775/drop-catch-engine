import type { DomainStatus } from '../types';
import { Badge, type BadgeVariant } from './ui';

/**
 * Domain-specific status pill. A thin wrapper that maps the domain lifecycle
 * status onto the generic Badge primitive, so styling stays consistent with the
 * rest of the UI kit.
 */
const STATUS_MAP: Record<DomainStatus, { variant: BadgeVariant; label: string }> = {
  scanned: { variant: 'neutral', label: 'Scanned' },
  high_value: { variant: 'info', label: 'High Value' }, // violet accent
  deployed: { variant: 'success', label: 'Deployed' }, // active / live
  archived: { variant: 'muted', label: 'Archived' },
};

export default function StatusBadge({ status }: { status: DomainStatus }) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.scanned;
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}
