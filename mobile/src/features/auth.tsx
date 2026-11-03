import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { subscribeUserProfile } from "../../../lib/firestore/user-profile";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";

type AuthValue = {
  ready: boolean;
  configured: boolean;
  user: User | null;
  responsible: string;
};

const AuthContext = createContext<AuthValue>({ ready: false, configured: false, user: null, responsible: "Agente de campo" });

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [ready, setReady] = useState(!configured);
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!configured) return;
    return onAuthStateChanged(getFirebaseAuth(), (next) => {
      setUser(next);
      setReady(true);
    });
  }, [configured]);

  useEffect(() => {
    if (!user) { setName(""); return; }
    return subscribeUserProfile(user.uid, (profile) => setName(profile?.nome?.trim() ?? ""), () => setName(""));
  }, [user]);

  const value = useMemo<AuthValue>(() => ({
    ready,
    configured,
    user,
    responsible: name || user?.email || "Agente de campo",
  }), [configured, name, ready, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
