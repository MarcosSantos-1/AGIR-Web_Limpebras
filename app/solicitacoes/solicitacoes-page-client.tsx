"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSolicitacoes } from "@/contexts/solicitacoes-context";
import {
  formatWhatsAppPhone,
  isSolicitacaoAberta,
  SOLICITACAO_STATUS_IDS,
  SOLICITACAO_TIPO_IDS,
  solicitacaoPrazoLabel,
  solicitacaoStatusBadgeClass,
  solicitacaoStatusLabel,
  solicitacaoTipoLabel,
  solicitacaoUrgenciaAccent,
  solicitacaoUrgenciaLabel,
  type Solicitacao,
  type SolicitacaoStatus,
} from "@/data/solicitacoes";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Check,
  Clock,
  Hand,
  MessageSquareWarning,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type StatusFilter = SolicitacaoStatus | "todas" | "abertas";
type TipoFilter = (typeof SOLICITACAO_TIPO_IDS)[number] | "todos";

function formatDateTime(ms: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function matchesSearch(solicitacao: Solicitacao, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return [
    solicitacao.protocolo,
    solicitacao.descricao,
    solicitacao.solicitanteNome,
    solicitacao.solicitanteSetor,
    solicitacao.solicitanteTelefone,
    solicitacaoTipoLabel(solicitacao.tipo),
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-semibold", className)}>{value}</p>
    </div>
  );
}

export function SolicitacoesPageClient() {
  const { solicitacoes, hydrated, setStatus } = useSolicitacoes();
  const searchParams = useSearchParams();
  const focusedId = searchParams.get("id");

  const [term, setTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("abertas");
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("todos");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const focusedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!focusedId || !hydrated) return;
    focusedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedId, hydrated]);

  const counts = useMemo(
    () => ({
      novas: solicitacoes.filter((s) => s.status === "nova").length,
      emAndamento: solicitacoes.filter((s) => s.status === "em_andamento")
        .length,
      concluidas: solicitacoes.filter((s) => s.status === "concluida").length,
      urgentes: solicitacoes.filter(
        (s) => s.urgencia === "alta" && isSolicitacaoAberta(s.status),
      ).length,
    }),
    [solicitacoes],
  );

  const visiveis = useMemo(() => {
    const filtradas = solicitacoes.filter((s) => {
      if (statusFilter === "abertas" && !isSolicitacaoAberta(s.status)) {
        return false;
      }
      if (
        statusFilter !== "todas" &&
        statusFilter !== "abertas" &&
        s.status !== statusFilter
      ) {
        return false;
      }
      if (tipoFilter !== "todos" && s.tipo !== tipoFilter) return false;
      return matchesSearch(s, term);
    });

    /** Vindo do menu do header, a solicitação escolhida aparece mesmo fora dos filtros. */
    if (focusedId && !filtradas.some((s) => s.id === focusedId)) {
      const focada = solicitacoes.find((s) => s.id === focusedId);
      if (focada) return [focada, ...filtradas];
    }
    return filtradas;
  }, [solicitacoes, statusFilter, tipoFilter, term, focusedId]);

  const changeStatus = async (id: string, status: SolicitacaoStatus) => {
    setPendingId(id);
    try {
      await setStatus(id, status);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <AppShell
      title="Solicitações"
      subtitle="Pedidos recebidos pelo canal de WhatsApp da Comunicação"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Novas"
            value={counts.novas}
            className="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            label="Em andamento"
            value={counts.emAndamento}
            className="text-violet-600 dark:text-violet-400"
          />
          <StatCard
            label="Urgentes em aberto"
            value={counts.urgentes}
            className="text-red-600 dark:text-red-400"
          />
          <StatCard
            label="Concluídas"
            value={counts.concluidas}
            className="text-emerald-600 dark:text-emerald-400"
          />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar por protocolo, descrição, solicitante ou setor"
              className="h-11 rounded-xl pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="h-11 rounded-xl lg:w-52">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="abertas">Em aberto</SelectItem>
              <SelectItem value="todas">Todas</SelectItem>
              {SOLICITACAO_STATUS_IDS.map((status) => (
                <SelectItem key={status} value={status}>
                  {solicitacaoStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={tipoFilter}
            onValueChange={(v) => setTipoFilter(v as TipoFilter)}
          >
            <SelectTrigger className="h-11 rounded-xl lg:w-56">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {SOLICITACAO_TIPO_IDS.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {solicitacaoTipoLabel(tipo)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!hydrated ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900"
              />
            ))}
          </div>
        ) : visiveis.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <MessageSquareWarning
              className="h-10 w-10 text-zinc-300 dark:text-zinc-600"
              aria-hidden
            />
            <p className="font-medium text-zinc-700 dark:text-zinc-200">
              Nenhuma solicitação com estes filtros
            </p>
            <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
              Os pedidos enviados pelos colaboradores no canal de WhatsApp
              aparecem aqui automaticamente, com protocolo, prazo e prioridade.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visiveis.map((solicitacao) => {
              const accent = solicitacaoUrgenciaAccent(solicitacao.urgencia);
              const isFocused = solicitacao.id === focusedId;
              const busy = pendingId === solicitacao.id;
              return (
                <motion.div
                  key={solicitacao.id}
                  ref={isFocused ? focusedRef : undefined}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "rounded-2xl border border-zinc-100 bg-white p-5 border-l-[3px] dark:border-zinc-800 dark:bg-zinc-900",
                    accent.borderClass,
                    isFocused && "ring-2 ring-[var(--gradient-start)]",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {solicitacao.protocolo}
                      </span>
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        {solicitacaoTipoLabel(solicitacao.tipo)}
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs font-medium",
                          solicitacaoStatusBadgeClass(solicitacao.status),
                        )}
                      >
                        {solicitacaoStatusLabel(solicitacao.status)}
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs font-medium",
                          accent.badgeClass,
                        )}
                      >
                        Prioridade{" "}
                        {solicitacaoUrgenciaLabel(
                          solicitacao.urgencia,
                        ).toLowerCase()}
                      </span>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {solicitacaoPrazoLabel(
                        solicitacao.prazoTipo,
                        solicitacao.prazoData,
                      )}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-line text-sm text-zinc-800 dark:text-zinc-100">
                    {solicitacao.descricao}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>
                      <span className="font-medium text-zinc-700 dark:text-zinc-200">
                        {solicitacao.solicitanteNome}
                      </span>{" "}
                      · {solicitacao.solicitanteSetor}
                    </span>
                    <a
                      href={`https://wa.me/${solicitacao.solicitanteTelefone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-accent hover:underline"
                    >
                      {formatWhatsAppPhone(solicitacao.solicitanteTelefone)}
                    </a>
                    <span>Recebida em {formatDateTime(solicitacao.createdAtMs)}</span>
                    {solicitacao.responsavelNome ? (
                      <span>Responsável: {solicitacao.responsavelNome}</span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {solicitacao.status === "nova" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        disabled={busy}
                        onClick={() =>
                          changeStatus(solicitacao.id, "em_andamento")
                        }
                      >
                        <Hand className="h-4 w-4" aria-hidden />
                        Assumir
                      </Button>
                    )}
                    {isSolicitacaoAberta(solicitacao.status) && (
                      <>
                        <Button
                          size="sm"
                          className="rounded-xl bg-accent-gradient text-white hover:opacity-90"
                          disabled={busy}
                          onClick={() =>
                            changeStatus(solicitacao.id, "concluida")
                          }
                        >
                          <Check className="h-4 w-4" aria-hidden />
                          Concluir
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-xl text-zinc-500 hover:text-red-600"
                          disabled={busy}
                          onClick={() =>
                            changeStatus(solicitacao.id, "recusada")
                          }
                        >
                          <X className="h-4 w-4" aria-hidden />
                          Recusar
                        </Button>
                      </>
                    )}
                    {!isSolicitacaoAberta(solicitacao.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        disabled={busy}
                        onClick={() => changeStatus(solicitacao.id, "nova")}
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden />
                        Reabrir
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
