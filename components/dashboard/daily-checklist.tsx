"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  addDayChecklistItem,
  deleteDayChecklistItem,
  migrateLegacyChecklistToToday,
  setDayChecklistItemDone,
  subscribeDailyChecklistDay,
  updateDayChecklistItemTitle,
} from "@/lib/firestore/checklist";
import type { DailyChecklistDayItem } from "@/lib/checklist-types";
import { getTodayIsoInTimeZone } from "@/lib/date/week";
import { motion } from "framer-motion";
import { Check, ChevronUp, Circle, Pencil, Plus, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type { DailyChecklistDayItem };

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatChecklistDayHeading(iso: string): string {
  const d = parseISO(`${iso}T12:00:00`);
  return capitalizeFirst(
    format(d, "EEEE, d 'de' MMMM yyyy", { locale: ptBR }),
  );
}

type DailyChecklistProps = {
  selectedDate: string;
  onGoToday: () => void;
};

export function DailyChecklist({
  selectedDate,
  onGoToday,
}: DailyChecklistProps) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [items, setItems] = useState<DailyChecklistDayItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [showAddRow, setShowAddRow] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  const todayIso = getTodayIsoInTimeZone();

  useEffect(() => {
    if (!uid) return;
    void migrateLegacyChecklistToToday(uid, todayIso);
  }, [uid, todayIso]);

  useEffect(() => {
    setItems([]);
  }, [selectedDate]);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      return;
    }
    const viewing = selectedDate;
    const unsub = subscribeDailyChecklistDay(uid, viewing, (list) => {
      if (selectedDateRef.current !== viewing) return;
      setItems(list);
    });
    return () => unsub();
  }, [uid, selectedDate]);

  const toggleTask = async (id: number) => {
    if (!uid) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return;
    const row = items.find((t) => t.id === id);
    if (!row) return;
    await setDayChecklistItemDone(uid, selectedDate, id, !row.done);
  };

  const addTask = async () => {
    if (!uid) return;
    const t = newTitle.trim();
    if (!t) return;
    await addDayChecklistItem(uid, selectedDate, t);
    setNewTitle("");
    setShowAddRow(false);
  };

  const openEdit = (task: DailyChecklistDayItem) => {
    setEditingId(task.id);
    setEditDraft(task.title);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!uid) return;
    const t = editDraft.trim();
    if (!t || editingId == null) return;
    const exists = items.some((it) => it.id === editingId);
    if (!exists) return;
    await updateDayChecklistItemTitle(uid, selectedDate, editingId, t);
    setEditOpen(false);
    setEditingId(null);
    setEditDraft("");
  };

  const confirmDeleteOpen = (id: number) => {
    setPendingDeleteId(id);
    setDeleteOpen(true);
  };

  const deleteTaskConfirm = async () => {
    if (!uid || pendingDeleteId == null) return;
    await deleteDayChecklistItem(uid, selectedDate, pendingDeleteId);
    setDeleteOpen(false);
    setPendingDeleteId(null);
  };

  const completedCount = items.filter((t) => t.done).length;
  const total = items.length;
  const progress = total === 0 ? 0 : (completedCount / total) * 100;

  if (!uid) {
    return null;
  }

  const viewingToday = selectedDate === todayIso;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-card dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Checklist diário
            </h3>
            {!viewingToday ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg px-2.5 text-xs"
                onClick={onGoToday}
              >
                Hoje
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 rounded-lg px-2.5 text-xs"
              onClick={() => setShowAddRow((s) => !s)}
              aria-expanded={showAddRow}
              aria-controls="daily-checklist-add"
            >
              {showAddRow ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {showAddRow ? "Ocultar" : "Nova tarefa"}
            </Button>
          </div>
          <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
            {formatChecklistDayHeading(selectedDate)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">
            {total === 0 ? (
              "Nenhuma tarefa neste dia — adicione abaixo"
            ) : (
              <>
                {completedCount} de {total} concluídos neste dia
              </>
            )}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-2xl font-bold text-[var(--gradient-accent)]">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {showAddRow && (
        <div id="daily-checklist-add" className="mb-4 rounded-2xl border border-zinc-200 bg-zinc-50/90 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">Nova tarefa</p>
          <div className="flex gap-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTask();
                }
              }}
              placeholder="Ex.: conferir rota na manhã"
              className="h-10 flex-1 border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
            />
            <Button
              type="button"
              className="h-10 shrink-0 rounded-xl bg-accent-gradient px-4 text-white"
              onClick={addTask}
            >
              Adicionar
            </Button>
          </div>
        </div>
      )}

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="h-full rounded-full bg-accent-gradient"
        />
      </div>

      <div className="space-y-1">
        {items.map((task) => (
          <div
            key={task.id}
            className="group flex items-center gap-2 rounded-xl p-2 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800"
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1.5 text-left"
              onClick={() => toggleTask(task.id)}
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                  task.done
                    ? "bg-accent-gradient"
                    : "border-2 border-zinc-300 dark:border-zinc-600"
                }`}
              >
                {task.done ? (
                  <Check className="h-3.5 w-3.5 text-white" />
                ) : (
                  <Circle className="h-3 w-3 text-transparent" />
                )}
              </div>
              <span
                className={`min-w-0 flex-1 text-sm leading-snug ${
                  task.done ? "text-zinc-400 line-through dark:text-zinc-500" : "text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {task.title}
              </span>
            </button>
            <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(task);
                }}
                aria-label={`Editar: ${task.title}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500/85 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDeleteOpen(task.id);
                }}
                aria-label={`Excluir: ${task.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {!showAddRow && items.length === 0 && (
        <p className="mt-2 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Use{" "}
          <button
            type="button"
            className="font-medium text-[var(--gradient-accent)] underline decoration-[var(--gradient-start)]/35 underline-offset-2 hover:decoration-[var(--gradient-start)]"
            onClick={() => setShowAddRow(true)}
          >
            Nova tarefa
          </button>{" "}
          para este dia.
        </p>
      )}

      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) {
            setEditingId(null);
            setEditDraft("");
          }
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Editar tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Input
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveEdit();
                }
              }}
              className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Texto da tarefa"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setEditOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-accent-gradient text-white"
              onClick={saveEdit}
              disabled={!editDraft.trim()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove apenas esta tarefa neste dia. Você poderá criar novamente pelo
              botão Nova tarefa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-zinc-200 dark:border-zinc-700">
              Voltar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={deleteTaskConfirm}
            >
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
