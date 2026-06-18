import { describe, expect, it } from 'vitest';
import { registerSchema } from './register';

describe('registerSchema', () => {
  it('trims registration profile fields and defaults optional names', () => {
    expect(
      registerSchema.parse({
        email: ' member@example.com ',
        password: 'password123',
        firstName: ' An ',
        lastName: ' Nguyen ',
        username: ' member_one ',
      }),
    ).toEqual({
      email: 'member@example.com',
      password: 'password123',
      firstName: 'An',
      lastName: 'Nguyen',
      middleName: '',
      nickname: '',
      username: 'member_one',
    });
  });

  it('rejects invalid email, password, and username input', () => {
    const result = registerSchema.safeParse({
      email: 'invalid',
      password: 'short',
      firstName: '',
      lastName: '',
      username: 'bad username!',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toMatchObject({
        email: ['Email không hợp lệ'],
        password: ['Mật khẩu phải có ít nhất 8 ký tự'],
        firstName: ['Tên không được để trống'],
        lastName: ['Họ không được để trống'],
        username: ['Username chỉ được chứa chữ cái, số và dấu gạch dưới'],
      });
    }
  });
});
