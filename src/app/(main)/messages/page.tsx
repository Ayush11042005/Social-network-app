'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, MessageSquarePlus, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { safeFormatDistance } from '@/lib/dateUtils';
import type { Conversation } from '@/types';

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // New Message State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const openNewMessage = async () => {
    setIsDialogOpen(true);
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/explore?type=people');
      const data = await res.json();
      setSuggestedUsers(data.data || []);
    } catch { /* ignore */ }
    setLoadingUsers(false);
  };

  const startConversation = async (userId: string) => {
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId }),
      });
      const data = await res.json();
      if (data.success) {
        setIsDialogOpen(false);
        router.push(`/messages/${data.data.id}`);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/messages/conversations');
        const data = await res.json();
        setConversations(data.data || []);
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const names = c.participants?.map((p) => (p.name || '').toLowerCase()) || [];
    return names.some((n) => n.includes(search.toLowerCase()));
  });

  return (
    <div className="max-w-[600px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Messages</span>
        </h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={
            <button onClick={openNewMessage} className="w-9 h-9 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 hover:bg-violet-500/20 transition-colors">
              <MessageSquarePlus className="w-5 h-5" />
            </button>
          } />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {loadingUsers ? (
                <div className="flex justify-center p-4"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : suggestedUsers.length > 0 ? (
                suggestedUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => startConversation(u.id)}
                    className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-xl transition-colors text-left"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={u.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                        {u.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{u.name}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground">No users found.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations..."
          className="pl-10 rounded-xl h-10"
        />
      </div>

      <div className="space-y-1">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1.5" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))
        ) : filtered.length > 0 ? (
          filtered.map((conv) => {
            const other = conv.participants?.[0] as unknown as Record<string, unknown> | undefined;
            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
              >
                <Avatar className="w-12 h-12 ring-2 ring-violet-500/20">
                  <AvatarImage src={other?.avatar as string} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                    {(other?.name as string)?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm truncate">{other?.name as string || conv.name}</p>
                    {conv.lastMessage && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {safeFormatDistance(conv.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.lastMessage?.content || 'Start a conversation'}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <div className="w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] flex items-center justify-center shrink-0">
                    {conv.unreadCount}
                  </div>
                )}
              </Link>
            );
          })
        ) : (
          <div className="text-center py-16">
            <p className="text-lg font-semibold mb-2">No messages yet</p>
            <p className="text-muted-foreground text-sm">Start a conversation with someone</p>
          </div>
        )}
      </div>
    </div>
  );
}
