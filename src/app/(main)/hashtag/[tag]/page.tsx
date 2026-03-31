'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PostCard } from '@/components/feed/PostCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Hash } from 'lucide-react';
import type { Post } from '@/types';

export default function HashtagPage() {
  const { tag } = useParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/hashtags/${tag}`);
        const data = await res.json();
        setPosts(data.data || []);
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    }
    load();
  }, [tag]);

  return (
    <div className="max-w-[600px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
          <Hash className="w-6 h-6 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">#{tag}</h1>
          <p className="text-sm text-muted-foreground">{posts.length} posts</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)
        ) : posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="text-center py-16 text-muted-foreground text-sm">No posts with this hashtag yet</div>
        )}
      </div>
    </div>
  );
}
