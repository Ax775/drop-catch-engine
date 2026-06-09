import {
  ApiError,
  type DomainFilters,
  type DomainRow,
  type DomainsResponse,
  type DomainStats,
  type IngestPayload,
  type IngestResult,
  type LogsResponse,
} from '../types';

export const API_BASE: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8787';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      // Send the Cloudflare Access session cookie on cross-origin API calls
      // (dashboard on pages.dev → worker on workers.dev) once Access is enabled.
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? `Network error: ${err.message}` : 'Network error',
      0,
    );
  }

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  return body as T;
}

function buildQuery(filters?: DomainFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.minDa !== undefined) params.set('minDa', String(filters.minDa));
  if (filters.maxDa !== undefined) params.set('maxDa', String(filters.maxDa));
  if (filters.search) params.set('search', filters.search);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortDir) params.set('sortDir', filters.sortDir);
  if (filters.page !== undefined) params.set('page', String(filters.page));
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function getDomains(filters?: DomainFilters): Promise<DomainsResponse> {
  return request<DomainsResponse>(`/api/domains${buildQuery(filters)}`);
}

export function getDomain(id: string): Promise<DomainRow> {
  return request<DomainRow>(`/api/domains/${encodeURIComponent(id)}`);
}

/** Server-computed portfolio totals (authoritative SUM over all rows). */
export function getDomainStats(): Promise<DomainStats> {
  return request<DomainStats>('/api/domains/stats');
}

export function updateDomainStatus(id: string, status: string): Promise<DomainRow> {
  return request<DomainRow>(`/api/domains/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function ingestDomains(domains: IngestPayload[]): Promise<IngestResult> {
  return request<IngestResult>('/api/ingest', {
    method: 'POST',
    body: JSON.stringify({ domains }),
  });
}

export interface LogQueryParams {
  status?: string;
  page?: number;
  limit?: number;
}

export function getLogs(params?: LogQueryParams): Promise<LogsResponse> {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.page !== undefined) search.set('page', String(params.page));
  if (params?.limit !== undefined) search.set('limit', String(params.limit));
  const qs = search.toString();
  return request<LogsResponse>(`/api/logs${qs ? `?${qs}` : ''}`);
}

/** Absolute URL to a domain's generated blueprint asset page. */
export function blueprintUrl(id: string): string {
  return `${API_BASE}/api/blueprint/${encodeURIComponent(id)}`;
}

/**
 * Create a Stripe Checkout Session for unlocking a domain's blueprint.
 * Returns the hosted Checkout URL the caller should redirect the browser to.
 */
export function createCheckoutSession(domainId: string): Promise<{ url: string }> {
  return request<{ url: string }>('/api/checkout', {
    method: 'POST',
    body: JSON.stringify({ domain_id: domainId }),
  });
}
