"use client";

import {
  subscribeSocialFollowerCounts,
  subscribeSocialFollowerHistory,
  updateSocialFollowerCount,
} from "@/lib/firestore/social-followers";
import type { SocialPublicationRede } from "@/data/social-posts";
import {
  DEFAULT_SOCIAL_FOLLOWER_COUNTS,
  type FollowerHistoryRow,
  type SocialFollowerCounts,
} from "@/data/social-followers";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SocialFollowersContextValue = {
  counts: SocialFollowerCounts;
  hydrated: boolean;
  history: FollowerHistoryRow[];
  historyHydrated: boolean;
  setFollowers: (rede: SocialPublicationRede, followers: number) => Promise<void>;
};

const SocialFollowersContext = createContext<SocialFollowersContextValue | null>(
  null,
);

export function SocialFollowersProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<SocialFollowerCounts>(
    DEFAULT_SOCIAL_FOLLOWER_COUNTS,
  );
  const [hydrated, setHydrated] = useState(false);
  const [history, setHistory] = useState<FollowerHistoryRow[]>([]);
  const [historyHydrated, setHistoryHydrated] = useState(false);

  useEffect(() => {
    const unsub = subscribeSocialFollowerCounts(
      (data) => {
        setCounts(data);
        setHydrated(true);
      },
      () => setHydrated(true),
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeSocialFollowerHistory(
      (rows) => {
        setHistory(rows);
        setHistoryHydrated(true);
      },
      () => setHistoryHydrated(true),
    );
    return () => unsub();
  }, []);

  const setFollowers = useCallback(
    async (rede: SocialPublicationRede, followers: number) => {
      await updateSocialFollowerCount(rede, followers);
    },
    [],
  );

  const value = useMemo(
    () => ({
      counts,
      hydrated,
      history,
      historyHydrated,
      setFollowers,
    }),
    [counts, hydrated, history, historyHydrated, setFollowers],
  );

  return (
    <SocialFollowersContext.Provider value={value}>
      {children}
    </SocialFollowersContext.Provider>
  );
}

export function useSocialFollowers() {
  const ctx = useContext(SocialFollowersContext);
  if (!ctx) {
    throw new Error("useSocialFollowers deve ser usado dentro de SocialFollowersProvider");
  }
  return ctx;
}
