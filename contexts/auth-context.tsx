"use client";

import {
  getFirebaseApp,
  getFirebaseAuth,
  isFirebaseConfigured,
} from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  EmailAuthProvider,
  linkWithCredential,
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

import {
  EMAIL_LINK_STORAGE_KEY,
  getEmailLinkContinueUrl,
} from "@/lib/auth/email-link";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  /** Convite sem Cloud Function: guarda e-mail em localStorage e envia link. */
  sendSignInLink: (email: string) => Promise<void>;
  /** Na rota `/login/email-link`, completa o login com a URL actual. */
  completeSignInWithEmailLink: (email: string) => Promise<void>;
  isUrlEmailSignInLink: (url: string) => boolean;
  /**
   * Associa uma senha à conta atual (após entrar pelo link mágico).
   * Se a conta já tiver senha no Auth, não lança (auth/provider-already-linked).
   */
  linkPasswordToAccount: (password: string) => Promise<void>;
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

  const sendSignInLink = useCallback(async (email: string) => {
    const auth = getFirebaseAuth();
    const trimmed = email.trim().toLowerCase();
    const continueUrl = getEmailLinkContinueUrl();
    if (!continueUrl) throw new Error("URL de retorno inválida.");
    await sendSignInLinkToEmail(auth, trimmed, {
      url: continueUrl,
      handleCodeInApp: true,
    });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(EMAIL_LINK_STORAGE_KEY, trimmed);
    }
  }, []);

  const completeSignInWithEmailLink = useCallback(
    async (email: string) => {
      const auth = getFirebaseAuth();
      if (typeof window === "undefined") return;
      const href = window.location.href;
      if (!isSignInWithEmailLink(auth, href)) {
        throw new Error("Este endereço não contém um link de início de sessão válido.");
      }
      await signInWithEmailLink(auth, email.trim().toLowerCase(), href);
      window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY);
      window.history.replaceState({}, document.title, window.location.pathname);
    },
    [],
  );

  const isUrlEmailSignInLink = useCallback((url: string) => {
    try {
      return isSignInWithEmailLink(getFirebaseAuth(), url);
    } catch {
      return false;
    }
  }, []);

  const linkPasswordToAccount = useCallback(async (password: string) => {
    const auth = getFirebaseAuth();
    const u = auth.currentUser;
    const email = u?.email?.trim().toLowerCase();
    if (!u || !email) {
      throw new Error("Sessão ou e-mail inválido.");
    }
    const credential = EmailAuthProvider.credential(email, password);
    try {
      await linkWithCredential(u, credential);
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (code === "auth/provider-already-linked") {
        return;
      }
      throw err;
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signOut,
      sendPasswordReset,
      sendSignInLink,
      completeSignInWithEmailLink,
      isUrlEmailSignInLink,
      linkPasswordToAccount,
    }),
    [
      user,
      loading,
      signIn,
      signOut,
      sendPasswordReset,
      sendSignInLink,
      completeSignInWithEmailLink,
      isUrlEmailSignInLink,
      linkPasswordToAccount,
    ],
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
