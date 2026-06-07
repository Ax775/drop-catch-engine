import { useCallback, useEffect, useRef, useState } from 'react';
import { getDomains } from '../api/client';
import { ApiError, type DomainFilters, type DomainRow } from '../types';

const POLL_INTERVAL_MS = 30_000;

export interface UseDomainsResult {
  data: DomainRow[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetch domains for the given filters; refetches when filters change and polls
 * every 30 seconds. Polling does not toggle the loading spinner so the table
 * doesn't flicker on background refreshes.
 */
export function useDomains(filters: DomainFilters): UseDomainsResult {
  const [data, setData] = useState<DomainRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep latest filters available to the polling callback without resetting it.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const load = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setIsLoading(true);
    try {
      const res = await getDomains(filtersRef.current);
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setError(null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load domains';
      setError(msg);
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }, []);

  // Refetch whenever any filter value changes.
  useEffect(() => {
    void load(true);
  }, [
    load,
    filters.status,
    filters.minDa,
    filters.maxDa,
    filters.search,
    filters.sortBy,
    filters.sortDir,
    filters.page,
    filters.limit,
  ]);

  // Background polling.
  useEffect(() => {
    const id = window.setInterval(() => {
      void load(false);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const refetch = useCallback(() => {
    void load(true);
  }, [load]);

  return { data, total, totalPages, isLoading, error, refetch };
}
