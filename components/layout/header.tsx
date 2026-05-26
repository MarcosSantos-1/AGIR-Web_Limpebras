"use client";

import { useNovaAcao } from "@/components/acao/nova-acao-provider";
import { useConteudoSocialModal } from "@/components/redes-sociais/conteudo-social-modal-provider";
import { Plus, ChevronDown, Waypoints, RefreshCcw, Sparkles } from "lucide-react";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { openModal } = useNovaAcao();
  const { open: openConteudoModal } = useConteudoSocialModal();

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-zinc-100 bg-white/80 px-8 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">

        {/* Quick Add */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-10 gap-2 rounded-xl bg-accent-gradient px-4 text-sm font-medium text-white shadow-accent hover:opacity-90">
              <Plus className="h-4 w-4" />
              <span>Nova Ação</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-xl p-2">
            <DropdownMenuItem
              className="cursor-pointer gap-3 rounded-lg py-2.5"
              onSelect={() => openModal("acao-visita")}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-[var(--gradient-start)]/15 to-[var(--gradient-end)]/15 text-accent">
                <Waypoints className="h-4 w-4" />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">Ação / Visita</span>
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  Agendar ou registrar concluída
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-3 rounded-lg py-2.5"
              onSelect={() => openModal("revitalizacao")}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <RefreshCcw className="h-4 w-4" />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">Revitalização</span>
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  Quantitativos e registro
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-3 rounded-lg py-2.5"
              onSelect={() => openConteudoModal()}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">Novo conteúdo</span>
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  Redes sociais (modal)
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <NotificationsMenu />
      </div>
    </header>
  );
}
