'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Image as ImageIcon, Loader2, Globe, Users, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { StoryGroup } from '@/types';

export default function StoriesPage() {
  const { user: currentUser } = useAuth();
  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<number>(0);
  const [activeStory, setActiveStory] = useState<number>(0);

  // Create Story State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');

  const load = async () => {
    try {
      const res = await fetch('/api/stories');
      const data = await res.json();
      setStories(data.data || []);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreateSubmit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('visibility', visibility);

      const res = await fetch('/api/stories', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        toast.success('Story added!');
        setIsCreateOpen(false);
        setPreviewUrl(null);
        setSelectedFile(null);
        setVisibility('public');
        load();
      } else {
        toast.error('Failed to add story');
      }
    } catch {
      toast.error('Failed to add story');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm('Are you sure you want to delete this story?')) return;
    try {
      const res = await fetch(`/api/stories/${storyId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Story deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const currentGroup = stories[activeGroup];
  const currentStory = currentGroup?.stories[activeStory];

  const goNext = () => {
    if (!currentGroup) return;
    if (activeStory < currentGroup.stories.length - 1) {
      setActiveStory(activeStory + 1);
    } else if (activeGroup < stories.length - 1) {
      setActiveGroup(activeGroup + 1);
      setActiveStory(0);
    }
    // Mark as viewed
    if (currentStory) {
      fetch(`/api/stories/${currentStory.id}/view`, { method: 'POST' }).catch(() => {});
    }
  };

  const goPrev = () => {
    if (activeStory > 0) {
      setActiveStory(activeStory - 1);
    } else if (activeGroup > 0) {
      setActiveGroup(activeGroup - 1);
      setActiveStory(0);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Skeleton className="w-80 h-[500px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-[500px] mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Stories</span>
      </h1>

      {/* Story Rings */}
      <div className="flex gap-4 mb-6 overflow-x-auto pb-2 items-start">
        {/* Add Story Button */}
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) { setPreviewUrl(null); setSelectedFile(null); setVisibility('public'); }
        }}>
          <DialogTrigger render={
            <button className="flex flex-col items-center gap-1.5 shrink-0 group">
              <div className="relative p-[2px]">
                <Avatar className="w-14 h-14 border-2 border-background opacity-80 group-hover:opacity-100 transition-opacity">
                  <AvatarImage src={currentUser?.image} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {currentUser?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 bg-violet-500 rounded-full text-white p-0.5 border-2 border-background shadow-sm">
                  <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                </div>
              </div>
              <span className="text-[11px] font-medium text-foreground">Add Story</span>
            </button>
          } />
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Create Story</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 mt-2">
              {!previewUrl ? (
                <div className="border-2 border-dashed border-border rounded-xl aspect-[9/16] max-h-[400px] flex flex-col items-center justify-center relative hover:bg-muted/50 transition-colors">
                  <Input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    onChange={handleFileChange}
                  />
                  <ImageIcon className="w-10 h-10 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium">Click to select image</p>
                  <p className="text-xs text-muted-foreground">Or drag and drop</p>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden aspect-[9/16] max-h-[400px] bg-black">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 rounded-full w-8 h-8 p-0"
                    onClick={() => setPreviewUrl(null)}
                  >
                    ×
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button variant="outline" size="sm" className="gap-2 text-xs h-8">
                      {visibility === 'public' ? <Globe className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                      {visibility === 'public' ? 'Public' : 'Private'}
                    </Button>
                  } />
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setVisibility('public')}>
                      <Globe className="w-4 h-4 mr-2" /> Public
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setVisibility('private')}>
                      <Users className="w-4 h-4 mr-2" /> Private
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button 
                  onClick={handleCreateSubmit} 
                  disabled={!previewUrl || isUploading}
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-full px-6 h-8 text-xs font-semibold"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
                  Share Story
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {stories.map((group, i) => (
          <button
            key={group.user.id}
            onClick={() => { setActiveGroup(i); setActiveStory(0); }}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
            <div className={`p-[2px] rounded-full ${group.hasUnviewed
                ? 'bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-pink-500'
                : 'bg-muted'
              } ${i === activeGroup ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-background' : ''}`}>
              <Avatar className="w-14 h-14 border-2 border-background">
                <AvatarImage src={group.user.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm">
                  {group.user.name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="text-[11px] text-muted-foreground truncate max-w-[64px]">{group.user.name}</span>
          </button>
        ))}
      </div>

      {/* Story Viewer */}
      {currentStory ? (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[600px] border border-border shadow-inner">
          {/* Progress bars */}
          <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
            {currentGroup.stories.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${i < activeStory ? 'w-full bg-white' : i === activeStory ? 'w-full bg-white animate-pulse' : 'w-0'}`} />
              </div>
            ))}
          </div>

          {/* Author */}
          <div className="absolute top-6 left-3 z-20 flex items-center justify-between right-3">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={currentGroup.user.avatar} />
                <AvatarFallback className="bg-violet-500 text-white text-xs">
                  {currentGroup.user.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-white text-sm font-medium drop-shadow">{currentGroup.user.name}</span>
            </div>

            {currentGroup.user.id === currentUser?.id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full text-white/70 hover:text-red-400 hover:bg-white/10"
                onClick={(e) => { e.stopPropagation(); handleDeleteStory(currentStory.id); }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Media */}
          <img
            src={currentStory.mediaUrl}
            alt="Story"
            className="w-full h-full object-contain"
          />

          {/* Navigation */}
          <button onClick={goPrev} className="absolute left-0 top-0 w-1/3 h-full z-10" />
          <button onClick={goNext} className="absolute right-0 top-0 w-2/3 h-full z-10" />
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-20 px-4 bg-muted/50 rounded-2xl border border-dashed border-border mt-10">
          <p className="text-lg font-semibold mb-2">No stories to view</p>
          <p className="text-muted-foreground text-sm">Create the first story above, or wait for others to post.</p>
        </div>
      ) : null}
    </div>
  );
}
