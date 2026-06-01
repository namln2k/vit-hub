import defaultAvatar from '@/assets/default-avatar.png';
import type { ImgHTMLAttributes } from 'react';

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-20 w-20',
} as const;

type AvatarSize = keyof typeof sizeClasses;

interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  size?: AvatarSize;
}

export default function Avatar({ src, size = 'sm', className = '', alt = '', ...props }: AvatarProps) {
  return (
    <img
      src={src || defaultAvatar}
      alt={alt}
      className={`${sizeClasses[size]} rounded-full object-cover border border-gray-200 ${className}`.trim()}
      referrerPolicy="no-referrer"
      {...props}
    />
  );
}
