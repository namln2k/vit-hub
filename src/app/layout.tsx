import Providers from '@/app/providers';
import Header from '@/shared/layout/Header';
import { getWebAuthIdentity } from '@/server/auth/actor';
import { getCurrentUserProfile } from '@/server/services/users/profile';
import type { AuthIdentity } from '@/server/services/auth/identity';
import type { UserSummaryDto } from '@/features/users/types';
import '@/app/globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'VIT Hub',
  description: 'VIT Hub community portal',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const identity = await getWebAuthIdentity();
  const initialAppUser = identity ? await loadInitialAppUser(identity) : null;
  const initialCurrentUser = identity
    ? {
        id: identity.actor.userId,
        uid: identity.actor.userId,
        email: identity.email || null,
        displayName:
          getMetadataString(identity.metadata, 'full_name') ||
          getMetadataString(identity.metadata, 'name') ||
          null,
        photoURL: getMetadataString(identity.metadata, 'avatar_url') || null,
      }
    : null;

  return (
    <html lang="en">
      <body>
        <Providers initialAppUser={initialAppUser} initialCurrentUser={initialCurrentUser}>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}

async function loadInitialAppUser(identity: AuthIdentity): Promise<UserSummaryDto | null> {
  try {
    return await getCurrentUserProfile(identity);
  } catch (error) {
    console.error('Failed to load the initial application profile.', error);
    return null;
  }
}

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === 'string' ? value : '';
}
