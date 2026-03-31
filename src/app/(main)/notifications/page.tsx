'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, MessageCircle, UserPlus, AtSign, Share2, Eye, Users, CheckCheck } from 'lucide-react';
import { safeFormatDistance } from '@/lib/dateUtils';
import type { Notification, User } from '@/types';
import { toast } from 'sonner';
import Link from 'next/link';

interface ExtendedNotification extends Notification {
  isFollowingBack?: boolean;
}

const typeIcons: Record<string, React.ReactNode> = {
  like: <Heart className="w-4 h-4 text-red-400" />,
  comment: <MessageCircle className="w-4 h-4 text-blue-400" />,
  follow: <UserPlus className="w-4 h-4 text-violet-400" />,
  mention: <AtSign className="w-4 h-4 text-orange-400" />,
  share: <Share2 className="w-4 h-4 text-green-400" />,
  story_view: <Eye className="w-4 h-4 text-fuchsia-400" />,
  group_invite: <Users className="w-4 h-4 text-cyan-400" />,
  reaction: <Heart className="w-4 h-4 text-pink-400" />,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<ExtendedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        const items = data.data || [];
        setNotifications(items);
        // Track who we are already following back
        const followed = new Set<string>(
          items.filter((n: ExtendedNotification) => n.isFollowingBack).map((n: ExtendedNotification) => n.actor?.id)
        );
        setFollowingIds(followed);
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const handleFollowBack = async (actorId: string) => {
    try {
      setFollowingIds(prev => new Set(prev).add(actorId));
      const res = await fetch(`/api/users/${actorId}/follow`, { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('Following back');
    } catch {
      setFollowingIds(prev => {
        const next = new Set(prev);
        next.delete(actorId);
        return next;
      });
      toast.error('Failed to follow back');
    }
  };

  const markAllRead = async () => {
    try {
      for (const n of notifications.filter((n) => !n.read)) {
        await fetch(`/api/notifications/${n.id}/read`, { method: 'PUT' });
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All marked as read');
    } catch {
      toast.error('Failed');
    }
  };

  return (
    <div className="max-w-[600px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Follow Requests</span>
        </h1>
        {notifications.some((n) => !n.read) && (
          <Button variant="ghost" size="sm" className="text-xs text-violet-400" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-1">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))
        ) : notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-center gap-4 p-4 rounded-2xl transition-all border border-transparent hover:border-violet-500/10 ${
                n.read ? 'bg-card/50' : 'bg-violet-500/5 border-violet-500/10'
              }`}
            >
              <Link href={`/profile/${n.actor?.username}`}>
                <Avatar className="w-12 h-12 shrink-0 ring-2 ring-transparent group-hover:ring-violet-500/30 transition-all">
                  <AvatarImage src={n.actor?.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm">
                    {n.actor?.name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Link href={`/profile/${n.actor?.username}`} className="font-semibold text-sm hover:underline truncate">
                    {n.actor?.name}
                  </Link>
                  <span className="text-[10px] text-muted-foreground">@{n.actor?.username}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">Sent you a follow request</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {n.createdAt ? safeFormatDistance(n.createdAt) : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {followingIds.has(n.actor?.id!) ? (
                  <Button variant="outline" size="sm" disabled className="text-[11px] h-8 rounded-full border-violet-500/20 text-violet-400">
                    Following
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="text-[11px] h-8 px-4 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90 shadow-md shadow-violet-500/10"
                    onClick={() => handleFollowBack(n.actor?.id!)}
                  >
                    Accept & Follow Back
                  </Button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-24 bg-card/30 rounded-3xl border border-dashed border-border/50">
            <div className="w-16 h-16 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-violet-400/50" />
            </div>
            <p className="text-lg font-semibold mb-1">No pending requests</p>
            <p className="text-muted-foreground text-sm px-10">
              When people follow you, their requests will appear here so you can connect back.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
