'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import type { AppUser, AuthUser } from '@/contexts/auth';
import { Toaster } from 'sonner';
import type { ReactNode } from 'react';

export default function Providers({
  children,
  initialAppUser,
  initialCurrentUser,
}: {
  children: ReactNode;
  initialAppUser: AppUser | null;
  initialCurrentUser: AuthUser | null;
}) {
  return (
    <AuthProvider initialAppUser={initialAppUser} initialCurrentUser={initialCurrentUser}>
      {children}
      <Toaster richColors position="top-right" toastOptions={{ duration: 3500 }} />
    </AuthProvider>
  );
}
