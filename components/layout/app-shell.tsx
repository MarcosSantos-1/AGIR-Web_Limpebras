"use client";

import { NovaAcaoProvider } from "@/components/acao/nova-acao-provider";
import { ConteudoSocialModalProvider } from "@/components/redes-sociais/conteudo-social-modal-provider";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
  return (
    <NovaAcaoProvider>
      <ConteudoSocialModalProvider>
        <div className="min-h-screen bg-zinc-50">
          <Sidebar />
          <div className="pl-72">
            <Header title={title} subtitle={subtitle} />
            <main className="p-8">{children}</main>
          </div>
        </div>
      </ConteudoSocialModalProvider>
    </NovaAcaoProvider>
  );
}
