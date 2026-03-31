'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  username: string;
  verified: boolean;
}

export function useAuth() {
  const { data: session, status, update } = useSession();

  const user = useMemo<AuthUser | null>(() => {
    if (!session?.user) return null;
    const u = session.user as Record<string, unknown>;
    return {
      id: u.id as string,
      email: u.email as string,
      name: u.name as string,
      image: u.image as string | undefined,
      username: u.username as string,
      verified: u.verified as boolean,
    };
  }, [session]);

  return {
    user,
    session,
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    update,
  };
}
