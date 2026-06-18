import { describe, expect, it } from 'vitest';
import { searchUsersSchema } from './searchUsers';

describe('searchUsersSchema', () => {
  it('normalizes valid pagination input', () => {
    expect(
      searchUsersSchema.parse({
        search: '  member  ',
        limit: 12,
        offset: 0,
      }),
    ).toEqual({
      search: 'member',
      limit: 12,
      offset: 0,
    });
  });

  it('rejects oversized pages and invalid emails', () => {
    const result = searchUsersSchema.safeParse({
      emails: ['invalid'],
      limit: 101,
    });

    expect(result.success).toBe(false);
  });
});
