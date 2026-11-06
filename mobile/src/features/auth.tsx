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
  const [profileName, setProfileName] = useState({ uid: "", name: "" });
  const name = profileName.uid === user?.uid ? profileName.name : "";

  useEffect(() => {
    if (!configured) return;
    return onAuthStateChanged(getFirebaseAuth(), (next) => {
      setUser(next);
      setReady(true);
    });
  }, [configured]);

  useEffect(() => {
    if (!user) return;
    return subscribeUserProfile(user.uid,
      (profile) => setProfileName({ uid: user.uid, name: profile?.nome?.trim() ?? "" }),
      () => setProfileName({ uid: user.uid, name: "" }));
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
