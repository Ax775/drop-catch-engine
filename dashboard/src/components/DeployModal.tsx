import { useCallback, useState } from 'react';
import { Check, Copy, Rocket } from 'lucide-react';
import type { DomainRow } from '../types';
import { ApiError } from '../types';
import { blueprintUrl, updateDomainStatus } from '../api/client';
import { Alert, Button, Modal } from './ui';
import StatusBadge from './StatusBadge';

interface DeployModalProps {
  domain: DomainRow;
  onClose: () => void;
  onDeployed: (updated: DomainRow) => void;
}

function formatEur(value: number | null): string {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Deploy confirmation dialog. Built on the accessible Modal primitive (focus
 * trap, scroll lock, focus restore, Esc/backdrop close come for free).
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
      title="Deploy Asset"
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
            leftIcon={status === 'success' ? <Check className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
          >
            {status === 'success' ? 'Deployed' : 'Confirm Deploy'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-base font-semibold text-content">{domain.domain_name}</p>
          <div className="mt-2">
            <StatusBadge status={domain.status} />
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-line bg-surface-raised p-3">
            <dt className="text-xs text-content-subtle">DA</dt>
            <dd className="nums mt-0.5 font-semibold text-content">{domain.da_score}</dd>
          </div>
          <div className="rounded-lg border border-line bg-surface-raised p-3">
            <dt className="text-xs text-content-subtle">Backlinks</dt>
            <dd className="nums mt-0.5 font-semibold text-content">
              {domain.backlink_count.toLocaleString()}
            </dd>
          </div>
          <div className="rounded-lg border border-line bg-surface-raised p-3">
            <dt className="text-xs text-content-subtle">Est. Value</dt>
            <dd className="nums mt-0.5 font-semibold text-content">
              {formatEur(domain.estimated_value_eur)}
            </dd>
          </div>
        </dl>

        <Alert variant="warning">Deploying will register this domain as an active asset.</Alert>

        <Button
          variant="outline"
          fullWidth
          onClick={copyUrl}
          leftIcon={copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        >
          {copied ? 'Copied!' : 'Copy Blueprint URL'}
        </Button>

        {error && (
          <p role="alert" className="text-sm text-negative">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
