import SuperAdminPage from '@/screens/SuperAdminPage';
import { requireWebActor } from '@/server/auth/actor';
import { listUsersForAdministration } from '@/server/services/users/searchUsers';
import { getPostAdministrationData } from '@/server/services/posts/posts';

export default async function SuperAdminSectionRoute({
  params,
}: {
  params: Promise<{ section: string; segments?: string[] }>;
}) {
  const { section } = await params;
  const actor = section === 'users' || section === 'posts' ? await requireWebActor() : null;
  const initialUsers =
    section === 'users' && actor ? await listUsersForAdministration(actor) : undefined;
  const initialPostData =
    section === 'posts' && actor ? await getPostAdministrationData(actor) : undefined;

  return <SuperAdminPage initialUsers={initialUsers} initialPostData={initialPostData} />;
}
