'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PostCard } from '@/components/feed/PostCard';
import { CreatePost } from '@/components/feed/CreatePost';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Globe, Lock, Settings } from 'lucide-react';
import type { Group, Post } from '@/types';

export default function GroupPage() {
  const { id } = useParams();
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [gRes, pRes] = await Promise.all([
        fetch(`/api/groups/${id}`).then((r) => r.json()),
        fetch(`/api/groups/${id}/posts`).then((r) => r.json()),
      ]);
      if (gRes.success) setGroup(gRes.data);
      if (pRes.success) setPosts(pRes.data || []);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="max-w-[600px] mx-auto"><Skeleton className="h-48 rounded-2xl" /></div>;
  if (!group) return <div className="text-center py-20 text-muted-foreground">Group not found</div>;

  return (
    <div className="max-w-[600px] mx-auto space-y-4">
      {/* Group Header */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="h-36 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20">
          {group.coverImage && <img src={group.coverImage} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold">{group.name}</h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {group.privacy === 'public' ? <Globe className="w-3 h-3 mr-0.5" /> : <Lock className="w-3 h-3 mr-0.5" />}
                  {group.privacy}
                </Badge>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{group.memberCount} members</span>
              </div>
              {group.description && <p className="text-sm mt-2">{group.description}</p>}
            </div>
            {group.myRole === 'admin' && (
              <Button variant="ghost" size="sm" className="rounded-full"><Settings className="w-4 h-4" /></Button>
            )}
          </div>
        </div>
      </div>

      {group.isMember && <CreatePost onPostCreated={load} />}

      {posts.length > 0 ? (
        posts.map((p) => <PostCard key={p.id} post={p} onUpdate={load} />)
      ) : (
        <div className="text-center py-12 text-muted-foreground text-sm">No posts in this group yet</div>
      )}
    </div>
  );
}
