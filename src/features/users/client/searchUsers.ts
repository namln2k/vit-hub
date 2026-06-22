'use client';

import { searchUsersAction } from '@/actions/users';
import type { SearchUsersInput, UserSearchResultDto } from '@/features/users/types';

export async function searchUsers(input: SearchUsersInput = {}): Promise<UserSearchResultDto[]> {
  const result = await searchUsersAction(input);

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data.items;
}
