import { createContext } from 'react';
import type { User } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  username: string;
  avatarUrl?: string;
  avatarKey?: string;
  role: string;
  status: string;
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

export interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateUserAvatar: (avatarFile: File) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
