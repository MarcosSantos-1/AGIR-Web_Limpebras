"use client";

import { useAuth } from "@/contexts/auth-context";
import { useAgendaEvents } from "@/contexts/agenda-events-context";
import { useSocialPosts } from "@/contexts/social-posts-context";
import { aggregateNotifications } from "@/lib/notifications/aggregate";
import { Bell, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function parseUserCreatedAtMs(user: {
  metadata?: { creationTime?: string };
}): number {
  const raw = user.metadata?.creationTime;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

function dismissStorageKey(uid: string): string {
  return `agir.notifications.dismissUpTo.${uid}`;
}

function readDismissFromStorage(uid: string): number | null {
  try {
    const raw = window.localStorage.getItem(dismissStorageKey(uid));
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function NotificationsMenu() {
  const { user } = useAuth();
  const { events: agendaEvents } = useAgendaEvents();
  const { posts: socialPosts } = useSocialPosts();

  /** `sortKey` máximo já “visto” — itens com `sortKey <=` este valor ficam ocultos. */
  const [clearedThroughSortKey, setClearedThroughSortKey] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (!user?.uid) {
      setClearedThroughSortKey(null);
      return;
    }
    setClearedThroughSortKey(readDismissFromStorage(user.uid));
  }, [user?.uid]);

  const persistClearedThrough = useCallback((uid: string, value: number) => {
    setClearedThroughSortKey(value);
    try {
      window.localStorage.setItem(dismissStorageKey(uid), String(value));
    } catch {
      /* ignore */
    }
  }, []);

  const userCreatedAtMs = useMemo(
    () => (user ? parseUserCreatedAtMs(user) : 0),
    [user],
  );

  const allNotifications = useMemo(
    () =>
      aggregateNotifications({
        userCreatedAtMs,
        viewerUid: user?.uid,
        agenda: agendaEvents,
        posts: socialPosts,
      }),
    [userCreatedAtMs, user?.uid, agendaEvents, socialPosts],
  );

  const visibleItems = useMemo(() => {
    if (
      clearedThroughSortKey == null ||
      typeof clearedThroughSortKey !== "number"
    ) {
      return allNotifications;
    }
    return allNotifications.filter(
      (item) => item.sortKey > clearedThroughSortKey,
    );
  }, [allNotifications, clearedThroughSortKey]);

  const handleZerarVisualizacao = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const uid = user?.uid;
      if (!uid || allNotifications.length === 0) return;
      const maxSort = Math.max(
        ...allNotifications.map((item) => item.sortKey),
      );
      const next = Math.max(
        clearedThroughSortKey ?? Number.NEGATIVE_INFINITY,
        maxSort,
      );
      persistClearedThrough(uid, next);
    },
    [
      user?.uid,
      allNotifications,
      clearedThroughSortKey,
      persistClearedThrough,
    ],
  );

  const badge = visibleItems.length > 9 ? "9+" : String(visibleItems.length);
  const showBadge = visibleItems.length > 0;

  const emptyBecauseCleared =
    visibleItems.length === 0 && allNotifications.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 transition-colors hover:bg-zinc-200"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5 text-zinc-600" />
          {showBadge && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] px-0.5 text-[10px] font-semibold text-white">
              {badge}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(100vw-1.5rem,22rem)] rounded-xl p-0 pl-2 pr-3"
      >
        <div className="flex items-start justify-between gap-2 border-b border-zinc-100 py-2 pl-0 pr-1">
          <DropdownMenuLabel className="mb-0 p-0 text-base font-semibold text-zinc-900">
            Notificações
          </DropdownMenuLabel>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 border-0 text-zinc-500 shadow-none hover:bg-zinc-100 hover:text-zinc-800"
            disabled={
              !user?.uid ||
              allNotifications.length === 0
            }
            onClick={handleZerarVisualizacao}
            aria-label="Zerar visualização"
          >
            <Trash2 className="size-4 shrink-0" aria-hidden />
          </Button>
        </div>
        <div className="max-h-[min(24rem,50vh)] overflow-y-auto py-1 pl-2">
          {visibleItems.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-zinc-500">
              {emptyBecauseCleared
                ? "Estás em dia. Novas entradas aparecem assim que forem criadas."
                : "Nenhuma notificação para mostrar (com o filtro da tua conta)."}
            </p>
          ) : (
            visibleItems.map((item) => {
              const inner = (
                <>
                  <span
                    className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${item.accent.dotClass}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                      {item.accent.categoryLabel}
                    </p>
                    <p className="truncate font-medium text-zinc-900">
                      {item.title}
                    </p>
                    {item.subtitle ? (
                      <p className="truncate text-xs text-zinc-500">
                        {item.subtitle}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-zinc-600">
                      <span className="font-medium">{item.statusLabel}</span>
                      {item.actorFirstName ? (
                        <>
                          {" "}
                          ·{" "}
                          <span className="font-bold text-zinc-800">
                            {item.actorFirstName}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                </>
              );

              if (item.href) {
                return (
                  <DropdownMenuItem
                    key={item.id}
                    asChild
                    className={`cursor-pointer gap-2 rounded-lg px-3 py-2.5 focus:bg-zinc-50 ${item.accent.borderClass} border-l-[3px]`}
                  >
                    <Link href={item.href} className="flex items-start gap-2">
                      {inner}
                    </Link>
                  </DropdownMenuItem>
                );
              }

              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-2 px-3 py-2.5 ${item.accent.borderClass} border-l-[3px]`}
                >
                  {inner}
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
