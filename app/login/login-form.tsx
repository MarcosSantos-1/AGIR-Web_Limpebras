"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function LoginForm() {
  const { signIn, sendPasswordReset, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace(nextPath.startsWith("/") ? nextPath : "/");
    }
  }, [user, loading, router, nextPath]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace(nextPath.startsWith("/") ? nextPath : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login.");
    } finally {
      setBusy(false);
    }
  };

  const onReset = async () => {
    setError(null);
    setResetMsg(null);
    if (!email.trim()) {
      setError("Indique o e-mail para receber o link de redefinição.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(email);
      setResetMsg("Se existir conta com este e-mail, enviamos o link de redefinição.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o e-mail.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-fuchsia-50/40 px-4">
      <div className="w-full max-w-md rounded-3xl border border-zinc-100 bg-white p-8 shadow-xl shadow-zinc-200/60">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-[#9b0ba6]">AGIR</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">Entrar</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Acesso interno — contas criadas no Firebase Console.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 border-zinc-200"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 border-zinc-200"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          {resetMsg && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{resetMsg}</p>
          )}

          <Button
            type="submit"
            disabled={busy}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] text-white"
          >
            {busy ? "A entrar…" : "Entrar"}
          </Button>
        </form>

        <div className="mt-6 flex flex-col gap-3 border-t border-zinc-100 pt-6">
          <button
            type="button"
            onClick={onReset}
            disabled={busy}
            className="text-center text-sm font-medium text-[#9b0ba6] hover:underline disabled:opacity-50"
          >
            Esqueci a senha
          </button>
        </div>
      </div>
      <p className="mt-8 text-center text-xs text-zinc-400">
        <Link href="/" className="hover:text-zinc-600">
          Voltar à app
        </Link>{" "}
        (requer sessão)
      </p>
    </div>
  );
}
