/**
 * Error thrown by SEO providers to signal a retryable upstream failure. The
 * retry/backoff wrapper in seo-api.ts inspects `statusCode` and `retryAfterMs`.
 */
export class SeoApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'SeoApiError';
  }
}
