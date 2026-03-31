'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PostCard } from '@/components/feed/PostCard';
import {
  MapPin,
  Link as LinkIcon,
  Calendar,
  ShieldCheck,
  UserPlus,
  UserMinus,
  Ban,
  MoreHorizontal,
  Grid3X3,
  Bookmark,
  Heart,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { User, Post } from '@/types';
import { safeFormatDistance } from '@/lib/dateUtils';

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        // Fetch user by username
        const searchRes = await fetch(`/api/users/search?q=${username}`);
        const searchData = await searchRes.json();
        const foundUser = searchData.data?.find((u: User) => u.username === username);
        if (!foundUser) { setLoading(false); return; }

        const [userRes, postsRes] = await Promise.all([
          fetch(`/api/users/${foundUser.id}`).then((r) => r.json()),
          fetch(`/api/posts?type=user&userId=${foundUser.id}`).then((r) => r.json()),
        ]);

        if (userRes.success) {
          setProfile(userRes.data);
          setIsFollowing(userRes.data.isFollowing);
        }
        if (postsRes.success) setPosts(postsRes.data || []);
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    }
    load();
  }, [username]);

  const loadLikes = async () => {
    if (likedPosts.length > 0 || !profile) return;
    setLoadingLikes(true);
    try {
      const res = await fetch(`/api/posts?type=likes&userId=${profile.id}`);
      const data = await res.json();
      setLikedPosts(data.data || []);
    } catch { /* fail */ } finally { setLoadingLikes(false); }
  };

  const loadSaved = async () => {
    if (savedPosts.length > 0 || !profile) return;
    setLoadingSaved(true);
    try {
      const res = await fetch(`/api/posts?type=saved&userId=${profile.id}`);
      const data = await res.json();
      setSavedPosts(data.data || []);
    } catch { /* fail */ } finally { setLoadingSaved(false); }
  };

  useEffect(() => {
    if (activeTab === 'likes') loadLikes();
    else if (activeTab === 'saved') loadSaved();
  }, [activeTab]);

  const handleFollow = async () => {
    if (!profile) return;
    try {
      await fetch(`/api/users/${profile.id}/follow`, { method: isFollowing ? 'DELETE' : 'POST' });
      setIsFollowing(!isFollowing);
      toast.success(isFollowing ? 'Unfollowed' : 'Following');
    } catch {
      toast.error('Failed');
    }
  };

  const handleBlock = async () => {
    if (!profile) return;
    try {
      await fetch(`/api/users/${profile.id}/block`, { method: 'POST' });
      toast.success('User blocked');
    } catch {
      toast.error('Failed');
    }
  };

  if (loading) {
    return (
      <div className="max-w-[600px] mx-auto space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="flex items-end gap-4 -mt-12 px-4 relative z-10">
          <Skeleton className="w-24 h-24 rounded-full" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-semibold">User not found</p>
        <p className="text-muted-foreground text-sm">@{username} doesn&apos;t exist</p>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <div className="max-w-[600px] mx-auto">
      {/* Cover Photo */}
      <div className="h-48 rounded-2xl bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 relative overflow-hidden">
        {profile.coverPhoto && (
          <img src={profile.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Profile Info */}
      <div className="px-4 -mt-12 relative z-10">
        <div className="flex items-end justify-between">
          <Avatar className="w-24 h-24 border-4 border-background ring-2 ring-violet-500/30">
            <AvatarImage src={profile.avatar} alt={profile.name} />
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-2xl">
              {profile.name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex gap-2 mb-2">
            {isOwnProfile ? (
              <Link href="/profile/edit">
                <Button variant="outline" size="sm" className="rounded-full">
                  Edit Profile
                </Button>
              </Link>
            ) : (
              <>
                <Button
                  onClick={handleFollow}
                  size="sm"
                  className={`rounded-full gap-1.5 ${isFollowing
                      ? 'bg-muted text-foreground hover:bg-red-500/10 hover:text-red-400'
                      : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                    }`}
                >
                  {isFollowing ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="outline" size="sm" className="rounded-full w-8 h-8 p-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleBlock} className="text-red-400">
                      <Ban className="w-4 h-4 mr-2" /> Block
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{profile.name}</h1>
            {profile.verified && (
              <ShieldCheck className="w-5 h-5 text-violet-400 fill-violet-400/20" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="text-sm mt-2 leading-relaxed">{profile.bio}</p>}

          <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
            {profile.location && (
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{profile.location}</span>
            )}
            {profile.website && (
              <a href={profile.website} className="flex items-center gap-1 text-violet-400 hover:underline">
                <LinkIcon className="w-3.5 h-3.5" />{profile.website}
              </a>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />Joined {profile.createdAt ? safeFormatDistance(profile.createdAt) : 'recently'}
            </span>
          </div>

          {/* Stats */}
          <div className="flex gap-5 mt-4">
            <button className="text-sm hover:underline">
              <span className="font-bold">{profile.postsCount || 0}</span> <span className="text-muted-foreground">Posts</span>
            </button>
            <button className="text-sm hover:underline">
              <span className="font-bold">{profile.followersCount || 0}</span> <span className="text-muted-foreground">Followers</span>
            </button>
            <button className="text-sm hover:underline">
              <span className="font-bold">{profile.followingCount || 0}</span> <span className="text-muted-foreground">Following</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts" className="mt-6" onValueChange={setActiveTab}>
        <TabsList className="w-full rounded-xl bg-muted">
          <TabsTrigger value="posts" className="flex-1 rounded-lg gap-1.5">
            <Grid3X3 className="w-4 h-4" /> Posts
          </TabsTrigger>
          {isOwnProfile && (
            <>
              <TabsTrigger value="likes" className="flex-1 rounded-lg gap-1.5">
                <Heart className="w-4 h-4" /> Likes
              </TabsTrigger>
              <TabsTrigger value="saved" className="flex-1 rounded-lg gap-1.5">
                <Bookmark className="w-4 h-4" /> Saved
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="posts" className="mt-4 space-y-4">
          {posts.length > 0 ? (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">No posts yet</div>
          )}
        </TabsContent>
        <TabsContent value="likes" className="mt-4 space-y-4">
          {loadingLikes ? (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          ) : likedPosts.length > 0 ? (
            likedPosts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">Liked posts will appear here</div>
          )}
        </TabsContent>
        <TabsContent value="saved" className="mt-4 space-y-4">
          {loadingSaved ? (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          ) : savedPosts.length > 0 ? (
            savedPosts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">Saved posts will appear here</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
