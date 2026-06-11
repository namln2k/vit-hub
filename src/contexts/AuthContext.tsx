'use client';

import { loadOrCreateAppUser, mapSupabaseUser } from '@/features/auth/lib/authUserSession';
import { API_ROUTES, APP_ROUTES, withRouteQuery } from '@/constants/routes';
import { deleteAvatar, uploadAvatar } from '@/services/avatarUpload';
import { upsertUser } from '@/services/users';
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
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

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

  if (/unsupported provider|provider is not enabled/i.test(message)) {
    return 'Google login chưa được bật trong Supabase Auth. Vui lòng kiểm tra cấu hình provider Google.';
  }

  return message || 'Không thể xử lý yêu cầu xác thực.';
}

function getAppOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;
  const origin = configuredOrigin || window.location.origin;

  return origin.replace(/\/$/, '');
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(false);

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
      const loadedUser = await loadOrCreateAppUser(user);

      if (isMountedRef.current) {
        setAppUser(loadedUser);
      }
    } catch (error) {
      console.error('Failed to load app user for authenticated session.', error);

      if (isMountedRef.current) {
        setAppUser(null);
      }
    }
  }, []);

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

  const signUp = useCallback(
    async (data: SignUpData) => {
      const avatar = data.avatarFile
        ? {
            contentType: data.avatarFile.type,
            dataBase64: await readFileAsBase64(data.avatarFile),
            size: data.avatarFile.size,
          }
        : null;
      const response = await fetch(API_ROUTES.authRegister, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          emailRedirectTo: getAuthRedirectUrl(APP_ROUTES.login),
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
    },
    [applySession],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }

    if (!data.user) {
      throw new Error('Không thể tải thông tin tài khoản sau khi đăng nhập.');
    }

    const loadedUser = await loadOrCreateAppUser(data.user);
    setCurrentUser(mapSupabaseUser(data.user));
    setAppUser(loadedUser);

    return loadedUser;
  }, []);

  const signInWithGoogle = useCallback(async (next?: string | null) => {
    const callbackPath = next
      ? withRouteQuery(APP_ROUTES.authCallback, { next })
      : APP_ROUTES.authCallback;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          prompt: 'select_account',
        },
        redirectTo: getAuthRedirectUrl(callbackPath),
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
      redirectTo: getAuthRedirectUrl(APP_ROUTES.login),
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

  const updateUserAvatar = useCallback(
    async (avatarFile: File) => {
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
    },
    [appUser, currentUser],
  );

  const updateUserName = useCallback(
    async (data: UpdateUserNameData) => {
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
    },
    [appUser, currentUser],
  );

  const updateUserNickname = useCallback(
    async (data: UpdateUserNicknameData) => {
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
    },
    [appUser, currentUser],
  );

  const updateUserPersonnel = useCallback(
    async (data: UpdateUserPersonnelData) => {
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
    },
    [appUser, currentUser],
  );

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
