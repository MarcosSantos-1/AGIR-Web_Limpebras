"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useAgendaEvents } from "@/contexts/agenda-events-context";
import {
  mergeAgendaHighlightIfNeeded,
  useAgendaViewportEvents,
} from "@/hooks/use-agenda-viewport-events";
import { useNovaAcao } from "@/components/acao/nova-acao-provider";
import { PostLinksDisplay } from "@/components/acao-registro/post-links";
import { agendaEventUrl, type AgendaEvent, type AgendaEventStatus } from "@/data/agenda-events";
import { formatDateBr } from "@/lib/utils";
import { agendaClockLabel } from "@/lib/agenda/time-display";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Users,
  Image,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerField } from "@/components/forms/date-picker-field";
import { serviceTypeColor } from "@/lib/constants/service-type-colors";
import { SubregionalBadge } from "@/components/subregional-badge";

const eventTypes = [
  { id: "all", label: "Todos" },
  { id: "revitalizacao", label: "Revitalização" },
  { id: "visita-tecnica", label: "Visita Técnica" },
  { id: "visita-institucional", label: "Visita Institucional" },
  { id: "acao-ambiental", label: "Ação Ambiental" },
  { id: "reuniao", label: "Reunião" },
  { id: "fiscalizacao", label: "Fiscalização" },
  { id: "vistoria", label: "Vistoria" },
  { id: "panfletagem", label: "Panfletagem" },
];

const statusOptions = [
  { id: "pendente", label: "Pendente", icon: Clock, color: "text-amber-600 bg-amber-100" },
  { id: "concluido", label: "Concluído", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-100" },
  { id: "reagendado", label: "Reagendado", icon: RotateCcw, color: "text-blue-600 bg-blue-100" },
  { id: "cancelado", label: "Cancelado", icon: XCircle, color: "text-red-600 bg-red-100" },
];

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Conteúdo da agenda — precisa ficar dentro de `AppShell` (usa `useNovaAcao`). */
function AgendaPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("event");

  const [selectedType, setSelectedType] = useState("all");
  const [viewMode, setViewMode] = useState<"week" | "month" | "list">("week");
  const [listStatusFilter, setListStatusFilter] = useState<"all" | AgendaEventStatus>("all");
  const [listDateFilter, setListDateFilter] = useState("");
  const [listSelectedId, setListSelectedId] = useState<number | null>(null);
  const [listStatusPickerOpen, setListStatusPickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const lastScrolledId = useRef<string | null>(null);

  const { getEvent, updateEvent } = useAgendaEvents();

  const { openAgendaEventForEdit } = useNovaAcao();

  const viewportExtraDates = useMemo(
    () =>
      [
        listDateFilter || undefined,
        searchParams.get("date") || undefined,
      ] as Array<string | null | undefined>,
    [listDateFilter, searchParams],
  );

  const { events: viewportEvents } = useAgendaViewportEvents(
    selectedDate,
    viewMode,
    viewportExtraDates,
  );

  const [displayEvents, setDisplayEvents] = useState<AgendaEvent[]>([]);

  useEffect(() => {
    void mergeAgendaHighlightIfNeeded(
      viewportEvents,
      highlightId,
    ).then(setDisplayEvents);
  }, [viewportEvents, highlightId]);

  const scrollToEventCard = useCallback((id: string) => {
    const el = document.getElementById(`agenda-event-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const goToEventInList = useCallback(
    (id: string | number, date: string) => {
      router.push(agendaEventUrl(id, { date, view: "list" }));
    },
    [router],
  );

  useEffect(() => {
    const d = searchParams.get("date");
    if (d) {
      const t = new Date(d + "T12:00:00");
      if (!isNaN(t.getTime())) setSelectedDate(t);
    }
    const v = searchParams.get("view");
    if (v === "list" || v === "month" || v === "week") {
      setViewMode(v);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!highlightId) {
      lastScrolledId.current = null;
      return;
    }
    const e = getEvent(highlightId);
    if (e) {
      setSelectedDate(new Date(e.date + "T12:00:00"));
      const v = searchParams.get("view");
      if (v === "list" || v === "month" || v === "week") {
        setViewMode(v);
      } else {
        setViewMode("list");
      }
    }
  }, [highlightId, searchParams, getEvent]);

  useEffect(() => {
    if (!highlightId) return;
    if (lastScrolledId.current === highlightId) return;
    const t = setTimeout(() => {
      scrollToEventCard(highlightId);
      const el = document.getElementById(`agenda-event-${highlightId}`);
      if (el) lastScrolledId.current = highlightId;
    }, 400);
    return () => clearTimeout(t);
  }, [highlightId, viewMode, selectedDate, scrollToEventCard]);

  // Generate week dates
  const getWeekDates = () => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay());
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const today = new Date().toISOString().split("T")[0];

  const buildMonthGrid = (view: Date): (Date | null)[][] => {
    const y = view.getFullYear();
    const m = view.getMonth();
    const first = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0).getDate();
    const pad = first.getDay();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < pad; i++) cells.push(null);
    for (let d = 1; d <= lastDay; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  };

  const monthLabel = selectedDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const listFilteredEvents = useMemo(() => {
    return displayEvents
      .filter(
        (e) => selectedType === "all" || e.type === selectedType
      )
      .filter(
        (e) => listStatusFilter === "all" || e.status === listStatusFilter
      )
      .filter((e) => !listDateFilter || e.date === listDateFilter)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
      );
  }, [displayEvents, selectedType, listStatusFilter, listDateFilter]);

  const getEventsForDate = useCallback(
    (date: Date) => {
      const dateStr = date.toISOString().split("T")[0];
      return displayEvents
        .filter(
          (e) =>
            e.date === dateStr &&
            (selectedType === "all" || e.type === selectedType)
        )
        .sort((a, b) => a.time.localeCompare(b.time));
    },
    [displayEvents, selectedType],
  );

  const getTypeConfig = (type: string) => {
    return eventTypes.find((t) => t.id === type) || eventTypes[0];
  };

  const getStatusConfig = (status: string) => {
    return statusOptions.find((s) => s.id === status) || statusOptions[0];
  };

  return (
    <>
      {/* Header Actions */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button
          variant={viewMode === "week" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("week")}
          className={
            viewMode === "week"
              ? "rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] text-white"
              : "rounded-xl"
          }
        >
          <Calendar className="mr-2 h-4 w-4" />
          Semana
        </Button>
        <Button
          variant={viewMode === "month" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("month")}
          className={
            viewMode === "month"
              ? "rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] text-white"
              : "rounded-xl"
          }
        >
          <Calendar className="mr-2 h-4 w-4" />
          Mês
        </Button>
        <Button
          variant={viewMode === "list" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("list")}
          className={
            viewMode === "list"
              ? "rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] text-white"
              : "rounded-xl"
          }
        >
          Lista
        </Button>
      </div>

      {/* Type Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {eventTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              selectedType === type.id
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-600 shadow-sm hover:bg-zinc-50"
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: serviceTypeColor(type.id) }}
            />
            {type.label}
          </button>
        ))}
      </div>

      {/* Week Navigation */}
      {viewMode === "week" && (
        <div className="mb-6 flex items-center justify-between rounded-2xl bg-white p-4 shadow-lg shadow-zinc-200/50">
          <button
            type="button"
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(newDate.getDate() - 7);
              setSelectedDate(newDate);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex flex-1 justify-center gap-4">
            {weekDates.map((date, index) => {
              const dateStr = date.toISOString().split("T")[0];
              const isTodayCell = dateStr === today;
              const hasEvents = getEventsForDate(date).length > 0;

              return (
                <button
                  type="button"
                  key={index}
                  className={`flex flex-col items-center rounded-xl px-4 py-2 transition-all ${
                    isTodayCell
                      ? "bg-gradient-to-br from-[#f318e3] to-[#6a0eaf] text-white"
                      : "hover:bg-zinc-100"
                  }`}
                >
                  <span
                    className={`text-xs font-medium ${
                      isTodayCell ? "text-white/80" : "text-zinc-400"
                    }`}
                  >
                    {weekDays[index]}
                  </span>
                  <span
                    className={`mt-1 text-xl font-semibold ${
                      isTodayCell ? "text-white" : "text-zinc-900"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {hasEvents && !isTodayCell && (
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#f318e3]" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(newDate.getDate() + 7);
              setSelectedDate(newDate);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Month Navigation */}
      {viewMode === "month" && (
        <div className="mb-6 flex items-center justify-between rounded-2xl bg-white p-4 shadow-lg shadow-zinc-200/50">
          <button
            type="button"
            onClick={() => {
              const d = new Date(selectedDate);
              d.setMonth(d.getMonth() - 1);
              setSelectedDate(d);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold capitalize text-zinc-900">
            {monthLabel}
          </h2>
          <button
            type="button"
            onClick={() => {
              const d = new Date(selectedDate);
              d.setMonth(d.getMonth() + 1);
              setSelectedDate(d);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Week View */}
      {viewMode === "week" && (
        <div className="grid grid-cols-7 gap-4">
          {weekDates.map((date, index) => {
            const dayEvents = getEventsForDate(date);
            const dateStr = date.toISOString().split("T")[0];
            const isToday = dateStr === today;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`min-h-[400px] rounded-2xl p-4 ${
                  isToday
                    ? "bg-gradient-to-br from-[#f318e3]/5 to-[#6a0eaf]/5 ring-2 ring-[#f318e3]/20"
                    : "bg-white shadow-lg shadow-zinc-200/50"
                }`}
              >
                <div className="mb-3 text-center">
                  <p className="text-xs font-medium uppercase text-zinc-400">
                    {weekDays[index]}
                  </p>
                  <p
                    className={`text-xl font-semibold ${
                      isToday ? "text-[#9b0ba6]" : "text-zinc-900"
                    }`}
                  >
                    {date.getDate()}
                  </p>
                </div>

                <div className="space-y-2">
                  {dayEvents.map((event) => {
                    const typeConfig = getTypeConfig(event.type);
                    const statusConfig = getStatusConfig(event.status);
                    const StatusIcon = statusConfig.icon;
                    const isHighlight =
                      highlightId === String(event.id);

                    return (
                      <div
                        key={event.id}
                        id={`agenda-event-${event.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => goToEventInList(event.id, event.date)}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            goToEventInList(event.id, event.date);
                          }
                        }}
                        className={`cursor-pointer rounded-xl bg-white p-3 shadow-sm transition-all hover:shadow-md ${
                          isHighlight
                            ? "ring-2 ring-[#f318e3]/50 ring-offset-1 ring-offset-white"
                            : ""
                        }`}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: serviceTypeColor(
                                event.type,
                              ),
                            }}
                          />
                          <span className="text-[10px] font-medium text-zinc-500">
                            {event.time}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-zinc-900 line-clamp-2">
                          {event.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className="text-[10px] font-semibold"
                            style={{
                              color: serviceTypeColor(event.type),
                            }}
                          >
                            {typeConfig.label}
                          </span>
                          <SubregionalBadge
                            subregional={event.subregional}
                            size="compact"
                          />
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          <StatusIcon className={`h-3 w-3 ${statusConfig.color.split(" ")[0]}`} />
                          <span className="text-[10px] text-zinc-500">
                            {statusConfig.label}
                          </span>
                        </div>
                        {event.type === "panfletagem" &&
                          "panfletosDistribuidos" in event && (
                            <p className="mt-1.5 line-clamp-2 text-[10px] leading-tight text-zinc-500">
                              {event.panfletosDistribuidos} panfletos ·{" "}
                              {event.locaisAtendidos}
                            </p>
                          )}
                      </div>
                    );
                  })}
                  {dayEvents.length === 0 && (
                    <p className="py-8 text-center text-xs text-zinc-400">
                      Sem eventos
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Month View */}
      {viewMode === "month" && (
        <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow-lg shadow-zinc-200/50">
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-zinc-400">
            {weekDays.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="space-y-1">
            {buildMonthGrid(selectedDate).map((row, ri) => (
              <div key={ri} className="grid grid-cols-7 gap-1">
                {row.map((date, ci) => {
                  if (!date) {
                    return (
                      <div
                        key={`empty-${ri}-${ci}`}
                        className="min-h-[120px] rounded-xl bg-zinc-50/50"
                      />
                    );
                  }
                  const dateStr = date.toISOString().split("T")[0];
                  const isTodayCell = dateStr === today;
                  const dayEvents = getEventsForDate(date);
                  return (
                    <div
                      key={dateStr}
                      className={`min-h-[120px] rounded-xl border border-zinc-100 p-2 ${
                        isTodayCell
                          ? "bg-gradient-to-br from-[#f318e3]/5 to-[#6a0eaf]/5 ring-2 ring-[#f318e3]/25"
                          : "bg-white"
                      }`}
                    >
                      <p
                        className={`text-sm font-semibold ${
                          isTodayCell ? "text-[#9b0ba6]" : "text-zinc-900"
                        }`}
                      >
                        {date.getDate()}
                      </p>
                      <div className="mt-1 space-y-1">
                        {dayEvents.map((event) => {
                          const typeConfig = getTypeConfig(event.type);
                          const isHighlight =
                            highlightId === String(event.id);
                          return (
                            <div
                              key={event.id}
                              id={`agenda-event-${event.id}`}
                              role="button"
                              tabIndex={0}
                              onClick={() => goToEventInList(event.id, event.date)}
                              onKeyDown={(ev) => {
                                if (ev.key === "Enter" || ev.key === " ") {
                                  ev.preventDefault();
                                  goToEventInList(event.id, event.date);
                                }
                              }}
                              className={`cursor-pointer rounded-md border border-zinc-100 bg-zinc-50/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-800 ${
                                isHighlight
                                  ? "ring-2 ring-[#f318e3]/50 ring-offset-1"
                                  : ""
                              }`}
                              title={event.title}
                            >
                              <div className="truncate">
                                <span
                                  className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full"
                                  style={{
                                    backgroundColor: serviceTypeColor(
                                      event.type,
                                    ),
                                  }}
                                />
                                {event.time} {event.title}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                <span
                                  className="truncate text-[9px] font-medium text-zinc-600"
                                  style={{
                                    color: serviceTypeColor(event.type),
                                  }}
                                >
                                  {typeConfig.label}
                                </span>
                                <SubregionalBadge
                                  subregional={event.subregional}
                                  size="compact"
                                  className="max-w-[6rem]"
                                />
                              </div>
                              {event.type === "panfletagem" &&
                                "panfletosDistribuidos" in event && (
                                  <p className="mt-0.5 line-clamp-2 text-[9px] font-normal leading-tight text-zinc-500">
                                    {event.panfletosDistribuidos} panfletos
                                  </p>
                                )}
                            </div>
                          );
                        })}
                        {dayEvents.length === 0 && (
                          <p className="pt-1 text-[10px] text-zinc-300">—</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === "list" && (
        <div className="mb-4 flex flex-wrap items-end gap-4 rounded-2xl bg-white p-4 shadow-lg shadow-zinc-200/50">
          <div className="min-w-[200px] flex-1 max-w-xs">
            <span className="mb-1 block text-xs font-medium text-zinc-500">
              Status
            </span>
            <Select
              value={listStatusFilter}
              onValueChange={(v) =>
                setListStatusFilter(v as "all" | AgendaEventStatus)
              }
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-zinc-200 bg-zinc-50 shadow-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-zinc-500">
              Data
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-[200px]">
                <DatePickerField
                  value={listDateFilter}
                  onChange={setListDateFilter}
                  placeholder="Todas as datas"
                />
              </div>
              {listDateFilter && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setListDateFilter("")}
                >
                  Limpar data
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {listFilteredEvents.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-500">
              Nenhum evento com os filtros atuais.
            </p>
          )}
          {listFilteredEvents.map((event, index) => {
              const typeConfig = getTypeConfig(event.type);
              const statusConfig = getStatusConfig(event.status);
              const StatusIcon = statusConfig.icon;
              const isHighlight =
                highlightId === String(event.id);
              const isListSelected = listSelectedId === event.id;

              return (
                <motion.div
                  key={event.id}
                  id={`agenda-event-${event.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    setListSelectedId((x) => {
                      if (x === event.id) {
                        setListStatusPickerOpen(false);
                        return null;
                      }
                      setListStatusPickerOpen(false);
                      return event.id;
                    });
                  }}
                  className={`cursor-pointer rounded-2xl bg-white p-5 shadow-lg shadow-zinc-200/50 transition-all hover:shadow-xl ${
                    isHighlight
                      ? "ring-2 ring-[#f318e3]/50 ring-offset-2 ring-offset-zinc-50"
                      : isListSelected
                        ? "ring-2 ring-zinc-300 ring-offset-2"
                        : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
                        style={{
                          backgroundColor: serviceTypeColor(event.type),
                        }}
                      >
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-zinc-900">
                            {event.title}
                          </h4>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}
                          >
                            <StatusIcon className="mr-1 inline h-3 w-3" />
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p
                            className="text-sm font-medium"
                            style={{ color: serviceTypeColor(event.type) }}
                          >
                            {typeConfig.label}
                          </p>
                          <SubregionalBadge subregional={event.subregional} />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDateBr(event.date)} • {agendaClockLabel(event)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {event.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {event.responsible}
                          </span>
                        </div>
                        {event.type === "panfletagem" &&
                          "equipe" in event &&
                          event.equipe && (
                            <div className="mt-4 grid gap-3 rounded-xl bg-zinc-50/80 p-4 text-sm text-zinc-600 sm:grid-cols-2">
                              <div className="flex items-start gap-2">
                                <Users className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                                <div>
                                  <p className="text-xs font-medium uppercase text-zinc-400">
                                    Equipe
                                  </p>
                                  <p className="text-zinc-800">{event.equipe}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-medium uppercase text-zinc-400">
                                  Panfletos distribuídos
                                </p>
                                <p className="text-zinc-800">
                                  {event.panfletosDistribuidos?.toLocaleString("pt-BR")}
                                </p>
                              </div>
                              <div className="sm:col-span-2">
                                <p className="text-xs font-medium uppercase text-zinc-400">
                                  Locais atendidos
                                </p>
                                <p className="text-zinc-800">{event.locaisAtendidos}</p>
                              </div>
                              <div className="flex items-start gap-2">
                                <Image className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                                <div>
                                  <p className="text-xs font-medium uppercase text-zinc-400">
                                    Fotos tiradas
                                  </p>
                                  <p className="text-zinc-800">{event.fotosTiradas}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        {event.linksPostagem && event.linksPostagem.length > 0 && (
                          <div className="mt-4">
                            <PostLinksDisplay
                              urls={event.linksPostagem}
                              stopCardClick
                            />
                          </div>
                        )}
                        {event.status === "concluido" && event.completionDescription && (
                          <p className="mt-2 text-sm text-zinc-700">
                            <span className="font-medium text-zinc-600">Registro: </span>
                            {event.completionDescription}
                          </p>
                        )}
                        {event.completionPhotoDataUrls &&
                          event.completionPhotoDataUrls.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {event.completionPhotoDataUrls.map((url, i) => (
                                <div
                                  key={`p-${event.id}-${i}`}
                                  className="h-16 w-16 overflow-hidden rounded-lg border border-zinc-100"
                                >
                                  <img
                                    src={url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        {event.observations && (
                          <p className="mt-2 text-sm text-zinc-400">
                            {event.observations}
                          </p>
                        )}
                        {isListSelected && (
                          <div
                            className="mt-4 space-y-3 border-t border-zinc-100 pt-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {!listStatusPickerOpen ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl border-zinc-200 text-zinc-800 hover:bg-zinc-50"
                                onClick={() => setListStatusPickerOpen(true)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar / alterar status
                              </Button>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-zinc-500">
                                  Escolha o status
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {statusOptions.map((s) => {
                                    const SIcon = s.icon;
                                    const isCurrent = event.status === s.id;
                                    return (
                                      <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => {
                                          if (s.id === "concluido") {
                                            openAgendaEventForEdit(event.id, {
                                              openAsFinalizado: true,
                                            });
                                            setListStatusPickerOpen(false);
                                            setListSelectedId(null);
                                            return;
                                          }
                                          if (s.id === "pendente" && event.status === "pendente") {
                                            openAgendaEventForEdit(event.id);
                                            setListStatusPickerOpen(false);
                                            setListSelectedId(null);
                                            return;
                                          }
                                          if (s.id === event.status) {
                                            setListStatusPickerOpen(false);
                                            return;
                                          }
                                          updateEvent(event.id, {
                                            status: s.id as AgendaEventStatus,
                                          });
                                          setListStatusPickerOpen(false);
                                        }}
                                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#f318e3]/30 ${
                                          isCurrent
                                            ? "ring-2 ring-[#f318e3]/40 " + s.color
                                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                        }`}
                                      >
                                        <SIcon className="h-3.5 w-3.5" />
                                        {s.label}
                                        {isCurrent && (
                                          <span className="text-[10px] font-normal text-zinc-500">
                                            (atual)
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-zinc-500"
                                  onClick={() => setListStatusPickerOpen(false)}
                                >
                                  Voltar
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </div>
      )}
    </>
  );
}

/** Rota `/agenda` — `AppShell` fornece `NovaAcaoProvider` para edição/conclusão inline. */
export function AgendaPageClient() {
  return (
    <AppShell title="Agenda" subtitle="Gestão de compromissos e ações">
      <AgendaPageContent />
    </AppShell>
  );
}
