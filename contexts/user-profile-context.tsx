"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  subscribeUserProfile,
  saveUserProfile,
  type UserProfileDoc,
  type UserProfileWritable,
} from "@/lib/firestore/user-profile";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type UserProfileContextValue = {
  profile: UserProfileDoc | null;
  hydrated: boolean;
  needsOnboarding: boolean;
  saving: boolean;
  save: (data: UserProfileWritable) => Promise<void>;
};

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- estado local espelha subscrição Firestore */
    if (!user) {
      setProfile(null);
      setHydrated(true);
      return;
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    const unsub = subscribeUserProfile(
      user.uid,
      (p) => {
        setProfile(p);
        setHydrated(true);
      },
      () => setHydrated(true),
    );
    return () => unsub();
  }, [user]);

  const save = useCallback(
    async (data: UserProfileWritable) => {
      if (!user) throw new Error("Sem utilizador.");
      setSaving(true);
      try {
        await saveUserProfile(user.uid, user.email ?? null, data);
      } finally {
        setSaving(false);
      }
    },
    [user],
  );

  const needsOnboarding = useMemo(() => {
    if (!hydrated || !user) return false;
    if (!profile) return true;
    return (
      !profile.nome.trim() ||
      !profile.cargo.trim() ||
      !profile.telefone.trim()
    );
  }, [hydrated, user, profile]);

  const value = useMemo(
    () => ({
      profile,
      hydrated,
      needsOnboarding,
      saving,
      save,
    }),
    [profile, hydrated, needsOnboarding, saving, save],
  );

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error("useUserProfile must be used within UserProfileProvider");
  }
  return ctx;
}
