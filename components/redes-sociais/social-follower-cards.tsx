"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSocialFollowers } from "@/contexts/social-followers-context";
import { SOCIAL_NETWORK_ORDER } from "@/data/social-followers";
import type { SocialPublicationRede } from "@/data/social-posts";
import { SOCIAL_PUBLICATION_REDE_LABELS } from "@/data/social-posts";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function IconLinkedIn({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const CARD_STYLES: Record<
  SocialPublicationRede,
  { accent: string; iconWrap: string; ring: string }
> = {
  facebook: {
    accent: "from-[#1877F2]/15 to-[#1877F2]/5",
    iconWrap: "bg-[#1877F2]/15 text-[#1877F2]",
    ring: "ring-[#1877F2]/25",
  },
  instagram: {
    accent: "from-[#f09433]/20 via-[#dc2743]/15 to-[#bc1888]/15",
    iconWrap:
      "bg-gradient-to-br from-[#f09433]/30 via-[#dc2743]/25 to-[#bc1888]/25 text-[#c13584]",
    ring: "ring-[#dc2743]/30",
  },
  linkedin: {
    accent: "from-[#0A66C2]/15 to-[#0A66C2]/5",
    iconWrap: "bg-[#0A66C2]/15 text-[#0A66C2]",
    ring: "ring-[#0A66C2]/25",
  },
};

const ICONS: Record<SocialPublicationRede, React.ReactNode> = {
  facebook: <IconFacebook className="h-6 w-6" />,
  instagram: <IconInstagram className="h-6 w-6" />,
  linkedin: <IconLinkedIn className="h-6 w-6" />,
};

type FollowerCounts = ReturnType<typeof useSocialFollowers>["counts"];

function formatAtualizado(ms: number | null): string {
  if (ms == null) return "Ainda sem atualização registada";
  return new Date(ms).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function countForRede(rede: SocialPublicationRede, c: FollowerCounts): number {
  if (rede === "facebook") return c.facebook;
  if (rede === "instagram") return c.instagram;
  return c.linkedin;
}

function updatedMsForRede(rede: SocialPublicationRede, c: FollowerCounts): number | null {
  if (rede === "facebook") return c.atualizadoEmMsFacebook;
  if (rede === "instagram") return c.atualizadoEmMsInstagram;
  return c.atualizadoEmMsLinkedin;
}

function FollowerCard({ rede }: { rede: SocialPublicationRede }) {
  const { counts, setFollowers } = useSocialFollowers();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const styles = CARD_STYLES[rede];
  const n = countForRede(rede, counts);
  const updated = updatedMsForRede(rede, counts);

  React.useEffect(() => {
    if (open) setDraft(String(n));
  }, [open, n]);

  const salvar = async () => {
    const parsed = Number.parseInt(draft.replace(/\D/g, ""), 10);
    const val = Number.isFinite(parsed) ? parsed : 0;
    setSaving(true);
    try {
      await setFollowers(rede, val);
      toast.success(`${SOCIAL_PUBLICATION_REDE_LABELS[rede]} atualizado`);
      setOpen(false);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Não foi possível guardar os seguidores",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full rounded-2xl bg-gradient-to-br p-[1px] text-left shadow-lg shadow-zinc-200/40 transition hover:shadow-xl hover:shadow-zinc-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b0ba6]/40",
            styles.ring,
          )}
        >
          <div
            className={cn(
              "flex h-full flex-col rounded-2xl bg-gradient-to-br p-5",
              styles.accent,
              "from-white/95 to-white/80 backdrop-blur-sm",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  styles.iconWrap,
                )}
              >
                {ICONS[rede]}
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Toque para editar
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-zinc-500">
              {SOCIAL_PUBLICATION_REDE_LABELS[rede]}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
              {n.toLocaleString("pt-BR")}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">seguidores</p>
            <p className="mt-3 border-t border-zinc-200/80 pt-2 text-xs text-zinc-600">
              <span className="font-medium text-zinc-700">Última atualização:</span>
              <br />
              {formatAtualizado(updated)}
            </p>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 rounded-xl" align="center">
        <div className="space-y-3">
          <div>
            <Label htmlFor={`seg-${rede}`}>
              Seguidores — {SOCIAL_PUBLICATION_REDE_LABELS[rede]}
            </Label>
            <Input
              id={`seg-${rede}`}
              type="text"
              inputMode="numeric"
              className="mt-1.5 h-10"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="0"
              disabled={saving}
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full rounded-lg"
            disabled={saving}
            onClick={() => void salvar()}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A guardar…
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SocialFollowerCards() {
  const { hydrated } = useSocialFollowers();
  if (!hydrated) {
    return (
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[200px] animate-pulse rounded-2xl bg-zinc-200/70 shadow-inner"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {SOCIAL_NETWORK_ORDER.map((rede, i) => (
        <motion.div
          key={rede}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <FollowerCard rede={rede} />
        </motion.div>
      ))}
    </div>
  );
}
