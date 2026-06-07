import { z } from 'zod';

/**
 * Domain status lifecycle.
 */
export const DomainStatusSchema = z.enum(['scanned', 'high_value', 'deployed', 'archived']);
export type DomainStatus = z.infer<typeof DomainStatusSchema>;

/**
 * A row from the `domains` table. `source_authority_links` is stored as a JSON
 * string in D1 but is exposed to clients as a parsed string array.
 */
export const DomainRowSchema = z.object({
  id: z.string(),
  domain_name: z.string(),
  expiration_date: z.string().nullable(),
  da_score: z.number().int(),
  backlink_count: z.number().int(),
  source_authority_links: z.array(z.string()),
  status: DomainStatusSchema,
  acquisition_cost_eur: z.number().nullable(),
  estimated_value_eur: z.number().nullable(),
  tld: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type DomainRow = z.infer<typeof DomainRowSchema>;

/**
 * Raw shape as returned by D1 (source_authority_links is a JSON string).
 */
export interface DomainRowRaw {
  id: string;
  domain_name: string;
  expiration_date: string | null;
  da_score: number;
  backlink_count: number;
  source_authority_links: string;
  status: DomainStatus;
  acquisition_cost_eur: number | null;
  estimated_value_eur: number | null;
  tld: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Convert a raw D1 row into a typed DomainRow with parsed authority links.
 */
export function parseDomainRow(raw: DomainRowRaw): DomainRow {
  let links: string[] = [];
  try {
    const parsed: unknown = JSON.parse(raw.source_authority_links || '[]');
    if (Array.isArray(parsed)) {
      links = parsed.filter((v): v is string => typeof v === 'string');
    }
  } catch {
    links = [];
  }
  return {
    id: raw.id,
    domain_name: raw.domain_name,
    expiration_date: raw.expiration_date,
    da_score: raw.da_score,
    backlink_count: raw.backlink_count,
    source_authority_links: links,
    status: raw.status,
    acquisition_cost_eur: raw.acquisition_cost_eur,
    estimated_value_eur: raw.estimated_value_eur,
    tld: raw.tld,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

/**
 * POST /api/ingest request body.
 */
export const IngestDomainSchema = z.object({
  domain_name: z
    .string()
    .trim()
    .min(3)
    .max(253)
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i, 'Invalid domain name'),
  expiration_date: z.string().min(1).max(64).optional(),
  acquisition_cost_eur: z.number().nonnegative().optional(),
});
export type IngestDomain = z.infer<typeof IngestDomainSchema>;

export const IngestPayloadSchema = z.object({
  domains: z.array(IngestDomainSchema).min(1).max(100),
});
export type IngestPayload = z.infer<typeof IngestPayloadSchema>;

/**
 * GET /api/domains query parameters.
 */
export const DomainSortBySchema = z.enum([
  'da_score',
  'backlink_count',
  'created_at',
  'estimated_value_eur',
]);
export type DomainSortBy = z.infer<typeof DomainSortBySchema>;

export const DomainFiltersSchema = z.object({
  status: DomainStatusSchema.optional(),
  minDa: z.coerce.number().int().min(0).max(100).optional(),
  maxDa: z.coerce.number().int().min(0).max(100).optional(),
  search: z.string().trim().min(1).max(253).optional(),
  sortBy: DomainSortBySchema.default('created_at'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type DomainFilters = z.infer<typeof DomainFiltersSchema>;

/**
 * PATCH /api/domains/:id body — accepts any lifecycle status. Clients use this
 * to deploy/archive, and to restore (undo) a domain to its previous status.
 */
export const UpdateStatusSchema = z.object({
  status: DomainStatusSchema,
});
export type UpdateStatusPayload = z.infer<typeof UpdateStatusSchema>;

/**
 * SEO metrics returned from the SEO API / cache.
 */
export const SeoMetricsSchema = z.object({
  da_score: z.number().int().min(0).max(100),
  backlink_count: z.number().int().min(0),
  source_authority_links: z.array(z.string()),
});
export type SeoMetrics = z.infer<typeof SeoMetricsSchema>;

/**
 * GET /api/logs query parameters.
 */
export const LogFiltersSchema = z.object({
  status: z.enum(['info', 'success', 'warning', 'error']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type LogFilters = z.infer<typeof LogFiltersSchema>;

/**
 * Structured blueprint metadata used when rendering the static asset page.
 */
export const BlueprintSchema = z.object({
  id: z.string(),
  domain_name: z.string(),
  title: z.string(),
  canonical_url: z.string(),
  description: z.string(),
  authority_links: z.array(z.string()),
  da_score: z.number().int(),
  backlink_count: z.number().int(),
});
export type Blueprint = z.infer<typeof BlueprintSchema>;
