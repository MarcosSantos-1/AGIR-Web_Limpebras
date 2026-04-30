"use client";

import {
  registerAllocateNextSocialPostId,
} from "@/components/redes-sociais/conteudo-social-modal-provider";
import {
  deleteSocialPost,
  nextSocialPostId,
  persistSocialPost,
  subscribeSocialPosts,
} from "@/lib/firestore/social-posts";
import type { SocialPost } from "@/data/social-posts";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type SocialPostsContextValue = {
  posts: SocialPost[];
  hydrated: boolean;
  persistPost: (post: SocialPost) => Promise<void>;
  removePost: (id: number) => Promise<void>;
  allocateNextId: () => number;
};

const SocialPostsContext = createContext<SocialPostsContextValue | null>(null);

export function SocialPostsProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const postsRef = useRef<SocialPost[]>([]);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    const unsub = subscribeSocialPosts(
      (list) => {
        setPosts(list);
        setHydrated(true);
      },
      () => setHydrated(true),
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    registerAllocateNextSocialPostId(() => nextSocialPostId(postsRef.current));
    return () => registerAllocateNextSocialPostId(() => -1);
  }, []);

  const persistPost = useCallback(async (post: SocialPost) => {
    await persistSocialPost(post);
  }, []);

  const removePost = useCallback(async (id: number) => {
    await deleteSocialPost(id);
  }, []);

  const allocateNextId = useCallback(() => nextSocialPostId(postsRef.current), []);

  const value = useMemo(
    () => ({
      posts,
      hydrated,
      persistPost,
      removePost,
      allocateNextId,
    }),
    [posts, hydrated, persistPost, removePost, allocateNextId],
  );

  return (
    <SocialPostsContext.Provider value={value}>
      {children}
    </SocialPostsContext.Provider>
  );
}

export function useSocialPosts() {
  const ctx = useContext(SocialPostsContext);
  if (!ctx) {
    throw new Error("useSocialPosts deve ser usado dentro de SocialPostsProvider");
  }
  return ctx;
}
