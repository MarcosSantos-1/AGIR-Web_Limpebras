"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BarChart3, CalendarDays, ClipboardList, History, Home, Images, Map, MoreHorizontal, Plus, Settings, Share2, MessageSquareWarning, RefreshCcw, Waypoints, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useNovaAcao } from "@/components/acao/nova-acao-provider";

const extraLinks = [
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/diagnosticos", label: "Diagnósticos", icon: ClipboardList },
  { href: "/solicitacoes", label: "Solicitações", icon: MessageSquareWarning },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/indicadores", label: "Indicadores", icon: BarChart3 },
  { href: "/redes-sociais", label: "Redes sociais", icon: Share2 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function MobileNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const { openModal } = useNovaAcao();
  const [panel, setPanel] = useState<"more" | "create" | null>(null);
  const itemClass = "flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium";
  return <>
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-center border-t border-zinc-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 md:hidden">
      <Link href="/" className={`${itemClass} ${pathname === "/" ? "text-accent" : "text-zinc-500"}`}><Home className="h-5 w-5" />Home</Link>
      <Link href="/mapa" className={`${itemClass} ${pathname === "/mapa" ? "text-accent" : "text-zinc-500"}`}><Map className="h-5 w-5" />Mapa</Link>
      <button aria-label="Adicionar ação" onClick={() => setPanel("create")} className="mx-auto -mt-5 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-zinc-50 bg-accent-gradient text-white shadow-accent dark:border-zinc-950"><Plus className="h-6 w-6" /></button>
      <Link href="/galeria" className={`${itemClass} ${pathname === "/galeria" ? "text-accent" : "text-zinc-500"}`}><Images className="h-5 w-5" />Galeria</Link>
      <button className={`${itemClass} text-zinc-500`} onClick={() => setPanel("more")} aria-label="Mais páginas"><MoreHorizontal className="h-5 w-5" />Mais</button>
    </nav>
    <Drawer open={panel !== null} onOpenChange={(open) => { if (!open) setPanel(null); }}><DrawerContent className="rounded-t-3xl pb-[max(1rem,env(safe-area-inset-bottom))]"><DrawerHeader><DrawerTitle>{panel === "create" ? "Adicionar" : "Todas as páginas"}</DrawerTitle><DrawerDescription>{panel === "create" ? "Escolha o que deseja registrar." : "Acesse os outros módulos do AGIR."}</DrawerDescription></DrawerHeader><div className="grid grid-cols-2 gap-2 overflow-y-auto px-4 pb-4">
      {panel === "more" ? <>{extraLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setPanel(null)} className="flex min-h-16 items-center gap-3 rounded-2xl bg-zinc-50 p-4 text-sm font-medium dark:bg-zinc-900"><Icon className="h-5 w-5 text-accent" />{label}</Link>)}<button className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700 dark:bg-red-950/30" onClick={async () => { try { await signOut(); setPanel(null); router.replace("/login"); } catch { toast.error("Não foi possível sair da conta."); } }}><LogOut className="h-5 w-5" />Sair da conta</button></> : <>
        <button onClick={() => { setPanel(null); openModal("acao-visita"); }} className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-4 text-sm dark:bg-zinc-900"><Waypoints className="h-5 w-5 text-accent" />Ação / visita</button>
        <button onClick={() => { setPanel(null); openModal("revitalizacao"); }} className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-4 text-sm dark:bg-zinc-900"><RefreshCcw className="h-5 w-5 text-accent" />Revitalização</button>
        <Link onClick={() => setPanel(null)} href="/diagnosticos/campo" className="col-span-2 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800"><ClipboardList className="h-5 w-5" />Diagnóstico em campo</Link>
      </>}
    </div></DrawerContent></Drawer>
  </>;
}
