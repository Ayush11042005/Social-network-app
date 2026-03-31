'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';

interface UseInfiniteScrollOptions {
  fetchFn: (cursor?: string) => Promise<{ data: unknown[]; nextCursor?: string; hasMore: boolean }>;
  enabled?: boolean;
}

export function useInfiniteScroll<T>({ fetchFn, enabled = true }: UseInfiniteScrollOptions) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<string | undefined>(undefined);
  const { ref, inView } = useInView({ threshold: 0 });

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const result = await fetchFn(cursorRef.current);
      setItems((prev) => [...prev, ...(result.data as T[])]);
      cursorRef.current = result.nextCursor;
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Failed to load more:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, isLoading, hasMore]);

  const reset = useCallback(() => {
    setItems([]);
    cursorRef.current = undefined;
    setHasMore(true);
  }, []);

  useEffect(() => {
    if (inView && enabled && hasMore && !isLoading) {
      loadMore();
    }
  }, [inView, enabled, hasMore, isLoading, loadMore]);

  return { items, setItems, isLoading, hasMore, ref, loadMore, reset };
}
