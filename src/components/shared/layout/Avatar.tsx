import defaultAvatar from '@/assets/default-avatar.webp';
import { useState, type ImgHTMLAttributes } from 'react';

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

function isUsableImageSrc(src?: string | null): src is string {
  if (!src) {
    return false;
  }

  if (src.startsWith('/') || src.startsWith('blob:') || src.startsWith('data:')) {
    return true;
  }

  try {
    const url = new URL(src);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function Avatar({
  src,
  size = 'sm',
  className = '',
  alt = '',
  onError,
  ...props
}: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageSrc = isUsableImageSrc(src) && src !== failedSrc ? src : defaultAvatar;

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${sizeClasses[size]} rounded-full object-cover border border-gray-200 ${className}`.trim()}
      referrerPolicy="no-referrer"
      {...props}
      onError={(event) => {
        if (imageSrc !== defaultAvatar) {
          setFailedSrc(imageSrc);
        }

        onError?.(event);
      }}
    />
  );
}
