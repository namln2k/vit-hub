import { deleteAvatar, uploadAvatar } from '@/api/avatarUpload';
import { getProfile, upsertProfile, usernameExists } from '@/api/profiles';
import { supabase } from '@/api/supabase';
import {
  AuthContext,
  type AuthContextType,
  type AuthUser,
  type SignUpData,
  type UserProfile,
} from './auth';
import type { Session, User } from '@supabase/supabase-js';
import { useEffect, useState, type ReactNode } from 'react';

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
  return (import.meta.env.VITE_APP_ORIGIN || window.location.origin).replace(/\/$/, '');
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

function getProfileName(displayName: string | null, email: string) {
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

async function createProfileFromUser(user: User): Promise<UserProfile> {
  const email = user.email ?? '';
  const displayName =
    getStringMetadata(user, 'full_name') || getStringMetadata(user, 'name') || null;
  const profileName = getProfileName(displayName, email);
  const username = getStringMetadata(user, 'username') || (await createUniqueUsername(email));
  const profile: UserProfile = {
    uid: user.id,
    email,
    firstName: getStringMetadata(user, 'first_name') || profileName.firstName,
    lastName: getStringMetadata(user, 'last_name') || profileName.lastName,
    middleName: getStringMetadata(user, 'middle_name') || profileName.middleName,
    username,
    avatarUrl: getStringMetadata(user, 'avatar_url'),
    avatarKey: getStringMetadata(user, 'avatar_key'),
    role: 'member',
  };

  return upsertProfile(profile);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUserProfile(user: User) {
    const profile = (await getProfile(user.id)) ?? (await createProfileFromUser(user));
    setUserProfile(profile);
  }

  async function applySession(session: Session | null) {
    const user = session?.user ?? null;

    if (!user) {
      setCurrentUser(null);
      setUserProfile(null);
      return;
    }

    setCurrentUser(mapSupabaseUser(user));

    try {
      await loadUserProfile(user);
    } catch {
      setUserProfile(null);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setCurrentUser(null);
        setUserProfile(null);
      } else {
        await applySession(session);
      }

      if (isMounted) {
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
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signUp(data: SignUpData) {
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
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }

  async function signInWithGoogle() {
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
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthRedirectUrl('/login'),
    });

    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }

  async function updateUserPassword(currentPassword: string, newPassword: string) {
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
  }

  async function updateUserAvatar(avatarFile: File) {
    if (!currentUser || !userProfile) {
      throw new Error('Bạn cần đăng nhập trước khi cập nhật ảnh đại diện.');
    }

    const previousAvatarKey = userProfile.avatarKey;
    const avatar = await uploadAvatar(avatarFile);
    const nextProfile = await upsertProfile({
      ...userProfile,
      avatarUrl: avatar.avatarUrl,
      avatarKey: avatar.avatarKey,
    });

    await supabase.auth.updateUser({
      data: {
        avatar_key: avatar.avatarKey,
        avatar_url: avatar.avatarUrl,
      },
    });

    setUserProfile(nextProfile);

    if (previousAvatarKey) {
      try {
        await deleteAvatar(previousAvatarKey);
      } catch {
        // The profile already points at the new avatar; stale object cleanup can be retried manually.
      }
    }
  }

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateUserPassword,
    updateUserAvatar,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
