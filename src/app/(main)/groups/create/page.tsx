'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Globe, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateGroupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', description: '', privacy: 'public' as 'public' | 'private' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Group name is required'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Group created!');
        router.push(`/groups/${data.data.id}`);
      }
    } catch { toast.error('Failed to create group'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="max-w-[500px] mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Create Group</span>
      </h1>
      <Card className="rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Group Name</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="mt-1.5 rounded-xl" required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="mt-1.5 rounded-xl" rows={3} />
          </div>
          <div>
            <Label>Privacy</Label>
            <div className="flex gap-3 mt-1.5">
              <Button type="button" variant={form.privacy === 'public' ? 'default' : 'outline'} className="flex-1 rounded-xl gap-2" onClick={() => setForm((p) => ({ ...p, privacy: 'public' }))}>
                <Globe className="w-4 h-4" /> Public
              </Button>
              <Button type="button" variant={form.privacy === 'private' ? 'default' : 'outline'} className="flex-1 rounded-xl gap-2" onClick={() => setForm((p) => ({ ...p, privacy: 'private' }))}>
                <Lock className="w-4 h-4" /> Private
              </Button>
            </div>
          </div>
          <Button type="submit" disabled={isLoading} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create Group
          </Button>
        </form>
      </Card>
    </div>
  );
}
