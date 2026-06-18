import { APP_ROUTES } from '@/constants/routes';
import type { AdminSectionId } from '@/features/super-admin/types';

interface AdminRouteItem {
  id: string;
  name: string;
}

export function getAdminSectionPath(sectionId: AdminSectionId) {
  return `${APP_ROUTES.superAdmin}/${sectionId}`;
}

export function getUsersSubsectionPath(view: 'list' | 'import') {
  return `${getAdminSectionPath('users')}?view=${view}`;
}

export function getPostsSubsectionPath(view: 'editor' | 'featured') {
  return `${getAdminSectionPath('posts')}?view=${view}`;
}

export function getAdminItemPath(
  sectionId: 'divisions' | 'groups' | 'clubs',
  item: AdminRouteItem,
) {
  return `${getAdminSectionPath(sectionId)}/${getAdminItemSlug(item)}`;
}

export function getAdminItemSlug(item: AdminRouteItem) {
  const nameSlug = slugify(item.name);

  return nameSlug ? `${nameSlug}-${item.id}` : item.id;
}

export function findAdminItemBySlug<TItem extends AdminRouteItem>(
  items: TItem[],
  slug: string | undefined,
) {
  if (!slug) {
    return null;
  }

  const decodedSlug = decodeURIComponent(slug);

  return (
    items.find((item) => item.id === decodedSlug || getAdminItemSlug(item) === decodedSlug) ?? null
  );
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
