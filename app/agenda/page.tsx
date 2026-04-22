"use client";

import { AppShell } from "@/components/layout/app-shell";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Filter,
  Calendar,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ExternalLink,
  Users,
  Image,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const eventTypes = [
  { id: "all", label: "Todos", color: "bg-zinc-500" },
  { id: "revitalizacao", label: "Revitalização", color: "bg-emerald-500" },
  { id: "visita-tecnica", label: "Visita Técnica", color: "bg-blue-500" },
  { id: "visita-institucional", label: "Visita Institucional", color: "bg-violet-500" },
  { id: "acao-ambiental", label: "Ação Ambiental", color: "bg-green-500" },
  { id: "reuniao", label: "Reunião", color: "bg-amber-500" },
  { id: "fiscalizacao", label: "Fiscalização", color: "bg-red-500" },
  { id: "vistoria", label: "Vistoria", color: "bg-cyan-500" },
  { id: "panfletagem", label: "Panfletagem", color: "bg-orange-500" },
];

const statusOptions = [
  { id: "pendente", label: "Pendente", icon: Clock, color: "text-amber-600 bg-amber-100" },
  { id: "concluido", label: "Concluído", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-100" },
  { id: "reagendado", label: "Reagendado", icon: RotateCcw, color: "text-blue-600 bg-blue-100" },
  { id: "cancelado", label: "Cancelado", icon: XCircle, color: "text-red-600 bg-red-100" },
];

const events = [
  {
    id: 1,
    title: "Revitalização Praça Central",
    type: "revitalizacao",
    status: "pendente",
    responsible: "Igor Supervisor",
    date: "2025-04-21",
    time: "08:00",
    endTime: "12:00",
    location: "Praça da República, Centro",
    priority: "high",
    observations: "Levar equipamentos de jardinagem",
  },
  {
    id: 2,
    title: "Visita Técnica Ecoponto",
    type: "visita-tecnica",
    status: "pendente",
    responsible: "Maria",
    date: "2025-04-21",
    time: "14:00",
    endTime: "16:00",
    location: "Ecoponto Zona Norte",
    priority: "medium",
    observations: "",
  },
  {
    id: 3,
    title: "Reunião de Equipe Semanal",
    type: "reuniao",
    status: "concluido",
    responsible: "Igor Supervisor",
    date: "2025-04-21",
    time: "17:00",
    endTime: "18:00",
    location: "Sala de Reuniões",
    priority: "low",
    observations: "Pauta: planejamento mensal",
  },
  {
    id: 4,
    title: "Fiscalização Setor Industrial",
    type: "fiscalizacao",
    status: "pendente",
    responsible: "Luciana",
    date: "2025-04-22",
    time: "09:00",
    endTime: "11:00",
    location: "R. Industrial, 500-800",
    priority: "high",
    observations: "Denúncia de descarte irregular",
  },
  {
    id: 5,
    title: "Ação Ambiental Escola",
    type: "acao-ambiental",
    status: "pendente",
    responsible: "Maria",
    date: "2025-04-22",
    time: "13:00",
    endTime: "16:00",
    location: "Escola Mun. Nova Esperança",
    priority: "medium",
    observations: "Palestra sobre reciclagem",
  },
  {
    id: 6,
    title: "Panfletagem — Conscientização Ecoponto",
    type: "panfletagem",
    status: "pendente",
    responsible: "Igor Supervisor",
    date: "2025-04-23",
    time: "08:00",
    endTime: "12:00",
    location: "Praça da República e entorno",
    priority: "medium",
    observations: "Material extra no veículo 02.",
    equipe: "Equipe Comunicação + 2 voluntários",
    panfletosDistribuidos: 850,
    locaisAtendidos: "Praça da República, Feira livre, UBS Centro",
    fotosTiradas: 24,
    linksPostagem: ["https://instagram.com", "https://facebook.com"],
  },
  {
    id: 7,
    title: "Panfletagem — Bairro Jardim",
    type: "panfletagem",
    status: "pendente",
    responsible: "Maria",
    date: "2025-04-24",
    time: "14:00",
    endTime: "17:30",
    location: "Rua das Flores, Escola Mun. Jardim",
    priority: "low",
    observations: "",
    equipe: "Maria, Luciana",
    panfletosDistribuidos: 420,
    locaisAtendidos: "Escola Mun. Jardim, comércio local (8 estabelecimentos)",
    fotosTiradas: 12,
    linksPostagem: [],
  },
];

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function AgendaPage() {
  const [selectedType, setSelectedType] = useState("all");
  const [viewMode, setViewMode] = useState<"week" | "month" | "list">("week");
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return events.filter(
      (e) =>
        e.date === dateStr &&
        (selectedType === "all" || e.type === selectedType)
    );
  };

  const getTypeConfig = (type: string) => {
    return eventTypes.find((t) => t.id === type) || eventTypes[0];
  };

  const getStatusConfig = (status: string) => {
    return statusOptions.find((s) => s.id === status) || statusOptions[0];
  };

  return (
    <AppShell title="Agenda" subtitle="Gestão de compromissos e ações">
      {/* Header Actions */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
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

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50">
            <Filter className="h-4 w-4" />
            Filtros
          </button>
          <Button className="rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] px-4 text-white shadow-lg shadow-[#f318e3]/25">
            <Plus className="mr-2 h-4 w-4" />
            Novo Evento
          </Button>
        </div>
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
            <span className={`h-2 w-2 rounded-full ${type.color}`} />
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

                    return (
                      <div
                        key={event.id}
                        className="cursor-pointer rounded-xl bg-white p-3 shadow-sm transition-all hover:shadow-md"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${typeConfig.color}`}
                          />
                          <span className="text-[10px] font-medium text-zinc-500">
                            {event.time}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-zinc-900 line-clamp-2">
                          {event.title}
                        </p>
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
                          return (
                            <div
                              key={event.id}
                              className="rounded-md border border-zinc-100 bg-zinc-50/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-800"
                              title={event.title}
                            >
                              <div className="truncate">
                                <span className={`mr-0.5 inline-block h-1.5 w-1.5 rounded-full ${typeConfig.color}`} />
                                {event.time} {event.title}
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

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {events
            .filter(
              (e) => selectedType === "all" || e.type === selectedType
            )
            .map((event, index) => {
              const typeConfig = getTypeConfig(event.type);
              const statusConfig = getStatusConfig(event.status);
              const StatusIcon = statusConfig.icon;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="cursor-pointer rounded-2xl bg-white p-5 shadow-lg shadow-zinc-200/50 transition-all hover:shadow-xl"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl ${typeConfig.color}`}
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
                        <p className="mt-1 text-sm text-[#9b0ba6]">
                          {typeConfig.label}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {event.date} • {event.time} - {event.endTime}
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
                              <div className="sm:col-span-2">
                                <p className="text-xs font-medium uppercase text-zinc-400">
                                  Links de postagem
                                </p>
                                {event.linksPostagem && event.linksPostagem.length > 0 ? (
                                  <ul className="mt-1 space-y-1">
                                    {event.linksPostagem.map((url, i) => (
                                      <li key={`${event.id}-link-${i}`}>
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 font-medium text-[#9b0ba6] hover:underline"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {url}
                                          <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-zinc-400">—</p>
                                )}
                              </div>
                            </div>
                          )}
                        {event.observations && (
                          <p className="mt-2 text-sm text-zinc-400">
                            {event.observations}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </div>
      )}
    </AppShell>
  );
}
