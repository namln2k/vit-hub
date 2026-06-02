import type { AppUser } from '@/contexts/auth';

export function getGenderLabel(gender: AppUser['gender']) {
  if (gender === 0) {
    return 'Nữ';
  }

  if (gender === 1) {
    return 'Nam';
  }

  return 'Khác';
}

export function formatBytes(bytes: number) {
  const megabytes = bytes / 1024 / 1024;

  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
}
