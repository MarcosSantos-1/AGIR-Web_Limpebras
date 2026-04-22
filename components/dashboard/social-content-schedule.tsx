"use client";

import { getDashboardSocialPosts } from "@/data/social-posts";
import type { SocialContentStatus } from "@/data/social-posts";
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

const rows = getDashboardSocialPosts();

function statusClass(status: SocialContentStatus) {
  switch (status) {
    case "ideia":
      return "bg-violet-100 text-violet-800";
    case "rascunho":
      return "bg-zinc-100 text-zinc-700";
    case "agendado":
      return "bg-amber-100 text-amber-800";
    case "publicado":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-zinc-100 text-zinc-700";
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50"
    >
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f318e3]/15 to-[#6a0eaf]/15">
            <Share2 className="h-5 w-5 text-[#9b0ba6]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">
              Cronograma Conteúdo
            </h3>
            <p className="mt-0.5 text-sm text-zinc-500">Redes sociais</p>
          </div>
        </div>
        <Link
          href="/redes-sociais"
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-[#9b0ba6] hover:underline"
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
            className="block rounded-2xl border border-zinc-100 bg-zinc-50/60 px-5 py-6 shadow-sm transition-all hover:border-[#f318e3]/25 hover:bg-white hover:shadow-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100/80 pb-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Tema
                </p>
                <p className="text-base font-semibold leading-snug text-zinc-900">
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-100">
                  <Calendar className="h-4 w-4 text-[#9b0ba6]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Data
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-800">{row.date}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-100">
                  <Layers className="h-4 w-4 text-[#9b0ba6]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Tipo
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-800">{row.tipo}</p>
                </div>
              </div>

              <div className="flex gap-3 sm:col-span-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-100">
                  <User className="h-4 w-4 text-[#9b0ba6]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Responsável
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-800">
                    {row.responsavel}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:col-span-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-100">
                  <Link2 className="h-4 w-4 text-[#9b0ba6]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Link / arquivo
                  </p>
                  <div className="mt-1 break-words">
                    {row.linkOuArquivo ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#9b0ba6]"
                        onClick={(e) => e.preventDefault()}
                      >
                        {row.linkOuArquivo}
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      </span>
                    ) : (
                      <span className="text-sm text-zinc-400">
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
