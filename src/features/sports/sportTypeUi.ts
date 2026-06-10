import badmintonIcon from '@/assets/icons/badminton.webp';
import pickleballIcon from '@/assets/icons/pickleball.webp';
import swimmingIcon from '@/assets/icons/swimming.webp';
import type { StaticImageData } from 'next/image';
import type { SportType } from '@/features/sports/types';

type SportTypeTheme = {
  badge: string;
  border: string;
  icon: string;
  hover: string;
};

export const SPORT_TYPE_THEMES: Record<SportType, SportTypeTheme> = {
  badminton: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    border: 'border-emerald-200',
    icon: 'text-emerald-600',
    hover: 'hover:text-emerald-700',
  },
  pickleball: {
    badge: 'border-violet-200 bg-violet-50 text-violet-700',
    border: 'border-violet-200',
    icon: 'text-violet-600',
    hover: 'hover:text-violet-700',
  },
  swimming: {
    badge: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    border: 'border-cyan-200',
    icon: 'text-cyan-600',
    hover: 'hover:text-cyan-700',
  },
};

export const SPORT_TYPE_ICON_THEMES = ['emerald', 'violet', 'cyan', 'amber', 'rose'] as const;

export const SPORT_TYPE_ICONS: Record<SportType, StaticImageData> = {
  badminton: badmintonIcon,
  pickleball: pickleballIcon,
  swimming: swimmingIcon,
};
