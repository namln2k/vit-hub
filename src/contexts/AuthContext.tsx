import { auth, db } from '@/api/firebase';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  username: string;
  role: string;
  status: string;
}

interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName: string;
  username: string;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const docSnap = await getDoc(doc(db, 'users', user.uid));
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
        } catch {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function checkUsernameExists(username: string): Promise<boolean> {
    const q = query(collection(db, 'users'), where('username', '==', username));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }

  async function signUp(data: SignUpData) {
    try {
      const usernameExists = await checkUsernameExists(data.username);
      if (usernameExists) {
        throw new Error('Username đã tồn tại. Vui lòng chọn username khác.');
      }
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'permission-denied') {
        throw new Error(
          'Firestore chưa cho phép đọc collection users. Hãy cập nhật Firestore Rules rồi thử lại.'
        );
      }
      throw error;
    }

    const credential = await createUserWithEmailAndPassword(auth, data.email, data.password);

    try {
      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        username: data.username,
        role: 'member',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      await deleteUser(credential.user);

      if (error instanceof FirebaseError && error.code === 'permission-denied') {
        throw new Error(
          'Firestore chưa cho phép tạo hồ sơ user. Hãy cập nhật Firestore Rules rồi đăng ký lại.'
        );
      }
      throw error;
    }
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
