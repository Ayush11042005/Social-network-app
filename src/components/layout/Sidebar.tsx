'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  Home,
  Compass,
  MessageCircle,
  Bell,
  Users,
  Settings,
  PlusSquare,
  Search,
  BookOpen,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { signOut } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { CreatePost } from '@/components/feed/CreatePost';

const navItems = [
  { href: '/feed', label: 'Home', icon: Home },
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/stories', label: 'Stories', icon: BookOpen },
  { href: '/groups', label: 'Groups', icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-[72px] xl:w-[240px] border-r border-border bg-card z-40 transition-all duration-200">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 xl:px-6">
        <Link href="/feed" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
            N
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent hidden xl:block">
            Nexus
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                'flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 text-violet-400'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <item.icon
                className={cn(
                  'w-6 h-6 shrink-0 transition-transform group-hover:scale-110',
                  isActive && 'text-violet-400'
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="hidden xl:block">{item.label}</span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 ml-auto hidden xl:block" />
              )}
            </Link>
          );
        })}

        {/* Create Post Modal */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={
            <Button
              variant="default"
              className="flex items-center gap-4 px-3 py-3 h-auto rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white mt-2 justify-start xl:justify-start"
              title="Create Post"
            >
              <PlusSquare className="w-6 h-6 shrink-0" />
              <span className="hidden xl:block">Create Post</span>
            </Button>
          } />
          <DialogContent className="sm:max-w-[500px] p-0 border-none bg-transparent shadow-none" showCloseButton={false}>
            <DialogTitle className="sr-only">Create Post</DialogTitle>
            <CreatePost onPostCreated={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border px-3 py-3 space-y-1">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={mounted && theme === 'dark' ? 'Light mode' : 'Dark mode'}
          className="flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 w-full"
        >
          {mounted && theme === 'dark' ? (
            <Sun className="w-6 h-6 shrink-0" />
          ) : (
            <Moon className="w-6 h-6 shrink-0" />
          )}
          <span className="hidden xl:block">
            {mounted && theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </span>
        </button>

        {/* Profile */}
        {user && (
          <Link
            href={`/profile/${user.username}`}
            title="Profile"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-muted',
              pathname.includes('/profile') && 'bg-muted'
            )}
          >
            <Avatar className="w-8 h-8 shrink-0 ring-2 ring-violet-500/30">
              <AvatarImage src={user.image} alt={user.name} />
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs">
                {user.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden xl:block min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
            </div>
          </Link>
        )}

        {/* Settings & Logout */}
        <div className="flex items-center gap-1 xl:gap-2">
          <Link
            href="/settings"
            title="Settings"
            className="flex items-center gap-4 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all w-full"
          >
            <Settings className="w-5 h-5 shrink-0" />
            <span className="hidden xl:block text-sm">Settings</span>
          </Link>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          title="Log out"
          className="flex items-center gap-4 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="hidden xl:block text-sm">Log out</span>
        </button>
      </div>
    </aside>
  );
}
