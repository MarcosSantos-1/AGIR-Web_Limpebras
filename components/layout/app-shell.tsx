"use client";

import { NovaAcaoProvider } from "@/components/acao/nova-acao-provider";
import { ConteudoSocialModalProvider } from "@/components/redes-sociais/conteudo-social-modal-provider";
import { cn } from "@/lib/utils";
import { useCallback, useSyncExternalStore } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import Link from "next/link";

const SIDEBAR_COLLAPSED_KEY = "agir-sidebar-collapsed";
const SIDEBAR_PREFERENCE_EVENT = "agir-sidebar-preference";
let collapsedFallback = false;

function sidebarSnapshot() {
  try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1"; }
  catch { return collapsedFallback; }
}

function subscribeSidebarPreference(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(SIDEBAR_PREFERENCE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SIDEBAR_PREFERENCE_EVENT, onChange);
  };
}

function sidebarServerSnapshot() { return false; }

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  responsive?: boolean;
}

export function AppShell({ children, title, subtitle, responsive = false }: AppShellProps) {
  const sidebarCollapsed = useSyncExternalStore(subscribeSidebarPreference, sidebarSnapshot, sidebarServerSnapshot);

  const toggleSidebarCollapsed = useCallback(() => {
      const next = !sidebarSnapshot();
      collapsedFallback = next;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* storage indisponível */
      }
      window.dispatchEvent(new Event(SIDEBAR_PREFERENCE_EVENT));
  }, []);

  return (
    <NovaAcaoProvider>
      <ConteudoSocialModalProvider>
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
          <div className={responsive ? "hidden md:block" : undefined}><Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapsed={toggleSidebarCollapsed}
          /></div>
          <div
            className={cn(
              "transition-[padding] duration-200 ease-linear",
              responsive
                ? sidebarCollapsed ? "md:pl-[4.5rem]" : "md:pl-72"
                : sidebarCollapsed ? "pl-[4.5rem]" : "pl-72",
            )}
          >
            {responsive && <header className="sticky top-0 z-30 border-b bg-white/95 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 md:hidden"><h1 className="text-xl font-semibold">{title}</h1><nav aria-label="Navegação móvel" className="mt-2 flex gap-4 text-sm text-emerald-700 dark:text-emerald-400"><Link href="/">Início</Link><Link href="/mapa">Mapa</Link><Link href="/diagnosticos" aria-current="page">Diagnósticos</Link></nav></header>}
            <div className={responsive ? "hidden md:block" : undefined}><Header title={title} subtitle={subtitle} /></div>
            <main className={responsive ? "p-4 sm:p-6 lg:p-8" : "p-8"}>{children}</main>
          </div>
        </div>
      </ConteudoSocialModalProvider>
    </NovaAcaoProvider>
  );
}
