'use client';

import { deleteAvatar, uploadAvatar } from '@/services/avatarUpload';
import { getUser, upsertUser, usernameExists } from '@/services/users';
import { supabase } from '@/services/supabase';
import {
  AuthContext,
  type AuthContextType,
  type AuthUser,
  type SignUpData,
  type AppUser,
  type UpdateUserNameData,
  type UpdateUserNicknameData,
  type UpdateUserPersonnelData,
} from './auth';
import type { Session, User } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

function getStringMetadata(user: User, key: string) {
  const value = user.user_metadata[key];
  return typeof value === 'string' ? value : '';
}

function mapSupabaseUser(user: User): AuthUser {
  return {
    id: user.id,
    uid: user.id,
    email: user.email ?? null,
    displayName: getStringMetadata(user, 'full_name') || getStringMetadata(user, 'name') || null,
    photoURL: getStringMetadata(user, 'avatar_url') || null,
  };
}

function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';

  if (/invalid login credentials/i.test(message)) {
    return 'Email hoặc mật khẩu không chính xác. Nếu bạn đã đăng ký bằng Google, vui lòng đăng nhập bằng Google hoặc dùng Quên mật khẩu.';
  }

  if (/user already registered|already registered/i.test(message)) {
    return 'Email đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.';
  }

  if (/email not confirmed/i.test(message)) {
    return 'Please verify your email before signing in';
  }

  if (/error sending confirmation email/i.test(message)) {
    return 'Không thể gửi email xác nhận. Vui lòng kiểm tra cấu hình SMTP trong Supabase Auth.';
  }

  return message || 'Không thể xử lý yêu cầu xác thực.';
}

function getAppOrigin() {
  return window.location.origin.replace(/\/$/, '');
}

function getAuthRedirectUrl(path: string) {
  return `${getAppOrigin()}${path}`;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const [, dataBase64 = ''] = result.split(',');

      if (!dataBase64) {
        reject(new Error('Không thể đọc ảnh đại diện.'));
        return;
      }

      resolve(dataBase64);
    };
    reader.onerror = () => reject(new Error('Không thể đọc ảnh đại diện.'));
    reader.readAsDataURL(file);
  });
}

function getUserNameParts(displayName: string | null, email: string) {
  const nameParts = displayName?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (nameParts.length === 0) {
    return {
      firstName: email.split('@')[0] || 'User',
      middleName: '',
      lastName: '',
    };
  }

  if (nameParts.length === 1) {
    return {
      firstName: nameParts[0],
      middleName: '',
      lastName: '',
    };
  }

  return {
    firstName: nameParts[nameParts.length - 1],
    middleName: nameParts.slice(1, -1).join(' '),
    lastName: nameParts[0],
  };
}

async function createUniqueUsername(email: string): Promise<string> {
  const fallback = `user${Date.now().toString(36)}`;
  const baseUsername =
    email
      .split('@')[0]
      ?.toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 20) || fallback;

  let username =
    baseUsername.length >= 3 ? baseUsername : `${baseUsername}${fallback}`.slice(0, 20);
  let suffix = 1;

  while (await usernameExists(username)) {
    const suffixText = suffix.toString();
    username = `${baseUsername.slice(0, 20 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  return username;
}

async function createAppUserFromAuthUser(user: User): Promise<AppUser> {
  const email = user.email ?? '';
  const displayName =
    getStringMetadata(user, 'full_name') || getStringMetadata(user, 'name') || null;
  const userNameParts = getUserNameParts(displayName, email);
  const username = getStringMetadata(user, 'username') || (await createUniqueUsername(email));
  const appUser: AppUser = {
    uid: user.id,
    email,
    firstName: getStringMetadata(user, 'first_name') || userNameParts.firstName,
    lastName: getStringMetadata(user, 'last_name') || userNameParts.lastName,
    middleName: getStringMetadata(user, 'middle_name') || userNameParts.middleName,
    nickname: getStringMetadata(user, 'nickname'),
    username,
    phoneNumber: '-',
    schoolName: '',
    enterYear: '',
    cohort: '',
    gender: null,
    avatarUrl: getStringMetadata(user, 'avatar_url'),
    avatarKey: getStringMetadata(user, 'avatar_key'),
    role: 'member',
  };

  return upsertUser(appUser);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(false);

  const loadAppUser = useCallback(async (user: User) => {
    return (await getUser(user.id)) ?? (await createAppUserFromAuthUser(user));
  }, []);

  const applySession = useCallback(async (session: Session | null) => {
    if (!isMountedRef.current) {
      return;
    }

    const user = session?.user ?? null;

    if (!user) {
      setCurrentUser(null);
      setAppUser(null);
      return;
    }

    setCurrentUser(mapSupabaseUser(user));

    try {
      const loadedUser = await loadAppUser(user);

      if (isMountedRef.current) {
        setAppUser(loadedUser);
      }
    } catch (error) {
      console.error('Failed to load app user for authenticated session.', error);

      if (isMountedRef.current) {
        setAppUser(null);
      }
    }
  }, [loadAppUser]);

  useEffect(() => {
    isMountedRef.current = true;

    async function initializeAuth() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!isMountedRef.current) {
        return;
      }

      if (error) {
        setCurrentUser(null);
        setAppUser(null);
      } else {
        await applySession(session);
      }

      if (isMountedRef.current) {
        setLoading(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    void initializeAuth();

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signUp = useCallback(async (data: SignUpData) => {
    const avatar = data.avatarFile
      ? {
          contentType: data.avatarFile.type,
          dataBase64: await readFileAsBase64(data.avatarFile),
          size: data.avatarFile.size,
        }
      : null;
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        emailRedirectTo: getAuthRedirectUrl('/login'),
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        nickname: data.nickname,
        username: data.username,
        avatar,
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error ?? 'Không thể đăng ký tài khoản.');
    }

    if (result.session?.access_token && result.session?.refresh_token) {
      const {
        data: { session },
        error,
      } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });

      if (error) {
        throw new Error(getAuthErrorMessage(error));
      }

      await applySession(session);
    }

    return { needsEmailConfirmation: Boolean(result.needsEmailConfirmation) };
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          prompt: 'select_account',
        },
        redirectTo: getAuthRedirectUrl('/auth/callback'),
      },
    });

    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthRedirectUrl('/login'),
    });

    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, []);

  const updateUserPassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      throw new Error('Bạn cần đăng nhập lại trước khi đổi mật khẩu.');
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      throw new Error('Mật khẩu hiện tại không chính xác.');
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, []);

  const updateUserAvatar = useCallback(async (avatarFile: File) => {
    if (!currentUser || !appUser) {
      throw new Error('Bạn cần đăng nhập trước khi cập nhật ảnh đại diện.');
    }

    const previousAvatarKey = appUser.avatarKey;
    const avatar = await uploadAvatar(avatarFile);
    const nextAppUser = await upsertUser({
      ...appUser,
      avatarUrl: avatar.avatarUrl,
      avatarKey: avatar.avatarKey,
    });

    const { error } = await supabase.auth.updateUser({
      data: {
        avatar_key: avatar.avatarKey,
        avatar_url: avatar.avatarUrl,
      },
    });

    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }

    setAppUser(nextAppUser);

    if (previousAvatarKey) {
      try {
        await deleteAvatar(previousAvatarKey);
      } catch {
        // The user row already points at the new avatar; stale object cleanup can be retried manually.
      }
    }
  }, [appUser, currentUser]);

  const updateUserName = useCallback(async (data: UpdateUserNameData) => {
    if (!currentUser || !appUser) {
      throw new Error('Bạn cần đăng nhập trước khi cập nhật họ và tên.');
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
        middle_name: data.middleName,
      },
    });

    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }

    const nextAppUser = await upsertUser({
      ...appUser,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName,
    });

    setAppUser(nextAppUser);
  }, [appUser, currentUser]);

  const updateUserNickname = useCallback(async (data: UpdateUserNicknameData) => {
    if (!currentUser || !appUser) {
      throw new Error('Bạn cần đăng nhập trước khi cập nhật Nickname.');
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        nickname: data.nickname,
      },
    });

    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }

    const nextAppUser = await upsertUser({
      ...appUser,
      nickname: data.nickname,
    });

    setAppUser(nextAppUser);
  }, [appUser, currentUser]);

  const updateUserPersonnel = useCallback(async (data: UpdateUserPersonnelData) => {
    if (!currentUser || !appUser) {
      throw new Error('Bạn cần đăng nhập trước khi cập nhật thông tin nhân sự.');
    }

    const nextAppUser = await upsertUser({
      ...appUser,
      phoneNumber: data.phoneNumber || '-',
      schoolName: data.schoolName,
      cohort: data.cohort,
      enterYear: data.enterYear,
      gender: data.gender,
    });

    setAppUser(nextAppUser);
  }, [appUser, currentUser]);

  const value: AuthContextType = useMemo(
    () => ({
      currentUser,
      appUser,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
      updateUserPassword,
      updateUserAvatar,
      updateUserName,
      updateUserNickname,
      updateUserPersonnel,
    }),
    [
      currentUser,
      appUser,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
      updateUserPassword,
      updateUserAvatar,
      updateUserName,
      updateUserNickname,
      updateUserPersonnel,
    ],
  );

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
