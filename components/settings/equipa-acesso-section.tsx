"use client";

import { useAuth } from "@/contexts/auth-context";
import { useUserProfile } from "@/contexts/user-profile-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  displayNameFromDirectoryEntry,
  fetchUserDirectory,
  type UserDirectoryEntry,
} from "@/lib/firestore/user-profile";
import {
  createTeamIntegrante,
  deleteTeamIntegrante,
  subscribeTeamIntegrantes,
  type TeamIntegranteDoc,
} from "@/lib/firestore/team-integrantes";
import { logEmailInvite } from "@/lib/firestore/email-invites";
import { Trash2, UserPlus, Mail } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export function EquipaAcessoSection() {
  const { hydrated } = useUserProfile();
  const { user, sendSignInLink } = useAuth();

  const [integrantes, setIntegrantes] = useState<TeamIntegranteDoc[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [busyInt, setBusyInt] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [busyInvite, setBusyInvite] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [directory, setDirectory] = useState<UserDirectoryEntry[]>([]);
  const [loadingDir, setLoadingDir] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    return subscribeTeamIntegrantes(setIntegrantes);
  }, [hydrated]);

  const refreshDirectory = useCallback(async () => {
    setLoadingDir(true);
    try {
      setDirectory(await fetchUserDirectory());
    } catch {
      setDirectory([]);
    } finally {
      setLoadingDir(false);
    }
  }, []);

  useEffect(() => {
    void refreshDirectory();
  }, [refreshDirectory]);

  const directoryRows = useMemo(
    () =>
      directory
        .map((row) => ({
          row,
          display: displayNameFromDirectoryEntry(row),
          email: row.emailSynced?.trim() || null,
        }))
        .filter((x) => x.display || x.email),
    [directory],
  );

  async function handleAddIntegrante(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !novoNome.trim()) return;
    setBusyInt(true);
    try {
      await createTeamIntegrante(novoNome, user.uid);
      setNovoNome("");
    } finally {
      setBusyInt(false);
    }
  }

  async function handleRemove(id: string, nome: string) {
    if (!confirm(`Remover integrante "${nome}"?`)) return;
    setBusyInt(true);
    try {
      await deleteTeamIntegrante(id);
    } finally {
      setBusyInt(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteMsg(null);
    if (!inviteEmail.trim()) return;
    setBusyInvite(true);
    try {
      await sendSignInLink(inviteEmail.trim());
      await logEmailInvite(inviteEmail.trim(), user?.uid ?? "");
      setInviteMsg(
        "Se o domínio estiver autorizado no Firebase, o convidado recebe o link. Peça para abrir o e-mail neste dispositivo ou no mesmo navegador em que pediu o convite.",
      );
      setInviteEmail("");
      void refreshDirectory();
    } catch (err) {
      setInviteMsg(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar o convite.",
      );
    } finally {
      setBusyInvite(false);
    }
  }

  if (!hydrated) {
    return (
      <p className="text-sm text-zinc-500">A carregar perfil…</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-100 bg-zinc-50/50 p-4 text-sm text-zinc-600">
        <p>
          Todos os utilizadores autenticados podem gerir nomes na lista de
          equipas. Os contactos com conta no app também entram nos
          planeadores de equipa nos modais de ação (além dos nomes que
          adicionar abaixo).
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900">
          <Mail className="h-5 w-5 text-zinc-500" />
          Convidar por e-mail (link mágico)
        </h3>
        <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="invite-mail">E-mail</Label>
            <Input
              id="invite-mail"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="novo.colega@empresa.gov.br"
              className="h-11 rounded-xl"
              disabled={busyInvite}
            />
          </div>
          <Button
            type="submit"
            disabled={busyInvite}
            className="h-11 shrink-0 rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] text-white"
          >
            Enviar convite
          </Button>
        </form>
        {inviteMsg && (
          <p className="mt-3 text-sm text-zinc-600">{inviteMsg}</p>
        )}
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900">
          <UserPlus className="h-5 w-5 text-zinc-500" />
          Nomes na lista de equipas
        </h3>
        <p className="mb-4 text-sm text-zinc-500">
          Apenas etiquetas para escolher nos modais — não concede acesso ao app.
          Quem tiver conta aparece também na tabela abaixo.
        </p>
        <form onSubmit={handleAddIntegrante} className="mb-4 flex gap-2">
          <Input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome para adicionar às equipas nos modais"
            className="h-11 flex-1 rounded-xl"
            disabled={busyInt}
          />
          <Button type="submit" disabled={busyInt} className="h-11 rounded-xl">
            Adicionar
          </Button>
        </form>
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
          {integrantes.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-zinc-500">
              Nenhum nome na lista — adicione ou aguarde colegas preencherem o
              perfil.
            </li>
          ) : (
            integrantes.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between gap-2 px-4 py-3"
              >
                <span className="font-medium text-zinc-900">{i.nome}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => void handleRemove(i.id, i.nome)}
                  disabled={busyInt}
                  aria-label={`Remover ${i.nome}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-zinc-900">
            Contas com acesso ao app
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => void refreshDirectory()}
            disabled={loadingDir}
          >
            Actualizar
          </Button>
        </div>
        <p className="mb-4 text-sm text-zinc-500">
          Utilizadores com perfil em{" "}
          <code className="rounded bg-zinc-100 px-1">users/*</code>. Estes
          nomes surgem nos modais ao montar a equipa, juntamente com a lista
          acima.
        </p>
        <div className="overflow-x-auto rounded-xl border border-zinc-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-zinc-600">
                <th className="p-3 font-medium">Nome</th>
                <th className="p-3 font-medium">E-mail</th>
              </tr>
            </thead>
            <tbody>
              {directoryRows.length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-6 text-center text-zinc-500">
                    {loadingDir ? "A carregar…" : "Sem perfis registados."}
                  </td>
                </tr>
              ) : (
                directoryRows.map(({ row, display, email }) => (
                  <tr key={row.uid} className="border-b border-zinc-50">
                    <td className="p-3 text-zinc-900">
                      {display ?? "—"}
                    </td>
                    <td className="p-3 text-zinc-600">
                      {email ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
