import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState, type InputHTMLAttributes } from 'react';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className = '', disabled, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const label = isVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu';

    return (
      <div className="relative">
        <input
          ref={ref}
          type={isVisible ? 'text' : 'password'}
          disabled={disabled}
          className={className}
          {...props}
        />
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          disabled={disabled}
          aria-label={label}
          title={label}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
