import { queryUsers } from '@/api/users';
import Avatar from '@/components/layout/Avatar';
import { useAuth } from '@/contexts/useAuth';
import type { AppUser } from '@/contexts/auth';
import { Loader2, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface UserSearchProps {
  variant?: 'light' | 'dark';
}

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function getFullName(user: AppUser) {
  return `${user.lastName} ${user.middleName} ${user.firstName}`.trim();
}

export default function UserSearch({ variant = 'light' }: UserSearchProps) {
  const { currentUser } = useAuth();
  const [searchValue, setSearchValue] = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const queryText = normalizeSearchValue(searchValue);

  const results = useMemo(() => {
    if (queryText.length < 2) {
      return [];
    }

    return users
      .filter(
        (user) =>
          user.uid !== currentUser?.uid &&
          [user.username, user.email, user.firstName, user.lastName, user.nickname].some((value) =>
            normalizeSearchValue(value).includes(queryText),
          ),
      )
      .slice(0, 6);
  }, [currentUser?.uid, queryText, users]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsFocused(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (queryText.length < 2) {
      setError('');
      setIsLoading(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setError('');

      try {
        setUsers(await queryUsers({ search: queryText, limit: 12 }));
      } catch {
        setError('Không thể tìm kiếm thành viên lúc này.');
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [queryText]);

  const showPanel = isFocused && queryText.length >= 2;
  const inputClassName =
    variant === 'dark'
      ? 'border-white/25 bg-white/15 text-white placeholder:text-white/70 focus:border-cyan-200 focus:bg-white/20 focus:ring-cyan-200/40'
      : 'border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:border-indigo-300 focus:bg-white focus:ring-indigo-100';

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Tìm thành viên khác theo username, email, tên, nickname..."
          aria-label="Tìm kiếm thành viên"
          className={`h-10 w-full rounded-full border py-2 pl-9 pr-10 text-sm font-medium outline-none transition-colors focus:ring-4 ${inputClassName}`}
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        ) : searchValue ? (
          <button
            type="button"
            onClick={() => {
              setSearchValue('');
              setError('');
            }}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Xóa tìm kiếm"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {error ? (
            <p className="px-4 py-3 text-sm text-red-600">{error}</p>
          ) : results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto py-1">
              {results.map((user) => (
                <div
                  key={user.uid}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50"
                >
                  <Avatar src={user.avatarUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {getFullName(user)}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      @{user.username} · {user.nickname ? `${user.nickname} · ` : ''}
                      {user.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : isLoading ? (
            <p className="px-4 py-3 text-sm text-slate-500">Đang tìm kiếm...</p>
          ) : (
            <p className="px-4 py-3 text-sm text-slate-500">Không tìm thấy thành viên phù hợp.</p>
          )}
        </div>
      )}
    </div>
  );
}
