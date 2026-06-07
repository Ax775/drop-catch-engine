import { useCallback, useState } from 'react';
import { Check, Copy, Rocket } from 'lucide-react';
import type { DomainRow } from '../types';
import { ApiError } from '../types';
import { blueprintUrl, updateDomainStatus } from '../api/client';
import { Button, Modal, cn } from './ui';
import StatusBadge from './StatusBadge';

interface DeployModalProps {
  domain: DomainRow;
  onClose: () => void;
  onDeployed: (updated: DomainRow) => void;
}

function formatEur(value: number | null): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Deploy confirmation dialog. Built on the accessible Modal primitive (focus
 * trap, scroll lock, focus restore, Esc/backdrop close come for free).
 * Kept compact and businesslike — a summary, one primary action, and a
 * secondary "copy URL" link rather than competing buttons.
 */
export default function DeployModal({ domain, onClose, onDeployed }: DeployModalProps) {
  const [status, setStatus] = useState<'idle' | 'deploying' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(blueprintUrl(domain.id));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard');
    }
  }, [domain.id]);

  const confirmDeploy = useCallback(async () => {
    setStatus('deploying');
    setError(null);
    try {
      const updated = await updateDomainStatus(domain.id, 'deployed');
      setStatus('success');
      onDeployed(updated);
      window.setTimeout(onClose, 900);
    } catch (err) {
      setStatus('idle');
      setError(err instanceof ApiError ? err.message : 'Deploy failed');
    }
  }, [domain.id, onDeployed, onClose]);

  return (
    <Modal
      open
      onClose={onClose}
      title="Deploy asset"
      // Prevent accidental dismissal mid-deploy.
      disableBackdropClose={status === 'deploying'}
      disableEscapeClose={status === 'deploying'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={status === 'deploying'}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={confirmDeploy}
            isLoading={status === 'deploying'}
            loadingText="Deploying…"
            disabled={status !== 'idle'}
            leftIcon={
              status === 'success' ? <Check className="h-4 w-4" /> : <Rocket className="h-4 w-4" />
            }
          >
            {status === 'success' ? 'Deployed' : 'Confirm Deploy'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-base font-semibold text-content">{domain.domain_name}</p>
          <StatusBadge status={domain.status} />
        </div>

        <p className="nums text-sm text-content-muted">
          DA {domain.da_score}
          <span className="px-1.5 text-content-subtle">·</span>
          {domain.backlink_count.toLocaleString('en-IE')} backlinks
          <span className="px-1.5 text-content-subtle">·</span>
          {formatEur(domain.estimated_value_eur)} est.
        </p>

        <p className="text-sm text-content-subtle">
          Deploying registers this domain as an active asset.
        </p>

        <div className="flex items-center justify-between border-t border-line pt-3">
          <button
            type="button"
            onClick={copyUrl}
            className={cn(
              'inline-flex items-center gap-1.5 rounded text-sm text-content-muted',
              'outline-none transition-colors hover:text-content',
              'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
            )}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-positive" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {copied ? 'Copied' : 'Copy blueprint URL'}
          </button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-negative">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
