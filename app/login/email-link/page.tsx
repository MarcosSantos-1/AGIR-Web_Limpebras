"use client";

import { useAuth } from "@/contexts/auth-context";
import { EMAIL_LINK_STORAGE_KEY } from "@/lib/auth/email-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EmailLinkLoginPage() {
  const {
    user,
    loading: authLoading,
    completeSignInWithEmailLink,
    isUrlEmailSignInLink,
  } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needEmail, setNeedEmail] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || authLoading) return;
    const href = window.location.href;
    if (!isUrlEmailSignInLink(href)) {
      setError("Link inválido ou expirado. Peça um novo convite.");
      return;
    }
    const stored =
      window.localStorage.getItem(EMAIL_LINK_STORAGE_KEY)?.trim() ?? "";
    if (stored) {
      setEmail(stored);
      setBusy(true);
      setError(null);
      completeSignInWithEmailLink(stored)
        .then(() => router.replace("/"))
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : "Não foi possível entrar.",
          );
          setNeedEmail(true);
        })
        .finally(() => setBusy(false));
    } else {
      setNeedEmail(true);
    }
  }, [
    authLoading,
    completeSignInWithEmailLink,
    isUrlEmailSignInLink,
    router,
  ]);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Indique o mesmo e-mail para onde foi enviado o convite.");
      return;
    }
    setBusy(true);
    try {
      await completeSignInWithEmailLink(email);
      router.replace("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível entrar.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-fuchsia-50/40 px-4">
      <div className="w-full max-w-md rounded-3xl border border-zinc-100 bg-white p-8 shadow-xl">
        <h1 className="text-xl font-semibold text-zinc-900">
          Entrar com link
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          A concluir a sessão com o link enviado por e-mail. Na Firebase Console,
          active “Email link (passwordless)” no fornecedor E-mail e autorize
          este domínio em Authentication → Settings.
        </p>

        {needEmail && (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="em">E-mail do convite</Label>
              <Input
                id="em"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
                disabled={busy}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] text-white"
            >
              {busy ? "A validar…" : "Concluir login"}
            </Button>
          </form>
        )}

        {!needEmail && busy && (
          <p className="mt-6 text-center text-sm text-zinc-500">
            A abrir sessão…
          </p>
        )}
        {!needEmail && !busy && error && (
          <p className="mt-6 text-sm text-red-600">{error}</p>
        )}

        <p className="mt-8 text-center text-sm">
          <Link href="/login" className="text-[#9b0ba6] hover:underline">
            Voltar ao login com palavra-passe
          </Link>
        </p>
      </div>
    </div>
  );
}
