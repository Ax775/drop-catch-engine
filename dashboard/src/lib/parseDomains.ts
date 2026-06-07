import type { IngestPayload } from '../types';

/** Max domains accepted per ingest batch (mirrors the worker limit). */
export const MAX_DOMAINS = 100;

// Mirror the worker's domain validation (loosely) for instant client feedback.
export const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

export interface ParsedLine {
  domain_name: string;
  acquisition_cost_eur?: number;
  expiration_date?: string;
  valid: boolean;
}

/**
 * Parse free-text ingest input into structured lines. Each line is:
 *   domain[, cost][, expiration]
 * Blank lines are ignored; invalid domains are flagged (valid: false) but kept
 * so callers can report how many were skipped.
 */
export function parseDomainInput(raw: string): ParsedLine[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [namePart, costPart, expPart] = line.split(',').map((p) => p.trim());
      const domain_name = (namePart ?? '').toLowerCase();
      const cost = costPart ? Number(costPart) : undefined;
      return {
        domain_name,
        acquisition_cost_eur:
          cost !== undefined && Number.isFinite(cost) && cost >= 0 ? cost : undefined,
        expiration_date: expPart || undefined,
        valid: DOMAIN_RE.test(domain_name),
      };
    });
}

/** Convert valid parsed lines into the API ingest payload shape. */
export function toIngestPayload(lines: ParsedLine[]): IngestPayload[] {
  return lines
    .filter((l) => l.valid)
    .map((l) => ({
      domain_name: l.domain_name,
      ...(l.acquisition_cost_eur !== undefined
        ? { acquisition_cost_eur: l.acquisition_cost_eur }
        : {}),
      ...(l.expiration_date ? { expiration_date: l.expiration_date } : {}),
    }));
}
