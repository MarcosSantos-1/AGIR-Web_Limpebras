"use client";

import { isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { AgendaEventsProvider } from "@/contexts/agenda-events-context";
import { UserProfileProvider } from "@/contexts/user-profile-context";
import { SocialPostsProvider } from "@/contexts/social-posts-context";
import { ProfileOnboardingDialog } from "@/components/settings/profile-onboarding-dialog";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

const PUBLIC_PATHS = new Set(["/login"]);

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = pathname ? PUBLIC_PATHS.has(pathname) : false;

  useEffect(() => {
    if (!isFirebaseConfigured() || loading || isPublic) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname ?? "/")}`);
    }
  }, [user, loading, isPublic, router, pathname]);

  if (!isFirebaseConfigured()) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center">
        <p className="text-lg font-semibold text-zinc-900">Firebase não configurado</p>
        <p className="max-w-md text-sm text-zinc-600">
          Crie um ficheiro <code className="rounded bg-zinc-200 px-1">.env.local</code> na raiz do
          projeto com as variáveis <code className="rounded bg-zinc-200 px-1">NEXT_PUBLIC_FIREBASE_*</code>{" "}
          (veja <code className="rounded bg-zinc-200 px-1">.env.example</code>).
        </p>
      </div>
    );
  }

  if (isPublic) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#f318e3] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#f318e3] border-t-transparent" />
      </div>
    );
  }

  return (
    <UserProfileProvider>
      <AgendaEventsProvider>
        <SocialPostsProvider>{children}</SocialPostsProvider>
      </AgendaEventsProvider>
      <ProfileOnboardingDialog />
    </UserProfileProvider>
  );
}
