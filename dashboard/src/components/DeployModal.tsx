import { useCallback, useState } from 'react';
import { Check, Copy, CreditCard } from 'lucide-react';
import type { DomainRow } from '../types';
import { ApiError } from '../types';
import { blueprintUrl, createCheckoutSession } from '../api/client';
import { Button, Modal, cn } from './ui';
import StatusBadge from './StatusBadge';

interface DeployModalProps {
  domain: DomainRow;
  onClose: () => void;
  /** Kept for API symmetry — the deploy now completes server-side via the
   *  Stripe webhook after the user returns from Checkout (handled in App). */
  onDeployed?: (updated: DomainRow) => void;
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
 * Blueprint unlock dialog. Built on the accessible Modal primitive (focus
 * trap, scroll lock, focus restore, Esc/backdrop close come for free).
 * The primary action starts a Stripe Checkout Session and redirects the
 * browser to Stripe's hosted page; the actual deploy is finalised server-side
 * by the webhook once payment succeeds.
 */
export default function DeployModal({ domain, onClose }: DeployModalProps) {
  const [status, setStatus] = useState<'idle' | 'redirecting'>('idle');
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

  const startCheckout = useCallback(async () => {
    setStatus('redirecting');
    setError(null);
    try {
      const { url } = await createCheckoutSession(domain.id);
      // Hand off to Stripe's hosted Checkout. We do NOT clear the loading state
      // on success — the page is navigating away.
      window.location.href = url;
    } catch (err) {
      setStatus('idle');
      setError(err instanceof ApiError ? err.message : 'Could not start checkout');
    }
  }, [domain.id]);

  return (
    <Modal
      open
      onClose={onClose}
      title="Unlock blueprint"
      // Prevent accidental dismissal while the session is being created.
      disableBackdropClose={status === 'redirecting'}
      disableEscapeClose={status === 'redirecting'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={status === 'redirecting'}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={startCheckout}
            isLoading={status === 'redirecting'}
            loadingText="Redirecting…"
            disabled={status !== 'idle'}
            leftIcon={<CreditCard className="h-4 w-4" />}
          >
            Unlock Blueprint — €29
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
          A one-time €29 payment unlocks the full intelligence report and
          registers this domain as an active asset.
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
