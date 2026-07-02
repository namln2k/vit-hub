import { getPublicUserProfilePath } from '@/constants/routes';
import PublicUserProfilePage from '@/screens/PublicUserProfilePage';
import { getWebAuthIdentity } from '@/server/auth/actor';
import { getPublicUserProfileByUsername } from '@/server/services/users/publicProfile';
import { notFound, redirect } from 'next/navigation';

interface PublicUserProfileRouteProps {
  params: Promise<{
    username: string;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function PublicUserProfileRoute({ params }: PublicUserProfileRouteProps) {
  const { username } = await params;
  const user = await getPublicUserProfileByUsername(username);

  if (!user) {
    notFound();
  }

  if (user.username !== username) {
    redirect(getPublicUserProfilePath(user.username));
  }

  const identity = await getWebAuthIdentity();

  return <PublicUserProfilePage user={user} isSelf={identity?.actor.userId === user.uid} />;
}
