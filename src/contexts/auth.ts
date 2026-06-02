import { createContext } from 'react';
import type { UserRole } from '@/constants/userRoles';

export interface AuthUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AppUser {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  nickname: string;
  username: string;
  phoneNumber: string;
  schoolName: string;
  enterYear: string;
  cohort: string;
  gender: 0 | 1 | null;
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
  nickname: string;
  username: string;
  avatarFile?: File;
}

export interface SignUpResult {
  needsEmailConfirmation: boolean;
}

export interface UpdateUserNameData {
  firstName: string;
  lastName: string;
  middleName: string;
}

export interface UpdateUserNicknameData {
  nickname: string;
}

export interface UpdateUserPersonnelData {
  phoneNumber: string;
  schoolName: string;
  cohort: string;
  enterYear: string;
  gender: 0 | 1 | null;
}

export interface AuthContextType {
  currentUser: AuthUser | null;
  appUser: AppUser | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateUserAvatar: (avatarFile: File) => Promise<void>;
  updateUserName: (data: UpdateUserNameData) => Promise<void>;
  updateUserNickname: (data: UpdateUserNicknameData) => Promise<void>;
  updateUserPersonnel: (data: UpdateUserPersonnelData) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
