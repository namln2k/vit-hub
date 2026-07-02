import { describe, expect, it } from 'vitest';
import {
  getCaptainActionLabel,
  getCaptainActionMode,
} from '@/features/super-admin/components/organization-role/organizationRoleUtils';
import type { OrganizationRoleAssignmentDetail } from '@/services/organizationAdmin';

describe('organization role utils', () => {
  it('uses initial assignment mode when there is no current captain', () => {
    expect(getCaptainActionMode(null)).toBe('assign_initial');
    expect(getCaptainActionLabel('assign_initial')).toBe('Bổ nhiệm Đội trưởng');
  });

  it('uses transfer mode when a current captain exists', () => {
    const currentCaptain = {} as OrganizationRoleAssignmentDetail;

    expect(getCaptainActionMode(currentCaptain)).toBe('transfer');
    expect(getCaptainActionLabel('transfer')).toBe('Chuyển giao Đội trưởng');
  });
});
