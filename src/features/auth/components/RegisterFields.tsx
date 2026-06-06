import PasswordInput from '@/shared/form/PasswordInput';
import type { RegisterFormData } from '@/features/auth/lib/registerForm';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface RegisterFieldsProps {
  errors: FieldErrors<RegisterFormData>;
  register: UseFormRegister<RegisterFormData>;
}

interface AuthFieldShellProps {
  children: ReactNode;
  error?: string;
  label: string;
  required?: boolean;
}

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm';
const PASSWORD_INPUT_CLASS =
  'w-full py-2 pl-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm';

function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-red-500">
      *
    </span>
  );
}

function AuthFieldShell({ children, error, label, required = false }: AuthFieldShellProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <RequiredMark />}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function textInputProps(
  props: InputHTMLAttributes<HTMLInputElement>,
): InputHTMLAttributes<HTMLInputElement> {
  return {
    className: INPUT_CLASS,
    ...props,
  };
}

export default function RegisterFields({ errors, register }: RegisterFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <AuthFieldShell error={errors.lastName?.message} label="Họ" required>
          <input {...register('lastName')} {...textInputProps({ placeholder: 'Nguyễn' })} />
        </AuthFieldShell>
        <AuthFieldShell label="Tên đệm">
          <input {...register('middleName')} {...textInputProps({ placeholder: 'Văn' })} />
        </AuthFieldShell>
        <AuthFieldShell error={errors.firstName?.message} label="Tên" required>
          <input {...register('firstName')} {...textInputProps({ placeholder: 'An' })} />
        </AuthFieldShell>
      </div>

      <AuthFieldShell label="Nickname">
        <input {...register('nickname')} {...textInputProps({ placeholder: 'Nickname' })} />
      </AuthFieldShell>

      <AuthFieldShell error={errors.username?.message} label="Username" required>
        <input {...register('username')} {...textInputProps({ placeholder: 'nguyenvanan' })} />
      </AuthFieldShell>

      <AuthFieldShell error={errors.email?.message} label="Email" required>
        <input
          {...register('email')}
          {...textInputProps({ placeholder: 'email@example.com', type: 'email' })}
        />
      </AuthFieldShell>

      <AuthFieldShell error={errors.password?.message} label="Mật khẩu" required>
        <PasswordInput
          {...register('password')}
          className={PASSWORD_INPUT_CLASS}
          placeholder="Ít nhất 8 ký tự"
        />
      </AuthFieldShell>
    </>
  );
}
