/**
 * Typed wrappers around a Cloudflare KV namespace.
 */

export async function cacheGet<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const raw = await kv.get(key, 'text');
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt entry — treat as a miss and let it expire/overwrite.
    return null;
  }
}

export async function cacheSet<T>(
  kv: KVNamespace,
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  // KV requires expirationTtl >= 60 seconds.
  const ttl = Math.max(60, Math.floor(ttlSeconds));
  await kv.put(key, JSON.stringify(value), { expirationTtl: ttl });
}

export async function cacheDelete(kv: KVNamespace, key: string): Promise<void> {
  await kv.delete(key);
}

export function seoMetricsCacheKey(domainName: string): string {
  return `seo:${domainName.toLowerCase()}`;
}
