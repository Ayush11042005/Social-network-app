'use client';

import { useCallback, useEffect, useState } from 'react';
import { PostCard } from '@/components/feed/PostCard';
import { CreatePost } from '@/components/feed/CreatePost';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import type { Post } from '@/types';
import Link from 'next/link';

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState('0');
  const [hasMore, setHasMore] = useState(true);

  const loadPosts = useCallback(async (c: string = '0', append = false) => {
    try {
      if (append) setLoadingMore(true);
      const res = await fetch(`/api/posts?type=home&cursor=${c}`);
      const data = await res.json();
      if (data.success) {
        setPosts((prev) => (append ? [...prev, ...data.data] : data.data));
        setHasMore(data.hasMore);
        if (data.nextCursor) setCursor(data.nextCursor);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  return (
    <div className="max-w-[600px] mx-auto space-y-4">
      <h1 className="text-2xl font-bold mb-4">
        <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Home Feed</span>
      </h1>

      <CreatePost onPostCreated={() => loadPosts()} />

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-20 w-full rounded-xl" />
              <div className="flex gap-4">
                <Skeleton className="h-8 w-16 rounded-full" />
                <Skeleton className="h-8 w-16 rounded-full" />
                <Skeleton className="h-8 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length > 0 ? (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onUpdate={() => loadPosts()} />
            ))}
          </div>
          {hasMore && (
            <button
              onClick={() => loadPosts(cursor, true)}
              disabled={loadingMore}
              className="w-full py-3 text-sm text-violet-400 hover:text-violet-300 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </>
      ) : (
        <div className="text-center py-16 space-y-3">
          <div className="text-4xl mb-2">📡</div>
          <p className="text-lg font-semibold">Your feed is empty</p>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Start by creating a post above, or{' '}
            <Link href="/explore" className="text-violet-400 hover:underline">
              explore
            </Link>{' '}
            and follow some users to see their content here.
          </p>
        </div>
      )}
    </div>
  );
}
