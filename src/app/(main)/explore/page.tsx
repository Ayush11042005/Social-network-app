'use client';

import { useEffect, useState, useCallback } from 'react';
import { PostCard } from '@/components/feed/PostCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Hash, Users, Clock, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { Post, Hashtag } from '@/types';
import { toast } from 'sonner';

interface SuggestedUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  verified?: boolean;
  followerCount: number;
  postCount: number;
  isFollowing: boolean;
}

export default function ExplorePage() {
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [taggedPosts, setTaggedPosts] = useState<Post[]>([]);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [people, setPeople] = useState<SuggestedUser[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [loadingTagged, setLoadingTagged] = useState(false);
  const [activeTab, setActiveTab] = useState('trending');
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const loadTrending = useCallback(async () => {
    setLoadingTrending(true);
    try {
      const [postsRes, tagsRes] = await Promise.all([
        fetch('/api/explore?type=trending').then((r) => r.json()),
        fetch('/api/explore?type=hashtags').then((r) => r.json()),
      ]);
      setTrendingPosts(postsRes.data || []);
      setHashtags(tagsRes.data || []);
    } catch {
      /* silently fail */
    } finally {
      setLoadingTrending(false);
    }
  }, []);

  const loadRecent = useCallback(async () => {
    if (recentPosts.length > 0) return; // already loaded
    setLoadingRecent(true);
    try {
      const res = await fetch('/api/explore?type=recent');
      const data = await res.json();
      setRecentPosts(data.data || []);
    } catch {
      /* silently fail */
    } finally {
      setLoadingRecent(false);
    }
  }, [recentPosts.length]);

  const loadTaggedPosts = useCallback(async () => {
    if (taggedPosts.length > 0) return; // already loaded
    setLoadingTagged(true);
    try {
      const res = await fetch('/api/explore?type=tagged');
      const data = await res.json();
      setTaggedPosts(data.data || []);
    } catch {
      /* silently fail */
    } finally {
      setLoadingTagged(false);
    }
  }, [taggedPosts.length]);

  const loadPeople = useCallback(async () => {
    if (people.length > 0) return; // already loaded
    setLoadingPeople(true);
    try {
      const res = await fetch('/api/explore?type=people');
      const data = await res.json();
      const list: SuggestedUser[] = data.data || [];
      setPeople(list);
      setFollowingIds(new Set(list.filter((u) => u.isFollowing).map((u) => u.id)));
    } catch {
      /* silently fail */
    } finally {
      setLoadingPeople(false);
    }
  }, [people.length]);

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

  useEffect(() => {
    if (activeTab === 'recent') loadRecent();
    else if (activeTab === 'people') loadPeople();
    else if (activeTab === 'hashtags') loadTaggedPosts();
  }, [activeTab, loadRecent, loadPeople, loadTaggedPosts]);

  const handleFollow = async (userId: string) => {
    const isFollowing = followingIds.has(userId);
    // Optimistic update
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (isFollowing) next.delete(userId);
      else next.add(userId);
      return next;
    });
    try {
      const res = await fetch(`/api/users/${userId}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
      });
      if (!res.ok) throw new Error();
      toast.success(isFollowing ? 'Unfollowed' : 'Following!');
    } catch {
      // Revert
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (isFollowing) next.add(userId);
        else next.delete(userId);
        return next;
      });
      toast.error('Action failed');
    }
  };

  const PostSkeletons = () => (
    <>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex gap-3 mb-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div>
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-xl mb-3" />
          <div className="flex gap-4">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="max-w-[600px] mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          Explore
        </span>
      </h1>

      <Tabs defaultValue="trending" className="w-full" onValueChange={(v) => setActiveTab(v)}>
        <TabsList className="w-full mb-4 rounded-xl bg-muted">
          <TabsTrigger value="trending" className="flex-1 rounded-lg gap-1.5 text-xs sm:text-sm">
            <TrendingUp className="w-4 h-4" /> Trending
          </TabsTrigger>
          <TabsTrigger value="recent" className="flex-1 rounded-lg gap-1.5 text-xs sm:text-sm">
            <Clock className="w-4 h-4" /> Recent
          </TabsTrigger>
          <TabsTrigger value="people" className="flex-1 rounded-lg gap-1.5 text-xs sm:text-sm">
            <Users className="w-4 h-4" /> People
          </TabsTrigger>
          <TabsTrigger value="hashtags" className="flex-1 rounded-lg gap-1.5 text-xs sm:text-sm">
            <Hash className="w-4 h-4" /> Tags
          </TabsTrigger>
        </TabsList>

        {/* ─── Trending Tab ─── */}
        <TabsContent value="trending" className="space-y-4">
          {loadingTrending ? (
            <PostSkeletons />
          ) : trendingPosts.length > 0 ? (
            trendingPosts.map((post) => (
              <PostCard key={post.id} post={post} onUpdate={loadTrending} />
            ))
          ) : (
            <EmptyState
              icon={<TrendingUp className="w-8 h-8 text-violet-400" />}
              title="Nothing trending yet"
              description="Be the first to post something — your content could end up here!"
            />
          )}
        </TabsContent>

        {/* ─── Recent Tab ─── */}
        <TabsContent value="recent" className="space-y-4">
          {loadingRecent ? (
            <PostSkeletons />
          ) : recentPosts.length > 0 ? (
            recentPosts.map((post) => (
              <PostCard key={post.id} post={post} onUpdate={() => {
                // Reset so it reloads
                setRecentPosts([]);
                loadRecent();
              }} />
            ))
          ) : (
            <EmptyState
              icon={<Clock className="w-8 h-8 text-violet-400" />}
              title="No recent posts"
              description="Public posts from all users will appear here"
            />
          )}
        </TabsContent>

        {/* ─── People Tab ─── */}
        <TabsContent value="people" className="space-y-3">
          {loadingPeople ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            ))
          ) : people.length > 0 ? (
            people.map((person) => {
              const isFollowing = followingIds.has(person.id);
              return (
                <div
                  key={person.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-violet-500/30 transition-colors"
                >
                  <Link href={`/profile/${person.username}`}>
                    <Avatar className="w-12 h-12 ring-2 ring-violet-500/10 hover:ring-violet-500/30 transition-all">
                      <AvatarImage src={person.avatar} alt={person.name} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                        {person.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${person.username}`} className="hover:underline">
                      <p className="text-sm font-semibold truncate flex items-center gap-1">
                        {person.name}
                        {person.verified && <span className="text-violet-400 text-xs">✓</span>}
                      </p>
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">
                      @{person.username}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {person.followerCount} follower{person.followerCount !== 1 ? 's' : ''}
                      </span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground">
                        {person.postCount} post{person.postCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isFollowing ? 'outline' : 'default'}
                    className={`h-8 rounded-full text-xs gap-1 px-3 ${
                      isFollowing
                        ? 'border-violet-500/30 text-violet-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                        : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white'
                    }`}
                    onClick={() => handleFollow(person.id)}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-3 h-3" /> Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3" /> Follow
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          ) : (
            <EmptyState
              icon={<Users className="w-8 h-8 text-violet-400" />}
              title="No people found"
              description="New users will appear here"
            />
          )}
        </TabsContent>

        {/* ─── Hashtags Tab ─── */}
        <TabsContent value="hashtags" className="space-y-4">
          <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-2 scrollbar-none">
            {hashtags.map((tag) => (
              <Link key={tag.name} href={`/hashtag/${tag.name}`}>
                <Badge variant="secondary" className="px-3 py-1 rounded-full whitespace-nowrap hover:bg-violet-500/10 hover:text-violet-400 transition-colors cursor-pointer">
                  #{tag.name}
                </Badge>
              </Link>
            ))}
          </div>

          {loadingTagged ? (
            <PostSkeletons />
          ) : taggedPosts.length > 0 ? (
            taggedPosts.map((post) => (
              <PostCard key={post.id} post={post} onUpdate={() => {
                setTaggedPosts([]);
                loadTaggedPosts();
              }} />
            ))
          ) : (
            <EmptyState
              icon={<Hash className="w-8 h-8 text-violet-400" />}
              title="No tagged posts yet"
              description="Posts with #hashtags will appear here"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-16 space-y-3">
      <div className="flex justify-center">{icon}</div>
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-muted-foreground text-sm max-w-xs mx-auto">{description}</p>
    </div>
  );
}
