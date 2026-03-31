'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { signOut } from 'next-auth/react';
import { Moon, Sun, LogOut, Shield, Bell, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!confirm('Are you sure? This action cannot be undone.')) return;
    try {
      await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      toast.success('Account deleted');
      signOut({ callbackUrl: '/' });
    } catch { toast.error('Failed to delete account'); }
  };

  return (
    <div className="max-w-[500px] mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Settings</span>
      </h1>

      <div className="space-y-4">
        {/* Appearance */}
        <Card className="rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            {theme === 'dark' ? <Moon className="w-5 h-5 text-violet-400" /> : <Sun className="w-5 h-5 text-yellow-500" />}
            <Label className="font-semibold">Appearance</Label>
          </div>
          <div className="flex gap-2">
            <Button variant={theme === 'light' ? 'default' : 'outline'} size="sm" className="flex-1 rounded-xl" onClick={() => setTheme('light')}><Sun className="w-4 h-4 mr-1" />Light</Button>
            <Button variant={theme === 'dark' ? 'default' : 'outline'} size="sm" className="flex-1 rounded-xl" onClick={() => setTheme('dark')}><Moon className="w-4 h-4 mr-1" />Dark</Button>
          </div>
        </Card>

        {/* Privacy */}
        <Card className="rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-5 h-5 text-violet-400" />
            <Label className="font-semibold">Privacy</Label>
          </div>
          <p className="text-sm text-muted-foreground">Manage who can see your profile and posts. Visit Edit Profile to change your privacy setting.</p>
        </Card>

        {/* Notifications */}
        <Card className="rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Bell className="w-5 h-5 text-violet-400" />
            <Label className="font-semibold">Notification Preferences</Label>
          </div>
          <p className="text-sm text-muted-foreground">Notification preferences coming soon. You will be able to toggle individual notification types.</p>
        </Card>

        <Separator />

        {/* Danger Zone */}
        <Card className="rounded-2xl p-4 border-red-500/20">
          <div className="flex items-center gap-3 mb-3">
            <Trash2 className="w-5 h-5 text-red-400" />
            <Label className="font-semibold text-red-400">Danger Zone</Label>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Permanently delete your account and all data.</p>
          <Button variant="outline" size="sm" className="rounded-xl text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={handleDeleteAccount}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete Account
          </Button>
        </Card>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full rounded-xl gap-2"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          <LogOut className="w-4 h-4" /> Log Out
        </Button>
      </div>
    </div>
  );
}
