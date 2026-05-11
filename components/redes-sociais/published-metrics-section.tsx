"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSocialPosts } from "@/contexts/social-posts-context";
import type { SocialPost } from "@/data/social-posts";
import { formatSocialMetricsUpdatedAtPt } from "@/lib/utils";
import { Clock, Eye, Heart, Loader2, Share } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function digitCountOnly(raw: string): number {
  const d = raw.replace(/\D/g, "");
  return d === "" ? 0 : Number(d);
}

/** Bloco de vistas/curtidas para conteúdos publicados: leitura inline e edição ao focar inputs. */
export function PublishedMetricsSection({ post }: { post: SocialPost }) {
  const { persistPost } = useSocialPosts();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftViews, setDraftViews] = useState("");
  const [draftCurtidas, setDraftCurtidas] = useState("");
  const editableRef = useRef<HTMLDivElement>(null);
  const viewsInputId = `social-metric-views-${post.id}`;

  const syncDraftFromPost = useCallback(() => {
    setDraftViews(
      post.visualizacoes != null ? String(post.visualizacoes) : "",
    );
    setDraftCurtidas(post.curtidas != null ? String(post.curtidas) : "");
  }, [post.visualizacoes, post.curtidas]);

  useEffect(() => {
    if (!editing) syncDraftFromPost();
  }, [editing, syncDraftFromPost]);

  useEffect(() => {
    if (!editing) return;
    const id = window.requestAnimationFrame(() => {
      document.getElementById(viewsInputId)?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [editing, viewsInputId]);

  const commitAndLeave = async () => {
    if (!editing || saving) return;
    const nextV = digitCountOnly(draftViews);
    const nextC = digitCountOnly(draftCurtidas);
    const prevV = post.visualizacoes ?? 0;
    const prevC = post.curtidas ?? 0;

    if (nextV === prevV && nextC === prevC) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      await persistPost({
        ...post,
        visualizacoes: nextV,
        curtidas: nextC,
        metricasAtualizadasEm: formatSocialMetricsUpdatedAtPt(),
      });
      toast.success("Métricas atualizadas.");
      setEditing(false);
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Não foi possível salvar as métricas.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleActivateEdit = () => {
    syncDraftFromPost();
    setEditing(true);
  };

  const handleEditableBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && editableRef.current?.contains(next)) return;

    window.setTimeout(() => {
      const root = editableRef.current;
      if (!root) return;
      if (!root.contains(document.activeElement)) {
        void commitAndLeave();
      }
    }, 0);
  };

  const hasTimestamp = Boolean(post.metricasAtualizadasEm?.trim());

  return (
    <div className="mb-4 space-y-3 rounded-2xl bg-zinc-50/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Acompanhamento
        </p>
        {!editing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            title={
              hasTimestamp
                ? "Atualizar métricas (views e curtidas)"
                : "Registrar views e curtidas"
            }
            className={
              hasTimestamp
                ? "h-9 w-9 shrink-0 rounded-lg border-zinc-200 p-0"
                : "gap-1.5 rounded-lg text-xs font-normal text-zinc-600"
            }
            onClick={handleActivateEdit}
          >
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {hasTimestamp ? (
              <span className="sr-only">Atualizar métricas</span>
            ) : (
              <span>Registrar métricas</span>
            )}
          </Button>
        ) : null}
      </div>

      <div
        ref={editableRef}
        onBlur={handleEditableBlur}
        className={
          editing
            ? "rounded-xl ring-2 ring-[#f318e3]/25 ring-offset-2 ring-offset-zinc-50"
            : undefined
        }
      >
        {!editing ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-800">
                <Eye className="h-4 w-4 shrink-0 text-blue-500" />
                {post.visualizacoes != null ? (
                  <>
                    <span className="tabular-nums">
                      {post.visualizacoes.toLocaleString("pt-BR")}
                    </span>
                    <span className="text-zinc-500">views</span>
                  </>
                ) : (
                  <span className="tabular-nums text-zinc-400">—</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-800">
                <Heart className="h-4 w-4 shrink-0 text-red-500" />
                {post.curtidas != null ? (
                  <span className="tabular-nums">
                    {post.curtidas.toLocaleString("pt-BR")}
                  </span>
                ) : (
                  <span className="tabular-nums text-zinc-400">—</span>
                )}
              </div>
            </div>
            {post.compartilhamentos != null && (
              <div className="flex items-center gap-2 text-sm text-zinc-800">
                <Share className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  {post.compartilhamentos.toLocaleString("pt-BR")}{" "}
                  <span className="text-zinc-500">compartilhamentos</span>
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1 font-medium uppercase tracking-wide">
                  <Eye className="h-3 w-3 text-blue-500" />
                  Views
                </span>
                <Input
                  id={viewsInputId}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={draftViews}
                  onChange={(e) => setDraftViews(e.target.value)}
                  disabled={saving}
                  className="h-10 rounded-xl border-zinc-200 bg-white text-sm tabular-nums"
                  placeholder="0"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1 font-medium uppercase tracking-wide">
                  <Heart className="h-3 w-3 text-red-500" />
                  Curtidas
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={draftCurtidas}
                  onChange={(e) => setDraftCurtidas(e.target.value)}
                  disabled={saving}
                  className="h-10 rounded-xl border-zinc-200 bg-white text-sm tabular-nums"
                  placeholder="0"
                />
              </label>
            </div>
            {saving ? (
              <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Salvando…
              </p>
            ) : (
              <p className="text-xs text-zinc-400">
                Clique fora desta área para salvar.
              </p>
            )}
          </div>
        )}
      </div>

      {hasTimestamp ? (
        <p className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Métricas atualizadas em {post.metricasAtualizadasEm}
        </p>
      ) : null}
    </div>
  );
}
