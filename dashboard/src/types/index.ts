export type DomainStatus = 'scanned' | 'high_value' | 'deployed' | 'archived';

export interface DomainRow {
  id: string;
  domain_name: string;
  expiration_date: string | null;
  da_score: number;
  backlink_count: number;
  source_authority_links: string[];
  status: DomainStatus;
  acquisition_cost_eur: number | null;
  estimated_value_eur: number | null;
  tld: string | null;
  created_at: string;
  updated_at: string;
}

export interface DomainsResponse {
  data: DomainRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type LogStatus = 'info' | 'success' | 'warning' | 'error';

export interface SystemLog {
  id: string;
  event: string;
  status: LogStatus;
  payload: string | null;
  timestamp: string;
}

export interface LogsResponse {
  data: SystemLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IngestPayload {
  domain_name: string;
  expiration_date?: string;
  acquisition_cost_eur?: number;
}

export interface IngestResult {
  accepted: number;
  queued: number;
  duplicates: number;
}

export type SortBy = 'da_score' | 'backlink_count' | 'created_at' | 'estimated_value_eur';
export type SortDir = 'asc' | 'desc';

export interface DomainFilters {
  status?: DomainStatus;
  minDa?: number;
  maxDa?: number;
  search?: string;
  sortBy?: SortBy;
  sortDir?: SortDir;
  page?: number;
  limit?: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
