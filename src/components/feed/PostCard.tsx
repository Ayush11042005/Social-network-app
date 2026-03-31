'use client';

import { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  BookmarkCheck,
  ThumbsUp,
  Smile,
  Frown,
  Angry,
  Send,
  Copy,
  X,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

import { formatDistanceToNow } from 'date-fns';
import { safeFormatDistance } from '@/lib/dateUtils';
import Link from 'next/link';
import type { Post, Comment } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const reactionIcons = {
  like: { icon: ThumbsUp, color: 'text-blue-500', label: '👍' },
  love: { icon: Heart, color: 'text-red-500', label: '❤️' },
  haha: { icon: Smile, color: 'text-yellow-500', label: '😂' },
  sad: { icon: Frown, color: 'text-yellow-600', label: '😢' },
  angry: { icon: Angry, color: 'text-orange-500', label: '😡' },
};

// ─── Share Modal ─────────────────────────────────────────────────────────────
function ShareModal({
  postId,
  onClose,
  onShared,
}: {
  postId: string;
  onClose: () => void;
  onShared: () => void;
}) {
  const [caption, setCaption] = useState('');
  const [sharing, setSharing] = useState(false);

  const shareToFeed = async () => {
    setSharing(true);
    try {
      const res = await fetch(`/api/posts/${postId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      });
      if (!res.ok) throw new Error();
      toast.success('Post shared to your feed!');
      onShared();
      onClose();
    } catch {
      toast.error('Failed to share');
    } finally {
      setSharing(false);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/posts/${postId}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">Share Post</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={copyLink}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-violet-500/40 hover:bg-violet-500/5 transition-all text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
              <Copy className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Copy link</p>
              <p className="text-xs text-muted-foreground">Share a link to this post</p>
            </div>
          </button>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Share to your feed</p>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption… (optional)"
              className="w-full bg-muted/50 border border-border rounded-xl p-3 text-sm resize-none h-20 focus:outline-none focus:border-violet-500/40 placeholder:text-muted-foreground"
            />
            <Button
              onClick={shareToFeed}
              disabled={sharing}
              className="w-full h-9 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-semibold"
            >
              {sharing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {sharing ? 'Sharing…' : 'Share'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Comment Item ─────────────────────────────────────────────────────────────
function CommentItem({ comment }: { comment: Comment }) {
  const timeAgo = safeFormatDistance(comment.createdAt);
  return (
    <div className="flex gap-2 group">
      <Avatar className="w-7 h-7 shrink-0">
        <AvatarImage src={comment.author?.avatar} />
        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-[10px]">
          {comment.author?.name?.charAt(0)?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="bg-muted/60 rounded-2xl px-3 py-2 inline-block max-w-full">
          <span className="text-xs font-semibold mr-1.5">{comment.author?.name}</span>
          <span className="text-xs text-foreground/90 break-words">{comment.content}</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 ml-1">{timeAgo}</p>
      </div>
    </div>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────
export function PostCard({ post, onUpdate }: { post: Post; onUpdate?: () => void }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(!!post.isLiked);
  const [saved, setSaved] = useState(!!post.isSaved);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [sharesCount, setSharesCount] = useState(post.sharesCount || 0);
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentPosting, setCommentPosting] = useState(false);
  const [heartAnimating, setHeartAnimating] = useState(false);

  // Load comments when expanded
  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`);
      const data = await res.json();
      if (data.success) {
        setComments(data.data || []);
      }
    } catch {
      // silent fail
    } finally {
      setCommentsLoading(false);
    }
  }, [post.id]);

  useEffect(() => {
    if (showComments) {
      loadComments();
    }
  }, [showComments, loadComments]);

  const handleLike = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount((prev) => (wasLiked ? Math.max(0, prev - 1) : prev + 1));
    if (!wasLiked) {
      setHeartAnimating(true);
      setTimeout(() => setHeartAnimating(false), 600);
    }
    try {
      const method = wasLiked ? 'DELETE' : 'POST';
      const res = await fetch(`/api/posts/${post.id}/like`, { method });
      if (!res.ok) throw new Error();
    } catch {
      // Revert
      setLiked(wasLiked);
      setLikesCount((prev) => (wasLiked ? prev + 1 : Math.max(0, prev - 1)));
      toast.error('Failed to like post');
    }
  };

  const handleReact = async (type: string) => {
    try {
      await fetch(`/api/posts/${post.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      setShowReactions(false);
      if (!liked) {
        setLiked(true);
        setLikesCount((prev) => prev + 1);
      }
      toast.success(`Reacted with ${reactionIcons[type as keyof typeof reactionIcons]?.label ?? type}`);
    } catch {
      toast.error('Failed to react');
    }
  };

  const handleSave = async () => {
    const wasSaved = saved;
    setSaved(!wasSaved);
    try {
      const res = await fetch(`/api/posts/${post.id}/save`, { method: wasSaved ? 'DELETE' : 'POST' });
      if (!res.ok) throw new Error();
      toast.success(wasSaved ? 'Removed from bookmarks' : 'Saved to bookmarks');
    } catch {
      setSaved(wasSaved);
      toast.error('Failed to save');
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setCommentPosting(true);
    const text = commentText;
    setCommentText('');
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) throw new Error();
      setCommentsCount((prev) => prev + 1);
      toast.success('Comment added');
      loadComments();
      onUpdate?.();
    } catch {
      setCommentText(text);
      toast.error('Failed to comment');
    } finally {
      setCommentPosting(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Post deleted');
      onUpdate?.();
    } catch {
      toast.error('Failed to delete post');
    }
  };

  const timeAgo = safeFormatDistance(post.createdAt);

  const visibilityBadge = post.visibility === 'followers'
    ? '👥'
    : post.visibility === 'private'
    ? '🔒'
    : null;

  return (
    <>
      {showShareModal && (
        <ShareModal
          postId={post.id}
          onClose={() => setShowShareModal(false)}
          onShared={() => setSharesCount((prev) => prev + 1)}
        />
      )}

      <Card className="rounded-2xl border border-border bg-card overflow-hidden hover:border-violet-500/20 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${post.author?.username}`}>
              <Avatar className="w-10 h-10 ring-2 ring-violet-500/20 hover:ring-violet-500/40 transition-all">
                <AvatarImage src={post.author?.avatar} alt={post.author?.name} />
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm">
                  {post.author?.name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link
                href={`/profile/${post.author?.username}`}
                className="text-sm font-semibold hover:underline flex items-center gap-1"
              >
                {post.author?.name}
                {post.author?.verified && (
                  <span className="text-violet-400 text-xs">✓</span>
                )}
              </Link>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>@{post.author?.username}</span>
                <span>·</span>
                <span>{timeAgo}</span>
                {visibilityBadge && (
                  <>
                    <span>·</span>
                    <span title={post.visibility}>{visibilityBadge}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            } />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowShareModal(true)}>
                <Share2 className="w-4 h-4 mr-2" /> Share Post
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`);
                toast.success('Link copied!');
              }}>
                <Copy className="w-4 h-4 mr-2" /> Copy Link
              </DropdownMenuItem>
              {user?.id === post.author?.id && (
                <DropdownMenuItem onClick={handleDelete} className="text-red-400">
                  Delete Post
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        {post.content && (
          <div className="px-4 pb-3">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
          </div>
        )}

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1">
            {post.hashtags.map((tag) => (
              <Link
                key={tag}
                href={`/hashtag/${tag}`}
                className="text-xs text-violet-400 hover:text-violet-300"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Video */}
        {post.video && (
          <div className="w-full bg-black aspect-video relative border-y border-border/50">
            <video
              src={post.video}
              controls
              className="w-full h-full object-contain"
              poster={post.images && post.images.length > 0 ? post.images[0] : undefined}
            />
          </div>
        )}

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <div
            className={`grid gap-0.5 ${post.video ? 'mt-0.5' : ''} ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
          >
            {post.images.slice(0, 4).map((img: string, i: number) => (
              <Dialog key={i}>
                <DialogTrigger nativeButton={false} render={
                  <div
                    className={`relative ${post.images.length === 1 ? 'min-h-[300px] max-h-[600px]' : 'aspect-square'} bg-muted/30 overflow-hidden cursor-zoom-in group`}
                  >
                    <img
                      src={img}
                      alt={`Post image ${i + 1}`}
                      className={`w-full h-full ${post.images.length === 1 ? 'object-contain' : 'object-cover'} hover:scale-[1.02] transition-transform duration-500`}
                    />
                    {i === 3 && post.images.length > 4 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xl font-bold">+{post.images.length - 4}</span>
                      </div>
                    )}
                  </div>
                } />
                <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] p-0 overflow-hidden bg-transparent border-0 shadow-none ring-0">
                  <div className="relative w-full h-full flex items-center justify-center p-4">
                    <img
                      src={img}
                      alt="Full screen"
                      className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        )}

        {/* Stat counts row */}
        <div className="px-4 pt-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {likesCount > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                {likesCount.toLocaleString()}
              </span>
            )}
            {commentsCount > 0 && (
              <button
                onClick={() => setShowComments(!showComments)}
                className="hover:text-foreground transition-colors"
              >
                {commentsCount.toLocaleString()} comment{commentsCount !== 1 ? 's' : ''}
              </button>
            )}
          </div>
          {sharesCount > 0 && (
            <span>{sharesCount.toLocaleString()} share{sharesCount !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-2 py-1 flex items-center justify-between border-t border-border/50 mt-2">
          <div className="flex items-center gap-0.5">

            {/* Like with reaction picker */}
            <div
              className="relative"
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setShowReactions(false)}
            >
              <Button
                variant="ghost"
                size="sm"
                id={`like-btn-${post.id}`}
                className={`h-9 px-3 rounded-full gap-1.5 transition-all ${liked ? 'text-red-500 hover:text-red-400' : 'text-muted-foreground hover:text-red-400'}`}
                onClick={handleLike}
              >
                <Heart
                  className={`w-4 h-4 transition-transform ${heartAnimating ? 'scale-125' : 'scale-100'} ${liked ? 'fill-current' : ''}`}
                />
                <span className="text-xs font-medium">Like</span>
              </Button>

              {showReactions && (
                <div
                  className="absolute bottom-full left-0 mb-1 flex gap-1 bg-card border border-border rounded-full px-2 py-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
                  onMouseEnter={() => setShowReactions(true)}
                  onMouseLeave={() => setShowReactions(false)}
                >
                  {Object.entries(reactionIcons).map(([type, { label }]) => (
                    <button
                      key={type}
                      onClick={() => handleReact(type)}
                      className="text-xl hover:scale-125 transition-transform px-1"
                      title={type}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Comment */}
            <Button
              variant="ghost"
              size="sm"
              id={`comment-btn-${post.id}`}
              className="h-9 px-3 rounded-full gap-1.5 text-muted-foreground hover:text-violet-400"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Comment</span>
            </Button>

            {/* Share */}
            <Button
              variant="ghost"
              size="sm"
              id={`share-btn-${post.id}`}
              className="h-9 px-3 rounded-full gap-1.5 text-muted-foreground hover:text-green-400"
              onClick={() => setShowShareModal(true)}
            >
              <Share2 className="w-4 h-4" />
              <span className="text-xs font-medium">Share</span>
            </Button>
          </div>

          {/* Save */}
          <Button
            variant="ghost"
            size="sm"
            id={`save-btn-${post.id}`}
            className={`h-9 w-9 p-0 rounded-full transition-colors ${saved ? 'text-violet-400' : 'text-muted-foreground hover:text-violet-400'}`}
            onClick={handleSave}
          >
            {saved ? <BookmarkCheck className="w-4 h-4 fill-current" /> : <Bookmark className="w-4 h-4" />}
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="border-t border-border px-4 pt-3 pb-4 space-y-3">
            {/* Comment Input */}
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarImage src={user?.image} />
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-[10px]">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex items-center gap-2 bg-muted/60 rounded-full px-3 py-1.5">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleComment();
                    }
                  }}
                  placeholder="Write a comment…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {commentText.trim() && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleComment}
                    disabled={commentPosting}
                    className="h-6 w-6 p-0 rounded-full text-violet-400 hover:text-violet-300 hover:bg-transparent"
                  >
                    {commentPosting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Existing Comments */}
            {commentsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {comments.map((c) => (
                  <CommentItem key={c.id} comment={c} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">
                No comments yet. Be the first!
              </p>
            )}
          </div>
        )}
      </Card>
    </>
  );
}
