'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Hash, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { User, Hashtag } from '@/types';

export function RightSidebar() {
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const usersRes = await fetch('/api/recommendations/users').then((r) => r.json());
        setSuggestedUsers(usersRes.data?.slice(0, 5) || []);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <aside className="hidden xl:block w-[320px] shrink-0">
      <div className="fixed w-[300px] top-4 space-y-5 pr-4">
        {/* Suggested Users */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-violet-400" />
            <h3 className="font-semibold text-sm">Suggested for you</h3>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-24 mb-1.5" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : suggestedUsers.length > 0 ? (
            <div className="space-y-3">
              {suggestedUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 group">
                  <Link href={`/profile/${u.username}`}>
                    <Avatar className="w-10 h-10 ring-2 ring-transparent group-hover:ring-violet-500/30 transition-all">
                      <AvatarImage src={u.avatar} alt={u.name} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs">
                        {u.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${u.username}`} className="text-sm font-medium hover:underline truncate block">
                      {u.name}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs px-3 h-7 border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                  >
                    Follow
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">No suggestions yet</p>
          )}
        </div>



        {/* Footer */}
        <div className="px-1 text-[11px] text-muted-foreground leading-relaxed">
          <p>© 2024 Nexus. Built with Next.js & Neo4j</p>
        </div>
      </div>
    </aside>
  );
}
