"use client";

import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Map,
  Image,
  History,
  BarChart3,
  Settings,
  LogOut,
  Share2,
  Home,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import ImageNext from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useUserProfile } from "@/contexts/user-profile-context";
import { DEFAULT_PROFILE_GRADIENT } from "@/lib/firestore/user-profile";
import { initialsFromNome } from "@/lib/user-initials";
import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Agenda", href: "/agenda", icon: Calendar },
  { name: "Mapa", href: "/mapa", icon: Map },
  { name: "Galeria", href: "/galeria", icon: Image },
  { name: "Redes sociais", href: "/redes-sociais", icon: Share2 },
  { name: "Histórico", href: "/historico", icon: History },
  { name: "Indicadores", href: "/indicadores", icon: BarChart3 },
];

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { profile, hydrated } = useUserProfile();

  const { displayName, displayCargo, avatarInitials, gradientFrom, gradientTo } =
    useMemo(() => {
      const emailLocal = user?.email?.split("@")[0] ?? "";
      const name = profile?.nome?.trim();
      const cargo = profile?.cargo?.trim();
      const from = profile?.gradientFrom ?? DEFAULT_PROFILE_GRADIENT.from;
      const to = profile?.gradientTo ?? DEFAULT_PROFILE_GRADIENT.to;
      const initials = name
        ? initialsFromNome(name)
        : emailLocal.length >= 2
          ? emailLocal.slice(0, 2).toUpperCase()
          : emailLocal
            ? emailLocal[0]!.toUpperCase()
            : "?";
      return {
        displayName: name || emailLocal || "Utilizador",
        displayCargo: cargo || (hydrated ? "—" : "…"),
        avatarInitials: initials,
        gradientFrom: from,
        gradientTo: to,
      };
    }, [profile, user?.email, hydrated]);

  const navLink = (item: (typeof navigation)[number], isActive: boolean) => (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center rounded-xl text-sm font-medium transition-all duration-200",
        collapsed ? "mx-auto w-11 justify-center px-0 py-3" : "gap-3 px-4 py-3",
        isActive
          ? "text-white"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
      )}
    >
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf]"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <item.icon className={cn("relative z-10 h-5 w-5 shrink-0")} />
      {!collapsed && <span className="relative z-10">{item.name}</span>}
    </Link>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col bg-white shadow-xl transition-[width] duration-200 ease-linear",
          collapsed ? "w-[4.5rem]" : "w-72",
        )}
      >
        <div
          className={cn(
            "flex h-20 items-center gap-3 border-b border-transparent",
            collapsed ? "flex-col justify-center gap-2 px-2 py-3" : "px-4",
          )}
        >
          {!collapsed && (
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-zinc-50 ring-1 ring-zinc-200/80">
              <ImageNext
                src="/AGIR_logo.svg"
                alt="AGIR"
                width={44}
                height={44}
                className="object-contain p-0.5"
                priority
              />
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
                AGIR
              </h1>
              <p className="line-clamp-2 text-xs text-zinc-500">
                Gestão ambiental e comunicação
              </p>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleCollapsed}
                aria-expanded={!collapsed}
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-50 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900",
                  collapsed ? "h-9 w-9" : "h-10 w-10",
                )}
              >
                {collapsed ? (
                  <PanelLeft className="h-5 w-5" aria-hidden />
                ) : (
                  <PanelLeftClose className="h-5 w-5" aria-hidden />
                )}
                <span className="sr-only">
                  {collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[14rem]">
              {collapsed ? "Expandir menu" : "Recolher menu"}
            </TooltipContent>
          </Tooltip>
        </div>

        {collapsed && (
          <div className="flex justify-center pb-1 pt-2">
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-zinc-50 ring-1 ring-zinc-200/80">
              <ImageNext
                src="/AGIR_logo.svg"
                alt=""
                width={36}
                height={36}
                className="object-contain p-0.5"
                priority
              />
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const link = navLink(item, isActive);
            if (!collapsed) {
              return <div key={item.name}>{link}</div>;
            }
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.name}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="border-t border-zinc-100 p-3">
          {!collapsed ? (
            <>
              <Link
                href="/configuracoes"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                <Settings className="h-5 w-5" />
                <span>Configurações</span>
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  router.replace("/login");
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-5 w-5" />
                <span>Sair</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/configuracoes"
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    <Settings className="h-5 w-5" />
                    <span className="sr-only">Configurações</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Configurações</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                      router.replace("/login");
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-600 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Sair</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {!collapsed ? (
          <div className="border-t border-zinc-100 p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{
                  background: `linear-gradient(to bottom right, ${gradientFrom}, ${gradientTo})`,
                }}
              >
                {avatarInitials}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {displayName}
                </p>
                <p className="truncate text-xs text-zinc-500">{displayCargo}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t border-zinc-100 p-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="mx-auto flex h-10 w-10 cursor-default items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{
                    background: `linear-gradient(to bottom right, ${gradientFrom}, ${gradientTo})`,
                  }}
                  title={displayName}
                >
                  {avatarInitials}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[240px]">
                <p className="font-medium">{displayName}</p>
                <p className="text-xs opacity-90">{displayCargo}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
