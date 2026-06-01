import { createContext } from 'react';
import type { UserRole } from '@/constants/userRoles';

export interface AuthUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  username: string;
  avatarUrl?: string;
  avatarKey?: string;
  role: UserRole;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName: string;
  username: string;
  avatarFile?: File;
}

export interface SignUpResult {
  needsEmailConfirmation: boolean;
}

export interface AuthContextType {
  currentUser: AuthUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateUserAvatar: (avatarFile: File) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
