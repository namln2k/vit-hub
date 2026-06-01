import { auth, db } from '@/api/firebase';
import { deleteAvatar, uploadAvatar } from '@/api/avatarUpload';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  updatePassword,
  type User,
} from 'firebase/auth';
import { AuthContext, type AuthContextType, type SignUpData, type UserProfile } from './auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { useEffect, useState, type ReactNode } from 'react';

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

    while (await checkUsernameExists(username)) {
      const suffixText = suffix.toString();
      username = `${baseUsername.slice(0, 20 - suffixText.length)}${suffixText}`;
      suffix += 1;
    }

    return username;
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

  async function ensureGoogleUserProfile(user: User): Promise<UserProfile> {
    const profileRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(profileRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }

    const email = user.email ?? '';
    const username = await createUniqueUsername(email);
    const profileName = getProfileName(user.displayName, email);
    const profile: UserProfile = {
      uid: user.uid,
      email,
      firstName: profileName.firstName,
      lastName: profileName.lastName,
      middleName: profileName.middleName,
      username,
      avatarUrl: user.photoURL ?? '',
      avatarKey: '',
      role: 'member',
    };

    await setDoc(profileRef, {
      ...profile,
      createdAt: serverTimestamp(),
    });

    return profile;
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
          'Firestore chưa cho phép đọc collection users. Hãy cập nhật Firestore Rules rồi thử lại.',
        );
      }
      throw error;
    }

    const credential = await createUserWithEmailAndPassword(auth, data.email, data.password);

    try {
      const avatar = data.avatarFile ? await uploadAvatar(data.avatarFile, credential.user) : null;

      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        username: data.username,
        avatarUrl: avatar?.avatarUrl ?? '',
        avatarKey: avatar?.avatarKey ?? '',
        role: 'member',
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      await deleteUser(credential.user);

      if (error instanceof FirebaseError && error.code === 'permission-denied') {
        throw new Error(
          'Firestore chưa cho phép tạo hồ sơ user. Hãy cập nhật Firestore Rules rồi đăng ký lại.',
        );
      }
      throw error;
    }
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const credential = await signInWithPopup(auth, provider);
      const profile = await ensureGoogleUserProfile(credential.user);
      setUserProfile(profile);
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'permission-denied') {
        throw new Error(
          'Firestore chưa cho phép tạo hồ sơ Google. Hãy cập nhật Firestore Rules rồi thử lại.',
        );
      }
      throw error;
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function updateUserPassword(currentPassword: string, newPassword: string) {
    if (!auth.currentUser?.email) {
      throw new Error('Bạn cần đăng nhập lại trước khi đổi mật khẩu.');
    }

    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPassword);
  }

  async function updateUserAvatar(avatarFile: File) {
    if (!currentUser || !userProfile) {
      throw new Error('Bạn cần đăng nhập trước khi cập nhật ảnh đại diện.');
    }

    const previousAvatarKey = userProfile.avatarKey;
    const avatar = await uploadAvatar(avatarFile, currentUser);

    await updateDoc(doc(db, 'users', currentUser.uid), {
      avatarUrl: avatar.avatarUrl,
      avatarKey: avatar.avatarKey,
    });

    setUserProfile({
      ...userProfile,
      avatarUrl: avatar.avatarUrl,
      avatarKey: avatar.avatarKey,
    });

    if (previousAvatarKey) {
      try {
        await deleteAvatar(previousAvatarKey, currentUser);
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
