import { describe, expect, it } from 'vitest';
import {
  setCurrentUserAvatarSchema,
  updateCurrentUserNameSchema,
  updateCurrentUserPersonnelSchema,
} from './profile';

describe('profile schemas', () => {
  it('trims profile names at the web adapter boundary', () => {
    expect(
      updateCurrentUserNameSchema.parse({
        firstName: '  An ',
        lastName: ' Nguyen  ',
        middleName: ' Van ',
      }),
    ).toEqual({
      firstName: 'An',
      lastName: 'Nguyen',
      middleName: 'Van',
    });
  });

  it('normalizes an empty phone number to the persisted placeholder', () => {
    expect(
      updateCurrentUserPersonnelSchema.parse({
        phoneNumber: '  ',
        schoolName: ' VIT ',
        cohort: ' K1 ',
        enterYear: ' 2024 ',
        gender: null,
      }),
    ).toEqual({
      phoneNumber: '-',
      schoolName: 'VIT',
      cohort: 'K1',
      enterYear: '2024',
      gender: null,
    });
  });

  it('rejects invalid avatar adapter input', () => {
    const result = setCurrentUserAvatarSchema.safeParse({
      avatarUrl: 'not-a-url',
      avatarKey: ' ',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toEqual({
        avatarUrl: ['URL ảnh đại diện không hợp lệ.'],
        avatarKey: ['Avatar key không hợp lệ.'],
      });
    }
  });
});
