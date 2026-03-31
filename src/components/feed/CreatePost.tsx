'use client';

import { useState, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Image, Video, MapPin, Hash, AtSign, Globe, Lock, Users, X, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function CreatePost({ onPostCreated }: { onPostCreated?: () => void }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const extractHashtags = (text: string): string[] => {
    const matches = text.match(/#(\w+)/g);
    return matches ? matches.map((m) => m.slice(1)) : [];
  };

  const extractMentions = (text: string): string[] => {
    const matches = text.match(/@(\w+)/g);
    return matches ? matches.map((m) => m.slice(1)) : [];
  };

  // Use blob URLs for local preview — in production these would go to Cloudinary
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      if (file.type.startsWith('image/')) {
        setImages((prev) => [...prev, url]);
        setSelectedFiles((prev) => [...prev, file]);
      } else if (file.type.startsWith('video/')) {
        setVideo(url);
        setSelectedVideoFile(file);
      }
    }
    // Reset input so same file can be picked again
    e.target.value = '';
  };

  const handleSubmit = useCallback(async () => {
    if (!content.trim() && images.length === 0 && !video) {
      toast.error('Please write something or add media');
      return;
    }

    setIsLoading(true);
    try {
      const hashtags = extractHashtags(content);
      const mentions = extractMentions(content);

      const formData = new FormData();
      formData.append('content', content.trim());
      formData.append('visibility', visibility);
      formData.append('hashtags', JSON.stringify(hashtags));
      formData.append('mentions', JSON.stringify(mentions));

      selectedFiles.forEach((file) => formData.append('images', file));
      if (selectedVideoFile) formData.append('video', selectedVideoFile);

      const res = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create post');
      }

      setContent('');
      setImages([]);
      setVideo(null);
      setSelectedFiles([]);
      setSelectedVideoFile(null);
      setIsFocused(false);
      toast.success('Post shared!');
      onPostCreated?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create post';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [content, images, video, visibility, onPostCreated]);

  // Prevent blur from collapsing panel when clicking toolbar buttons
  const handleBlur = () => {
    blurTimerRef.current = setTimeout(() => {
      if (!content && images.length === 0 && !video) {
        setIsFocused(false);
      }
    }, 200);
  };

  const handleFocus = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
    }
    setIsFocused(true);
  };

  const handleCardMouseDown = () => {
    // Prevent blur from firing when clicking within the card
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
    }
  };

  const visibilityIcon = {
    public: <Globe className="w-3.5 h-3.5" />,
    private: <Lock className="w-3.5 h-3.5" />,
  };

  const visibilityLabel = {
    public: 'Public',
    private: 'Private',
  };

  const isExpanded = isFocused || !!content || images.length > 0 || !!video || isDropdownOpen;

  return (
    <Card
      className="rounded-2xl border border-border bg-card p-4"
      onMouseDown={handleCardMouseDown}
    >
      {/* Hidden File Input for Image/Video Uploads — moved to root for better reliability */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="flex gap-3">
        <Avatar className="w-10 h-10 ring-2 ring-violet-500/20 shrink-0">
          <AvatarImage src={user?.image} alt={user?.name} />
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm">
            {user?.name?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <Textarea
            id="create-post-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="What's on your mind? (Ctrl+Enter to post)"
            className="min-h-[44px] border-0 bg-transparent resize-none text-sm p-0 focus-visible:ring-0 placeholder:text-muted-foreground transition-all"
            rows={isExpanded ? 3 : 1}
          />

          {/* Media Preview Section */}
          {(images.length > 0 || video) && (
            <div className="flex flex-wrap gap-2 mt-3 overflow-x-auto pb-1 max-h-60">
              {/* Images Preview */}
              {images.map((img, i) => (
                <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden group shrink-0 border border-border">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()} // prevent blur
                    onClick={() => {
                      setImages((prev) => prev.filter((_, idx) => idx !== i));
                      setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i));
                    }}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}

              {/* Video Preview */}
              {video && (
                <div className="relative aspect-video h-24 rounded-xl overflow-hidden group shrink-0 border border-border bg-black">
                  <video src={video} className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()} // prevent blur
                    onClick={() => {
                      setVideo(null);
                      setSelectedVideoFile(null);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white">
                      <Video className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions Bar — always visible once expanded */}
          {isExpanded && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  title="Add image"
                  className="h-8 w-8 p-0 rounded-full text-violet-400 hover:bg-violet-500/10"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
                >
                  <Image className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  title="Add video"
                  className="h-8 w-8 p-0 rounded-full text-fuchsia-400 hover:bg-fuchsia-500/10"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
                >
                  <Video className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  title="Add location"
                  className="h-8 w-8 p-0 rounded-full text-green-400 hover:bg-green-500/10"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <MapPin className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  title="Add hashtag"
                  className="h-8 w-8 p-0 rounded-full text-blue-400 hover:bg-blue-500/10"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setContent((c) => c + ' #')}
                >
                  <Hash className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  title="Mention someone"
                  className="h-8 w-8 p-0 rounded-full text-orange-400 hover:bg-orange-500/10"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setContent((c) => c + ' @')}
                >
                  <AtSign className="w-4 h-4" />
                </Button>

                <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                  <DropdownMenuTrigger render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 rounded-full gap-1 text-xs text-muted-foreground"
                    >
                      {visibilityIcon[visibility]}
                      <span>{visibilityLabel[visibility]}</span>
                    </Button>
                  } />
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setVisibility('public')}>
                      <Globe className="w-4 h-4 mr-2" /> Public
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setVisibility('private')}>
                      <Lock className="w-4 h-4 mr-2" /> Private
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Button
                id="create-post-submit"
                type="button"
                onClick={handleSubmit}
                onMouseDown={(e) => e.preventDefault()} // CRITICAL: prevent blur before click fires
                disabled={isLoading || (!content.trim() && images.length === 0 && !video)}
                size="sm"
                className="h-8 px-5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-semibold disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Posting…
                  </>
                ) : (
                  'Post'
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
