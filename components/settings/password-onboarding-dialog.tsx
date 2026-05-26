"use client";

import { mapFirebaseAuthError } from "@/lib/auth/firebase-auth-errors";
import { useAuth } from "@/contexts/auth-context";
import { useUserProfile } from "@/contexts/user-profile-context";
import { markPasswordConfigured } from "@/lib/firestore/user-profile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMemo, useState } from "react";

const MIN_PASSWORD_LEN = 6;

export function PasswordOnboardingDialog() {
  const { user, linkPasswordToAccount } = useAuth();
  const { hydrated, needsOnboarding, profile } = useUserProfile();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const open = useMemo(() => {
    if (!hydrated || !user || !profile || needsOnboarding) return false;
    return profile.senhaDefinidaEmMs == null;
  }, [hydrated, user, profile, needsOnboarding]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LEN) {
      setError(`Use pelo menos ${MIN_PASSWORD_LEN} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    try {
      await linkPasswordToAccount(password);
      await markPasswordConfigured(user!.uid);
      setPassword("");
      setConfirm("");
    } catch (err: unknown) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} modal>
      <DialogContent
        className="max-w-md rounded-2xl border-0 bg-transparent p-4 shadow-none sm:max-w-md"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Definir senha de acesso</DialogTitle>
        <DialogDescription className="sr-only">
          Crie uma senha para entrar com e-mail e senha depois de sair da conta.
        </DialogDescription>
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-lg shadow-zinc-200/50"
        >
          <h3 className="text-lg font-semibold text-zinc-900">
            Defina sua senha
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            Você entrou pelo convite por link. Para acessar de novo depois de{" "}
            <strong>sair</strong>, use este e-mail e a senha que criar aqui.
          </p>

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="onb-pw">Nova senha</Label>
              <Input
                id="onb-pw"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD_LEN}
                className="h-11 border-zinc-200"
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="onb-pw2">Confirmar senha</Label>
              <Input
                id="onb-pw2"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={MIN_PASSWORD_LEN}
                className="h-11 border-zinc-200"
                disabled={busy}
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={busy}
            className="mt-6 h-11 w-full rounded-xl bg-accent-gradient text-white"
          >
            {busy ? "Salvando…" : "Salvar senha e continuar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
