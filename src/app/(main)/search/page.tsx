'use client';

import { Suspense, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PostCard } from '@/components/feed/PostCard';
import { Search as SearchIcon, Users, Hash, FileText, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { User, Post, Hashtag, Group } from '@/types';

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [query, setQuery] = useState(q);
  const [results, setResults] = useState<{ users: User[]; posts: Post[]; hashtags: Hashtag[]; groups: Group[] }>({ users: [], posts: [], hashtags: [], groups: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) setResults(data.data);
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="max-w-[600px] mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Search</span>
      </h1>
      <div className="relative mb-4">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users, posts, hashtags, groups..."
          className="pl-10 rounded-xl h-11"
        />
      </div>

      {query.length >= 2 && (
        <Tabs defaultValue="people">
          <TabsList className="w-full rounded-xl bg-muted mb-4">
            <TabsTrigger value="people" className="flex-1 rounded-lg gap-1"><Users className="w-3.5 h-3.5" />People</TabsTrigger>
            <TabsTrigger value="posts" className="flex-1 rounded-lg gap-1"><FileText className="w-3.5 h-3.5" />Posts</TabsTrigger>
            <TabsTrigger value="hashtags" className="flex-1 rounded-lg gap-1"><Hash className="w-3.5 h-3.5" />Tags</TabsTrigger>
            <TabsTrigger value="groups" className="flex-1 rounded-lg gap-1"><UsersRound className="w-3.5 h-3.5" />Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="people" className="space-y-2">
            {results.users.length > 0 ? results.users.map((u) => (
              <Link key={u.id} href={`/profile/${u.username}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={u.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm">{u.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div><p className="text-sm font-semibold">{u.name}</p><p className="text-xs text-muted-foreground">@{u.username}</p></div>
              </Link>
            )) : <p className="text-center py-8 text-sm text-muted-foreground">{loading ? 'Searching...' : 'No users found'}</p>}
          </TabsContent>

          <TabsContent value="posts" className="space-y-4">
            {results.posts.length > 0 ? results.posts.map((p) => <PostCard key={p.id} post={p} />) : <p className="text-center py-8 text-sm text-muted-foreground">No posts found</p>}
          </TabsContent>

          <TabsContent value="hashtags" className="space-y-2">
            {results.hashtags.length > 0 ? results.hashtags.map((t) => (
              <Link key={t.name} href={`/hashtag/${t.name}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center"><Hash className="w-5 h-5 text-violet-400" /></div>
                <div><p className="text-sm font-semibold">#{t.name}</p><p className="text-xs text-muted-foreground">{t.postCount} posts</p></div>
              </Link>
            )) : <p className="text-center py-8 text-sm text-muted-foreground">No hashtags found</p>}
          </TabsContent>

          <TabsContent value="groups" className="space-y-2">
            {results.groups.length > 0 ? results.groups.map((g) => (
              <Link key={g.id} href={`/groups/${g.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted">
                <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center"><UsersRound className="w-5 h-5 text-fuchsia-400" /></div>
                <div><p className="text-sm font-semibold">{g.name}</p><p className="text-xs text-muted-foreground">{g.memberCount} members</p></div>
              </Link>
            )) : <p className="text-center py-8 text-sm text-muted-foreground">No groups found</p>}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-[600px] mx-auto text-center py-12 text-muted-foreground">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
