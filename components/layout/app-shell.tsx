"use client";

import { NovaAcaoProvider } from "@/components/acao/nova-acao-provider";
import { ConteudoSocialModalProvider } from "@/components/redes-sociais/conteudo-social-modal-provider";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

const SIDEBAR_COLLAPSED_KEY = "agir-sidebar-collapsed";

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);

  useEffect(() => {
    try {
      setSidebarCollapsedState(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      /* storage indisponível */
    }
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* storage indisponível */
      }
      return next;
    });
  }, []);

  return (
    <NovaAcaoProvider>
      <ConteudoSocialModalProvider>
        <div className="min-h-screen bg-zinc-50">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapsed={toggleSidebarCollapsed}
          />
          <div
            className={cn(
              "transition-[padding] duration-200 ease-linear",
              sidebarCollapsed ? "pl-[4.5rem]" : "pl-72",
            )}
          >
            <Header title={title} subtitle={subtitle} />
            <main className="p-8">{children}</main>
          </div>
        </div>
      </ConteudoSocialModalProvider>
    </NovaAcaoProvider>
  );
}
