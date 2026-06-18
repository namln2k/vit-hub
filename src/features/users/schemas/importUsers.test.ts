import { describe, expect, it } from 'vitest';
import { importUsersSchema, MAX_IMPORT_USERS } from './importUsers';

describe('importUsersSchema', () => {
  it('normalizes trusted import adapter fields', () => {
    expect(
      importUsersSchema.parse({
        users: [
          {
            email: ' Member@Example.com ',
            firstName: ' An ',
            lastName: ' Nguyen ',
            middleName: ' Van ',
            phoneNumber: ' 090 000 0000 ',
            schoolName: ' VIT ',
            enterYear: ' 2024 ',
            cohort: ' K1 ',
            gender: null,
          },
        ],
      }),
    ).toEqual({
      users: [
        {
          email: 'member@example.com',
          firstName: 'An',
          lastName: 'Nguyen',
          middleName: 'Van',
          phoneNumber: '0900000000',
          schoolName: 'VIT',
          enterYear: '2024',
          cohort: 'K1',
          gender: null,
        },
      ],
    });
  });

  it('rejects empty and oversized import batches', () => {
    expect(importUsersSchema.safeParse({ users: [] }).success).toBe(false);
    expect(
      importUsersSchema.safeParse({
        users: Array.from({ length: MAX_IMPORT_USERS + 1 }, () => ({})),
      }).success,
    ).toBe(false);
  });
});
