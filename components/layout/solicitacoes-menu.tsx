"use client";

import { useSolicitacoes } from "@/contexts/solicitacoes-context";
import {
  solicitacaoPrazoLabel,
  solicitacaoStatusLabel,
  solicitacaoTipoLabel,
  solicitacaoUrgenciaAccent,
  type Solicitacao,
} from "@/data/solicitacoes";
import { MessageSquareWarning } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Quantas solicitações abertas cabem no dropdown antes de "ver todas". */
const PREVIEW_LIMIT = 8;

function relativeTime(createdAtMs: number): string {
  const diffMinutes = Math.round((Date.now() - createdAtMs) / 60000);
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes} min`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

function SolicitacaoRow({ solicitacao }: { solicitacao: Solicitacao }) {
  const accent = solicitacaoUrgenciaAccent(solicitacao.urgencia);
  return (
    <>
      <span
        className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${accent.dotClass}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {solicitacaoTipoLabel(solicitacao.tipo)}
        </p>
        <p className="line-clamp-2 font-medium text-zinc-900 dark:text-zinc-100">
          {solicitacao.descricao}
        </p>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {solicitacao.solicitanteNome} · {solicitacao.solicitanteSetor}
        </p>
        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
          <span className="font-medium">
            {solicitacaoPrazoLabel(solicitacao.prazoTipo, solicitacao.prazoData)}
          </span>{" "}
          ·{" "}
          <span className="font-bold text-zinc-800 dark:text-zinc-200">
            {solicitacaoStatusLabel(solicitacao.status)}
          </span>{" "}
          · {relativeTime(solicitacao.createdAtMs)}
        </p>
      </div>
    </>
  );
}

export function SolicitacoesMenu() {
  const { abertas, novasCount, hydrated } = useSolicitacoes();

  const preview = useMemo(
    () => abertas.slice(0, PREVIEW_LIMIT),
    [abertas],
  );

  const badge = novasCount > 9 ? "9+" : String(novasCount);
  const restantes = abertas.length - preview.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          aria-label="Solicitações da comunicação"
        >
          <MessageSquareWarning className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
          {novasCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-gradient px-0.5 text-[10px] font-semibold text-white">
              {badge}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(100vw-1.5rem,24rem)] rounded-xl p-0 pl-2 pr-3"
      >
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 py-2 pl-0 pr-1 dark:border-zinc-800">
          <DropdownMenuLabel className="mb-0 p-0 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Solicitações
          </DropdownMenuLabel>
          <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {abertas.length} aberta{abertas.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="max-h-[min(26rem,55vh)] overflow-y-auto py-1 pl-2">
          {preview.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {hydrated
                ? "Nenhuma solicitação em aberto. Os pedidos que chegarem pelo WhatsApp aparecem aqui."
                : "A carregar solicitações…"}
            </p>
          ) : (
            preview.map((solicitacao) => {
              const accent = solicitacaoUrgenciaAccent(solicitacao.urgencia);
              return (
                <DropdownMenuItem
                  key={solicitacao.id}
                  asChild
                  className={`cursor-pointer gap-2 rounded-lg px-3 py-2.5 focus:bg-zinc-50 dark:focus:bg-zinc-800/50 ${accent.borderClass} border-l-[3px]`}
                >
                  <Link
                    href={`/solicitacoes?id=${solicitacao.id}`}
                    className="flex items-start gap-2"
                  >
                    <SolicitacaoRow solicitacao={solicitacao} />
                  </Link>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
        <div className="border-t border-zinc-100 px-1 py-1 dark:border-zinc-800">
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
            <Link
              href="/solicitacoes"
              className="flex w-full items-center justify-center py-2 text-sm font-medium text-accent"
            >
              {restantes > 0
                ? `Ver todas (+${restantes})`
                : "Abrir painel de solicitações"}
            </Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
