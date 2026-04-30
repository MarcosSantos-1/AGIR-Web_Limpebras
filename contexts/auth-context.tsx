"use client";

import {
  getFirebaseApp,
  getFirebaseAuth,
  isFirebaseConfigured,
} from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => isFirebaseConfigured());

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }
    getFirebaseApp();
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut, sendPasswordReset }),
    [user, loading, signIn, signOut, sendPasswordReset],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}
