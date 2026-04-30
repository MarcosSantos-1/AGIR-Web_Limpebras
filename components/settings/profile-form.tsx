"use client";

import { useUserProfile } from "@/contexts/user-profile-context";
import { useAuth } from "@/contexts/auth-context";
import { DEFAULT_PROFILE_GRADIENT } from "@/lib/firestore/user-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Palette } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { initialsFromNome } from "@/lib/user-initials";
import {
  formatBrazilPhoneInput,
  isCompleteBrazilPhone,
} from "@/lib/format-brazil-phone";

const GRADIENT_PRESETS = [
  { from: "#f318e3", to: "#6a0eaf" },
  { from: "#6366f1", to: "#4338ca" },
  { from: "#10b981", to: "#047857" },
  { from: "#f59e0b", to: "#d97706" },
  { from: "#ef4444", to: "#b91c1c" },
] as const;

type ProfileFormProps = {
  layout: "settings" | "modal";
  submitLabel?: string;
  onSaved?: () => void;
};

export function ProfileForm({
  layout,
  submitLabel = "Salvar alterações",
  onSaved,
}: ProfileFormProps) {
  const { user } = useAuth();
  const { profile, save, saving, hydrated } = useUserProfile();
  const email = user?.email ?? "";

  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [telefone, setTelefone] = useState("");
  const [gradientFrom, setGradientFrom] = useState<string>(
    DEFAULT_PROFILE_GRADIENT.from,
  );
  const [gradientTo, setGradientTo] = useState<string>(
    DEFAULT_PROFILE_GRADIENT.to,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hidratar formulário a partir do Firestore */
    if (!hydrated) return;
    if (!profile) {
      setNome("");
      setCargo("");
      setTelefone("");
      setGradientFrom(DEFAULT_PROFILE_GRADIENT.from);
      setGradientTo(DEFAULT_PROFILE_GRADIENT.to);
      return;
    }
    setNome(profile.nome);
    setCargo(profile.cargo);
    setTelefone(formatBrazilPhoneInput(profile.telefone));
    setGradientFrom(profile.gradientFrom);
    setGradientTo(profile.gradientTo);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [hydrated, profile]);

  const previewInitials = useMemo(() => initialsFromNome(nome), [nome]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nome.trim() || !cargo.trim()) {
      setError("Preencha nome e cargo.");
      return;
    }
    if (!isCompleteBrazilPhone(telefone)) {
      setError("Informe o telefone completo com DDD.");
      return;
    }
    try {
      await save({
        nome: nome.trim(),
        cargo: cargo.trim(),
        telefone: formatBrazilPhoneInput(telefone),
        gradientFrom,
        gradientTo,
      });
      onSaved?.();
    } catch {
      setError("Não foi possível gravar o perfil. Tente de novo.");
    }
  }

  const cardRound = layout === "modal" ? "rounded-2xl" : "rounded-3xl";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div
        className={`${cardRound} bg-white p-6 shadow-lg shadow-zinc-200/50`}
      >
        {layout === "settings" ? (
          <h3 className="mb-6 text-lg font-semibold text-zinc-900">
            Informações Pessoais
          </h3>
        ) : (
          <h3 className="mb-6 text-lg font-semibold text-zinc-900">
            Complete o seu perfil
          </h3>
        )}

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Popover>
            <div className="relative shrink-0">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-2xl text-3xl font-semibold text-white"
                style={{
                  background: `linear-gradient(to bottom right, ${gradientFrom}, ${gradientTo})`,
                }}
              >
                {previewInitials}
              </div>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="Gradiente das iniciais"
                  className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg transition hover:bg-zinc-50"
                >
                  <Palette className="h-4 w-4 text-zinc-600" />
                </button>
              </PopoverTrigger>
            </div>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="flex flex-wrap gap-2">
                {GRADIENT_PRESETS.map((g) => (
                  <button
                    key={g.from + g.to}
                    type="button"
                    onClick={() => {
                      setGradientFrom(g.from);
                      setGradientTo(g.to);
                    }}
                    className={`flex h-10 w-10 rounded-xl ring-offset-2 transition ${
                      gradientFrom === g.from && gradientTo === g.to
                        ? "ring-2 ring-[#f318e3]"
                        : ""
                    }`}
                    style={{
                      background: `linear-gradient(to bottom right, ${g.from}, ${g.to})`,
                    }}
                    aria-label="Gradiente"
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prof-nome" className="text-sm font-medium text-zinc-500">
                  Nome
                </Label>
                <Input
                  id="prof-nome"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="rounded-xl border-0 bg-zinc-100 p-3"
                  placeholder="Seu nome"
                  autoComplete="name"
                  disabled={saving || !hydrated}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prof-cargo" className="text-sm font-medium text-zinc-500">
                  Cargo
                </Label>
                <Input
                  id="prof-cargo"
                  required
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="rounded-xl border-0 bg-zinc-100 p-3"
                  placeholder="Ex.: Supervisor"
                  autoComplete="organization-title"
                  disabled={saving || !hydrated}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prof-email" className="text-sm font-medium text-zinc-500">
                E-mail
              </Label>
              <Input
                id="prof-email"
                type="email"
                readOnly
                value={email}
                tabIndex={-1}
                className="cursor-not-allowed rounded-xl border-0 bg-zinc-100/90 p-3 text-zinc-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prof-tel" className="text-sm font-medium text-zinc-500">
                Telefone
              </Label>
              <Input
                id="prof-tel"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                required
                value={telefone}
                onChange={(e) =>
                  setTelefone(formatBrazilPhoneInput(e.target.value))
                }
                className="rounded-xl border-0 bg-zinc-100 p-3"
                placeholder="(11) 99999-9999"
                disabled={saving || !hydrated}
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <div className={`mt-6 flex ${layout === "modal" ? "" : "justify-end"}`}>
          <Button
            type="submit"
            disabled={saving || !hydrated}
            className="rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] px-6 text-white"
          >
            {saving ? "A gravar…" : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
