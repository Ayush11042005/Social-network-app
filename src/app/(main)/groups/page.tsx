'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Globe, Lock } from 'lucide-react';
import Link from 'next/link';
import type { Group } from '@/types';
import { toast } from 'sonner';

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/groups');
        const data = await res.json();
        setGroups(data.data || []);
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const handleJoinLeave = async (groupId: string, isMember: boolean) => {
    try {
      await fetch(`/api/groups/${groupId}/join`, { method: isMember ? 'DELETE' : 'POST' });
      setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, isMember: !isMember } : g));
      toast.success(isMember ? 'Left group' : 'Joined group');
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="max-w-[600px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Groups</span>
        </h1>
        <Link href="/groups/create">
          <Button size="sm" className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white gap-1.5">
            <Plus className="w-4 h-4" /> Create
          </Button>
        </Link>
      </div>

      <div className="grid gap-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))
        ) : groups.length > 0 ? (
          groups.map((group) => (
            <Card key={group.id} className="rounded-2xl border border-border overflow-hidden hover:border-violet-500/20 transition-colors">
              <div className="h-24 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 relative">
                {group.coverImage && <img src={group.coverImage} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="p-4 -mt-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/groups/${group.id}`} className="font-semibold hover:underline flex items-center gap-2">
                      {group.name}
                      <Badge variant="secondary" className="text-[10px]">
                        {group.privacy === 'public' ? <Globe className="w-3 h-3 mr-0.5" /> : <Lock className="w-3 h-3 mr-0.5" />}
                        {group.privacy}
                      </Badge>
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Users className="w-3 h-3" /> {group.memberCount} members
                    </p>
                    {group.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{group.description}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => handleJoinLeave(group.id, group.isMember)}
                    size="sm"
                    variant={group.isMember ? 'outline' : 'default'}
                    className={`rounded-full text-xs shrink-0 ${!group.isMember ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white' : ''}`}
                  >
                    {group.isMember ? 'Leave' : 'Join'}
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-16">
            <p className="text-lg font-semibold mb-2">No groups yet</p>
            <p className="text-muted-foreground text-sm">Create or join a group to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
