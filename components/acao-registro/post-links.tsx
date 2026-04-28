"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

/** Garante link clicável mesmo sem protocolo. */
export function safePostHref(raw: string): string {
  const u = raw.trim();
  if (!u) return "#";
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

type DisplayProps = {
  urls: string[];
  className?: string;
  /** Impede que clique no card pai capture o evento (ex.: expandir timeline). */
  stopCardClick?: boolean;
};

/**
 * Mesmo padrão visual do bloco “Links de postagem” da panfletagem:
 * fundo zinc, título em caixa alta, cada URL em linha com ícone de abrir fora.
 */
export function PostLinksDisplay({
  urls,
  className,
  stopCardClick,
}: DisplayProps) {
  const list = urls.map((u) => u.trim()).filter(Boolean);
  if (list.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-xl bg-zinc-50/80 p-4 sm:col-span-2",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase text-zinc-400">
        Links de postagem
      </p>
      <ul className="mt-2 space-y-2">
        {list.map((url, i) => (
          <li key={`link-${i}-${url.slice(0, 48)}`}>
            <a
              href={safePostHref(url)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stopCardClick ? (e) => e.stopPropagation() : undefined}
              className="group inline-flex max-w-full items-start gap-2 break-all text-sm font-medium text-[#9b0ba6] hover:underline"
            >
              <span className="min-w-0">{url}</span>
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-80 group-hover:opacity-100" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

type EditorProps = {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  textareaClassName?: string;
};

/** Caixa de edição alinhada ao restante dos modais de ação (ícone + título). */
export function LinksPostagemEditor({
  id,
  name,
  value,
  onChange,
  hint = "Um link por linha (Instagram, Facebook, matérias, site…). No histórico e na agenda cada linha vira um atalho clicável com ícone de abrir em nova página.",
  textareaClassName,
}: EditorProps) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-800">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#9b0ba6] shadow-sm ring-1 ring-zinc-100">
          <ExternalLink className="h-4 w-4" />
        </span>
        Links de postagem (opcional)
      </div>
      <Label htmlFor={id} className="sr-only">
        Links de postagem
      </Label>
      <Textarea
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://instagram.com/...&#10;https://facebook.com/..."
        rows={4}
        className={cn(
          "resize-y border-zinc-200 font-mono text-sm",
          textareaClassName,
        )}
      />
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">{hint}</p>
    </div>
  );
}
