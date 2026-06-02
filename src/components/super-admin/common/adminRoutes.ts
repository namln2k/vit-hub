import type { AdminSectionId } from '@/components/super-admin/common/types';

interface AdminRouteItem {
  id: string;
  name: string;
}

const SUPER_ADMIN_BASE_PATH = '/super-admin';

export function getAdminSectionPath(sectionId: AdminSectionId) {
  return `${SUPER_ADMIN_BASE_PATH}/${sectionId}`;
}

export function getUsersSubsectionPath(view: 'list' | 'import') {
  return `${getAdminSectionPath('users')}?view=${view}`;
}

export function getAdminItemPath(sectionId: 'divisions' | 'groups', item: AdminRouteItem) {
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
