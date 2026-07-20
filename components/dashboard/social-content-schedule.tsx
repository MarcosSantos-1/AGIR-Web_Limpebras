"use client";

import type { SocialContentStatus } from "@/data/social-posts";
import { useSocialPosts } from "@/contexts/social-posts-context";
import { formatRedeLabel } from "@/lib/indicators/communication-stats";
import { formatDateBr } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Share2,
  ExternalLink,
  Calendar,
  Layers,
  User,
  Link2,
} from "lucide-react";
import Link from "next/link";

function statusClass(status: SocialContentStatus) {
  switch (status) {
    case "ideia":
      return "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200";
    case "rascunho":
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
    case "agendado":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200";
    case "publicado":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200";
    default:
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  }
}

function statusLabel(status: SocialContentStatus) {
  switch (status) {
    case "ideia":
      return "Ideia";
    case "rascunho":
      return "Rascunho";
    case "agendado":
      return "Agendado";
    case "publicado":
      return "Publicado";
    default:
      return status;
  }
}

export function SocialContentSchedule() {
  const { posts } = useSocialPosts();
  const rows = posts
    .filter((p) => p.status !== "publicado")
    .slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-card dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--gradient-start)]/15 to-[var(--gradient-end)]/15">
            <Share2 className="h-5 w-5 text-[var(--gradient-accent)]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Cronograma Conteúdo
            </h3>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">Redes sociais</p>
          </div>
        </div>
        <Link
          href="/redes-sociais"
          scroll={false}
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--gradient-accent)] hover:underline"
        >
          Ver todas
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="flex flex-col gap-5">
        {rows.map((row) => (
          <Link
            key={row.id}
            href={`/redes-sociais?content=${row.id}`}
            scroll={false}
            className="block rounded-2xl border border-zinc-100 bg-zinc-50/60 px-5 py-6 shadow-sm transition-all hover:border-[var(--gradient-start)]/25 hover:bg-white hover:shadow-md dark:border-zinc-800 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100/80 pb-4 dark:border-zinc-700/80">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Tema
                </p>
                <p className="text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
                  {row.tema}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusClass(row.status)}`}
              >
                {statusLabel(row.status)}
              </span>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-700">
                  <Calendar className="h-4 w-4 text-[var(--gradient-accent)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    Data
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {formatDateBr(row.date)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-700">
                  <Layers className="h-4 w-4 text-[var(--gradient-accent)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    Tipo
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">{row.tipo}</p>
                </div>
              </div>

              {row.status === "publicado" && (
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-700">
                    <Share2 className="h-4 w-4 text-[var(--gradient-accent)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      Rede
                    </p>
                    <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {formatRedeLabel(row)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 sm:col-span-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-700">
                  <User className="h-4 w-4 text-[var(--gradient-accent)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    Responsável
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {row.responsavel}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:col-span-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-700">
                  <Link2 className="h-4 w-4 text-[var(--gradient-accent)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    Link / arquivo
                  </p>
                  <div className="mt-1 break-words">
                    {row.linkOuArquivo ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--gradient-accent)]"
                        onClick={(e) => e.preventDefault()}
                      >
                        {row.linkOuArquivo}
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      </span>
                    ) : (
                      <span className="text-sm text-zinc-400 dark:text-zinc-500">
                        Nenhum link cadastrado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
