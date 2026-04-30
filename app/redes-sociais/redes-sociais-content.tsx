"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useConteudoSocialModal } from "@/components/redes-sociais/conteudo-social-modal-provider";
import { useSocialPosts } from "@/contexts/social-posts-context";
import type { SocialPost } from "@/data/social-posts";
import { formatDateBr } from "@/lib/utils";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  Share2,
  Calendar,
  User,
  Link2,
  ExternalLink,
  Eye,
  Heart,
  Share,
  Pencil,
  Download,
  Megaphone,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const filterOptions = [
  { id: "all", label: "Todas" },
  { id: "publicado", label: "Publicados" },
  { id: "producao", label: "Em produção" },
  { id: "ideia", label: "Ideias" },
] as const;

type FilterId = (typeof filterOptions)[number]["id"];

function statusLabel(
  s: SocialPost["status"],
): { label: string; className: string } {
  switch (s) {
    case "ideia":
      return { label: "Ideia", className: "bg-violet-100 text-violet-800" };
    case "rascunho":
      return { label: "Rascunho", className: "bg-zinc-100 text-zinc-700" };
    case "agendado":
      return { label: "Agendado", className: "bg-amber-100 text-amber-800" };
    case "publicado":
      return { label: "Publicado", className: "bg-emerald-100 text-emerald-800" };
    default:
      return { label: s, className: "bg-zinc-100 text-zinc-700" };
  }
}

function matchesFilter(post: SocialPost, filter: FilterId): boolean {
  if (filter === "all") return true;
  if (filter === "publicado") return post.status === "publicado";
  if (filter === "producao")
    return post.status === "rascunho" || post.status === "agendado";
  if (filter === "ideia") return post.status === "ideia";
  return true;
}

/** Conteúdo da página, dentro de AppShell, para o hook do modal de redes ter contexto. */
function RedesSociaisPageBody() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { open: openConteudoModal, openEdit } = useConteudoSocialModal();
  const { posts: postsState } = useSocialPosts();
  const highlightId = searchParams.get("content");
  const lastScrolledId = useRef<string | null>(null);

  const [selectedFilter, setSelectedFilter] = useState<FilterId>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const scrollToCard = useCallback((id: string) => {
    const el = document.getElementById(`social-card-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  useEffect(() => {
    if (highlightId && lastScrolledId.current !== highlightId) {
      lastScrolledId.current = highlightId;
      const t = setTimeout(() => scrollToCard(highlightId), 200);
      return () => clearTimeout(t);
    }
  }, [highlightId, scrollToCard]);

  const abriuNovo = useRef(false);
  useEffect(() => {
    if (searchParams.get("novo") !== "1") {
      abriuNovo.current = false;
      return;
    }
    if (abriuNovo.current) return;
    abriuNovo.current = true;
    openConteudoModal();
    router.replace(pathname, { scroll: false });
  }, [searchParams, openConteudoModal, router, pathname]);

  const filtered = postsState.filter((p) => {
    const f = matchesFilter(p, selectedFilter);
    const q = searchQuery.toLowerCase();
    const searchMatch =
      !q ||
      p.tema.toLowerCase().includes(q) ||
      p.responsavel.toLowerCase().includes(q) ||
      (p.legenda?.toLowerCase().includes(q) ?? false) ||
      (p.ideiaResumo?.toLowerCase().includes(q) ?? false);
    return f && searchMatch;
  });

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por tema, legenda, responsável…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 w-full rounded-xl border-0 bg-white pl-12 pr-4 text-sm shadow-lg shadow-zinc-200/50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#f318e3]/20"
          />
        </div>
        <Button
          type="button"
          onClick={() => openConteudoModal()}
          className="h-12 shrink-0 rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] px-5 text-white shadow-lg shadow-[#f318e3]/25 sm:px-6"
        >
          <Share2 className="mr-2 h-5 w-5" />
          Novo conteúdo
        </Button>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {filterOptions.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setSelectedFilter(filter.id)}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              selectedFilter === filter.id
                ? "bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] text-white shadow-lg shadow-[#f318e3]/25"
                : "bg-white text-zinc-600 shadow-md hover:bg-zinc-50"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {filtered.map((set, setIndex) => {
          const st = statusLabel(set.status);
          const isHighlight = highlightId === String(set.id);
          return (
            <motion.div
              key={set.id}
              id={`social-card-${set.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: setIndex * 0.05 }}
              className={`rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50 ${
                isHighlight
                  ? "ring-2 ring-[#f318e3]/50 ring-offset-2 ring-offset-zinc-50"
                  : ""
              }`}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-zinc-900">{set.tema}</h3>
                  <p className="mt-1 text-sm text-zinc-500">#{set.id}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${st.className}`}
                >
                  {st.label}
                </span>
              </div>

              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-2 text-sm text-zinc-600">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#9b0ba6]" />
                  <span>
                    <span className="text-xs text-zinc-400">Pauta / data</span>
                    <br />
                    {formatDateBr(set.date)}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm text-zinc-600">
                  <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-[#9b0ba6]" />
                  <span>
                    <span className="text-xs text-zinc-400">Formato</span>
                    <br />
                    {set.tipo}
                  </span>
                </div>
                <div className="flex items-start gap-2 sm:col-span-2">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-[#9b0ba6]" />
                  <span>
                    <span className="text-xs text-zinc-400">Responsável</span>
                    <br />
                    {set.responsavel}
                  </span>
                </div>
              </div>

              {set.status === "ideia" && set.ideiaResumo && (
                <div className="mb-4 rounded-2xl bg-violet-50/80 p-4 text-sm text-zinc-800">
                  <p className="text-xs font-semibold uppercase text-violet-600">
                    Ideia
                  </p>
                  <p className="mt-1 leading-relaxed">{set.ideiaResumo}</p>
                  {set.notasProducao && (
                    <p className="mt-2 text-xs text-zinc-600">{set.notasProducao}</p>
                  )}
                </div>
              )}

              {set.legenda && set.status !== "ideia" && (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase text-zinc-400">
                    Legenda
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-800">
                    {set.legenda}
                  </p>
                </div>
              )}

              {set.status === "publicado" && (
                <div className="mb-4 space-y-3 rounded-2xl bg-zinc-50/80 p-4">
                  <p className="text-xs font-semibold uppercase text-zinc-400">
                    Acompanhamento
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {set.visualizacoes != null && (
                      <div className="flex items-center gap-2 text-sm text-zinc-800">
                        <Eye className="h-4 w-4 text-blue-500" />
                        <span>
                          {set.visualizacoes.toLocaleString("pt-BR")}{" "}
                          <span className="text-zinc-500">views</span>
                        </span>
                      </div>
                    )}
                    {set.curtidas != null && (
                      <div className="flex items-center gap-2 text-sm text-zinc-800">
                        <Heart className="h-4 w-4 text-red-500" />
                        {set.curtidas.toLocaleString("pt-BR")}
                      </div>
                    )}
                    {set.compartilhamentos != null && (
                      <div className="flex items-center gap-2 text-sm text-zinc-800">
                        <Share className="h-4 w-4 text-amber-600" />
                        {set.compartilhamentos.toLocaleString("pt-BR")}
                      </div>
                    )}
                  </div>
                  {set.metricasAtualizadasEm && (
                    <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Clock className="h-3.5 w-3.5" />
                      Métricas atualizadas em {set.metricasAtualizadasEm}
                    </p>
                  )}
                </div>
              )}

              {set.linkPost && (
                <a
                  href={set.linkPost}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-4 inline-flex max-w-full items-center gap-1.5 break-all text-sm font-medium text-[#9b0ba6] hover:underline"
                >
                  {set.linkPost}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              )}

              {set.linkOuArquivo && (
                <div className="mb-4 flex items-start gap-2 text-sm">
                  <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-400">
                      {set.linkOuArquivoLabel ?? "Arquivo / link interno"}
                    </p>
                    <a
                      href={set.linkOuArquivo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-[#9b0ba6] hover:underline"
                    >
                      {set.linkOuArquivo}
                    </a>
                  </div>
                </div>
              )}

              {set.fotos.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium uppercase text-zinc-400">
                    Mídias
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {set.fotos.map((photo) => (
                      <div
                        key={photo.id}
                        className={`aspect-square rounded-xl ${photo.color} ring-1 ring-zinc-100`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => openEdit(set)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Baixar mídias
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white py-16 shadow-lg shadow-zinc-200/50">
          <Filter className="h-12 w-12 text-zinc-300" />
          <p className="mt-4 text-lg font-medium text-zinc-500">
            Nenhum conteúdo encontrado
          </p>
          <p className="text-sm text-zinc-400">Ajuste filtros ou busca</p>
        </div>
      )}
    </>
  );
}

export function RedesSociaisContent() {
  return (
    <AppShell
      title="Redes sociais"
      subtitle="Conteúdos, ideias, postagens e acompanhamento de métricas"
    >
      <RedesSociaisPageBody />
    </AppShell>
  );
}
