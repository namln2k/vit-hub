import { describe, expect, it } from 'vitest';
import { changeUserStatusSchema } from './changeUserStatus';

describe('changeUserStatusSchema', () => {
  it('accepts a valid user status mutation', () => {
    expect(
      changeUserStatusSchema.parse({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'disabled',
      }),
    ).toEqual({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'disabled',
    });
  });

  it('returns field errors for invalid adapter input', () => {
    const result = changeUserStatusSchema.safeParse({
      userId: 'not-a-uuid',
      status: 'deleted',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toEqual({
        userId: ['Mã nhân sự không hợp lệ.'],
        status: ['Trạng thái nhân sự không hợp lệ.'],
      });
    }
  });
});
