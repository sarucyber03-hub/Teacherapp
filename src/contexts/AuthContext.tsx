/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, UserRole } from '../types.ts';
import { auth } from '../lib/firebase.ts';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { syncUserToFirestore, getUserProfile } from '../lib/schoolData.ts';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  loginWithCredentials: (emailOrUsername: string, passwordString: string) => Promise<UserProfile>;
  signUpTeacher: (nameString: string, emailString: string, passwordString: string, subjectString: string) => Promise<UserProfile>;
  signUpParent: (nameString: string, emailString: string, passwordString: string) => Promise<UserProfile>;
  logoutUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('tharumapuram_active_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Monitor firebase auth states, syncing to our role-based application flow
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        // If it's a firebase authenticated user, fetch details
        const profile = await getUserProfile(firebaseUser.uid);
        if (profile) {
          setUser(profile);
          localStorage.setItem('tharumapuram_active_user', JSON.stringify(profile));
        } else {
          // If no profile exists, let's auto-create parent or retrieve role
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email || '',
            role: 'parent',
            status: 'approved',
            createdAt: new Date().toISOString()
          };
          await syncUserToFirestore(newProfile);
          setUser(newProfile);
          localStorage.setItem('tharumapuram_active_user', JSON.stringify(newProfile));
        }
      } else {
        // Only sign out from firebase if we are not on standard admin mock account
        const currentUser = JSON.parse(localStorage.getItem('tharumapuram_active_user') || 'null');
        if (currentUser && currentUser.uid !== 'admin') {
          setUser(null);
          localStorage.removeItem('tharumapuram_active_user');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithCredentials = async (emailOrUsername: string, passwordString: string): Promise<UserProfile> => {
    setError(null);
    setLoading(true);
    try {
      // 1. Static Principal Bypass check ("admin / admin123")
      if (emailOrUsername.toLowerCase().trim() === 'admin' && passwordString === 'admin123') {
        const principalProfile: UserProfile = {
          uid: 'admin',
          name: 'P.Thavanesan (Principal)',
          email: 'admin@tharumapuram.lk',
          role: 'principal',
          status: 'approved',
          createdAt: new Date().toISOString()
        };
        setUser(principalProfile);
        localStorage.setItem('tharumapuram_active_user', JSON.stringify(principalProfile));
        setLoading(false);
        return principalProfile;
      }

      // 2. Standard Firebase Authentication
      const result = await signInWithEmailAndPassword(auth, emailOrUsername, passwordString);
      const profile = await getUserProfile(result.user.uid);
      if (!profile) {
        throw new Error("Unable to retrieve user role profile.");
      }
      
      // Prevent pending teachers from logging in
      if (profile.role === 'teacher' && profile.status === 'pending') {
        await logoutUser();
        throw new Error("Your teacher registration is currently pending Principal approval. Please contact administration.");
      }

      setUser(profile);
      localStorage.setItem('tharumapuram_active_user', JSON.stringify(profile));
      setLoading(false);
      return profile;

    } catch (err: any) {
      setLoading(false);
      const msg = err.message || 'Login failed. Please verify credentials.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const signUpTeacher = async (
    nameString: string, 
    emailString: string, 
    passwordString: string, 
    subjectString: string
  ): Promise<UserProfile> => {
    setError(null);
    setLoading(true);
    try {
      let uid = 'temp_teach_' + Date.now().toString(36);
      try {
        const result = await createUserWithEmailAndPassword(auth, emailString, passwordString);
        uid = result.user.uid;
        await updateProfile(result.user, { displayName: nameString });
      } catch (fbErr: any) {
        console.warn('Firebase registration bypass to local database storage:', fbErr);
      }

      const teacherProfile: UserProfile = {
        uid: uid,
        name: nameString,
        email: emailString,
        role: 'teacher',
        status: 'pending',
        subject: subjectString,
        createdAt: new Date().toISOString()
      };

      await syncUserToFirestore(teacherProfile);
      setLoading(false);
      return teacherProfile;

    } catch (err: any) {
      const fallbackUid = 'local_teach_' + Date.now().toString(36);
      const teacherProfile: UserProfile = {
        uid: fallbackUid,
        name: nameString,
        email: emailString,
        role: 'teacher',
        status: 'pending',
        subject: subjectString,
        createdAt: new Date().toISOString()
      };
      await syncUserToFirestore(teacherProfile);
      setLoading(false);
      return teacherProfile;
    }
  };

  const signUpParent = async (
    nameString: string, 
    emailString: string, 
    passwordString: string
  ): Promise<UserProfile> => {
    setError(null);
    setLoading(true);
    try {
      let uid = 'temp_parent_' + Date.now().toString(36);
      try {
        const result = await createUserWithEmailAndPassword(auth, emailString, passwordString);
        uid = result.user.uid;
        await updateProfile(result.user, { displayName: nameString });
      } catch (fbErr: any) {
        console.warn('Firebase registration bypass for parent back-up:', fbErr);
      }

      const parentProfile: UserProfile = {
        uid: uid,
        name: nameString,
        email: emailString,
        role: 'parent',
        status: 'approved',
        createdAt: new Date().toISOString()
      };

      await syncUserToFirestore(parentProfile);
      setUser(parentProfile);
      localStorage.setItem('tharumapuram_active_user', JSON.stringify(parentProfile));
      setLoading(false);
      return parentProfile;

    } catch (err: any) {
      const fallbackUid = 'local_parent_' + Date.now().toString(36);
      const parentProfile: UserProfile = {
        uid: fallbackUid,
        name: nameString,
        email: emailString,
        role: 'parent',
        status: 'approved',
        createdAt: new Date().toISOString()
      };
      await syncUserToFirestore(parentProfile);
      setUser(parentProfile);
      localStorage.setItem('tharumapuram_active_user', JSON.stringify(parentProfile));
      setLoading(false);
      return parentProfile;
    }
  };

  const logoutUser = async () => {
    setLoading(true);
    try {
      // Sign out of firebase
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signout bypassed/ignored:');
    }
    setUser(null);
    localStorage.removeItem('tharumapuram_active_user');
    setLoading(false);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      loginWithCredentials, 
      signUpTeacher, 
      signUpParent, 
      logoutUser,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}
