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
} from "lucide-react";
import ImageNext from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useUserProfile } from "@/contexts/user-profile-context";
import { DEFAULT_PROFILE_GRADIENT } from "@/lib/firestore/user-profile";
import { initialsFromNome } from "@/lib/user-initials";
import { useMemo } from "react";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Agenda", href: "/agenda", icon: Calendar },
  { name: "Mapa", href: "/mapa", icon: Map },
  { name: "Galeria", href: "/galeria", icon: Image },
  { name: "Redes sociais", href: "/redes-sociais", icon: Share2 },
  { name: "Histórico", href: "/historico", icon: History },
  { name: "Indicadores", href: "/indicadores", icon: BarChart3 },
];

export function Sidebar() {
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

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-72 flex-col bg-white shadow-xl">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 px-6">
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
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
            AGIR
          </h1>
          <p className="text-xs text-zinc-500">Gestão ambiental e comunicação</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon className={cn("relative z-10 h-5 w-5")} />
              <span className="relative z-10">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-zinc-100 p-3">
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
      </div>

      {/* User Info */}
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
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-zinc-900">
              {displayName}
            </p>
            <p className="truncate text-xs text-zinc-500">{displayCargo}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
