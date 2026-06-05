'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'sonner';
import type { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster richColors position="top-right" toastOptions={{ duration: 3500 }} />
    </AuthProvider>
  );
}
