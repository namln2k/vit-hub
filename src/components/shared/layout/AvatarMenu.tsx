import Avatar from '@/components/shared/layout/Avatar';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AvatarMenuItem {
  label: string;
  icon?: ReactNode;
  to?: string;
  onClick?: () => void | Promise<void>;
  danger?: boolean;
}

interface AvatarMenuProps {
  avatarSrc?: string | null;
  label: string;
  items: AvatarMenuItem[];
  avatarSize?: 'sm' | 'md' | 'lg';
  buttonClassName?: string;
  avatarClassName?: string;
  children?: ReactNode;
}

export default function AvatarMenu({
  avatarSrc,
  label,
  items,
  avatarSize = 'sm',
  buttonClassName = '',
  avatarClassName = '',
  children,
}: AvatarMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  async function handleItemClick(item: AvatarMenuItem) {
    setIsOpen(false);
    await item.onClick?.();
  }

  const baseItemClassName =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors';

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={buttonClassName}
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Avatar src={avatarSrc} size={avatarSize} className={avatarClassName} />
        {children}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-30 mt-2 min-w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          role="menu"
        >
          {items.map((item) => {
            const itemClassName = `${baseItemClassName} ${
              item.danger
                ? 'text-red-600 hover:bg-red-50'
                : 'text-slate-700 hover:bg-slate-50'
            }`;

            if (item.to) {
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={itemClassName}
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                className={itemClassName}
                role="menuitem"
                onClick={() => void handleItemClick(item)}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
