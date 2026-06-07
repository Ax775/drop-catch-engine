import { useCallback, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { ApiError, type IngestResult } from '../types';
import { ingestDomains } from '../api/client';
import { MAX_DOMAINS, parseDomainInput, toIngestPayload } from '../lib/parseDomains';
import { Alert, Button, Modal, Textarea } from './ui';

interface IngestModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful ingest so the caller can refetch data. */
  onIngested: (result: IngestResult) => void;
}

const PLACEHOLDER = `example.com
legal-advice.nl, 340
crypto-insights.io, 430, 2026-12-31`;

/**
 * Modal form for ingesting domains directly from the UI — replaces the manual
 * curl call. Parses pasted lines, validates client-side, submits the batch, and
 * surfaces the accepted / queued / duplicate counts. Parsing lives in
 * ../lib/parseDomains (pure + unit-tested).
 */
export default function IngestModal({ open, onClose, onIngested }: IngestModalProps) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle');
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseDomainInput(text), [text]);
  const validLines = useMemo(() => parsed.filter((p) => p.valid), [parsed]);
  const invalidCount = parsed.length - validLines.length;
  const overLimit = validLines.length > MAX_DOMAINS;

  const reset = useCallback(() => {
    setText('');
    setError(null);
    setStatus('idle');
  }, []);

  const handleClose = useCallback(() => {
    if (status === 'submitting') return;
    reset();
    onClose();
  }, [status, reset, onClose]);

  const submit = useCallback(async () => {
    if (validLines.length === 0 || overLimit) return;
    setStatus('submitting');
    setError(null);

    try {
      const res = await ingestDomains(toIngestPayload(validLines));
      setText('');
      onIngested(res); // App shows a toast and closes the modal.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ingest failed. Please try again.');
    } finally {
      setStatus('idle');
    }
  }, [validLines, overLimit, onIngested]);

  const submitLabel =
    validLines.length > 0
      ? `Ingest ${validLines.length} domain${validLines.length === 1 ? '' : 's'}`
      : 'Ingest domains';

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add domains"
      description="Paste one domain per line. Optionally add a cost and expiry: domain, cost, expiry."
      size="lg"
      disableBackdropClose={status === 'submitting'}
      disableEscapeClose={status === 'submitting'}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={status === 'submitting'}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            isLoading={status === 'submitting'}
            loadingText="Ingesting…"
            disabled={validLines.length === 0 || overLimit}
            leftIcon={<Sparkles className="h-4 w-4" />}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Textarea
          label="Domains"
          hideLabel
          rows={8}
          placeholder={PLACEHOLDER}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="font-mono text-xs"
          aria-label="Domains to ingest, one per line"
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-content-muted">
          <span>
            <span className="font-medium text-content">{validLines.length}</span> valid
          </span>
          {invalidCount > 0 && (
            <span className="text-negative">{invalidCount} invalid (skipped)</span>
          )}
          <span className="text-content-subtle">Max {MAX_DOMAINS} per batch</span>
        </div>

        {overLimit && (
          <Alert variant="warning">
            Too many domains — remove {validLines.length - MAX_DOMAINS} to stay within the{' '}
            {MAX_DOMAINS}-per-batch limit.
          </Alert>
        )}

        {error && (
          <Alert variant="error" title="Ingest failed">
            {error}
          </Alert>
        )}
      </div>
    </Modal>
  );
}
