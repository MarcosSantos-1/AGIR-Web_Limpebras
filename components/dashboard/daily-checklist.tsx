"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  deleteChecklistTask,
  subscribeDailyChecklist,
  upsertChecklistTask,
} from "@/lib/firestore/checklist";
import { collection, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { DailyChecklistTask } from "@/lib/checklist-types";
import { motion } from "framer-motion";
import { Check, ChevronUp, Circle, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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

export type { DailyChecklistTask };

const defaultTasks: DailyChecklistTask[] = [
  { id: 1, title: "Verificar pendências do dia", done: true },
  { id: 2, title: "Atualizar relatório de vistorias", done: true },
  { id: 3, title: "Responder solicitações urgentes", done: false },
  { id: 4, title: "Revisar fotos enviadas", done: false },
  { id: 5, title: "Confirmar agenda de amanhã", done: false },
];

function nextId(taskList: DailyChecklistTask[]) {
  if (taskList.length === 0) return 1;
  return Math.max(...taskList.map((t) => t.id)) + 1;
}

export function DailyChecklist() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [tasks, setTasks] = useState<DailyChecklistTask[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [showAddRow, setShowAddRow] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (!uid) {
      setTasks([]);
      return;
    }
    const userId = uid;
    let cancelled = false;

    async function seedDefaultsIfEmpty() {
      const db = getFirebaseDb();
      const colRef = collection(db, `users/${userId}/dailyChecklistItems`);
      try {
        const snap = await getDocs(colRef);
        if (cancelled) return;
        const key = `agir_checklist_seeded_${userId}`;
        if (
          snap.empty &&
          typeof window !== "undefined" &&
          !window.localStorage.getItem(key)
        ) {
          window.localStorage.setItem(key, "1");
          for (const t of defaultTasks) {
            await upsertChecklistTask(userId, t);
          }
        }
      } catch {
        /* seed best-effort — o listener abaixo ainda fornece estado */
      }
    }

    void seedDefaultsIfEmpty();

    const unsub = subscribeDailyChecklist(userId, (list) => {
      setTasks(list);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [uid]);

  const toggleTask = async (id: number) => {
    if (!uid) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    await upsertChecklistTask(uid, { ...task, done: !task.done });
  };

  const addTask = async () => {
    if (!uid) return;
    const t = newTitle.trim();
    if (!t) return;
    await upsertChecklistTask(uid, {
      id: nextId(tasks),
      title: t,
      done: false,
    });
    setNewTitle("");
    setShowAddRow(false);
  };

  const openEdit = (task: DailyChecklistTask) => {
    setEditingId(task.id);
    setEditDraft(task.title);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!uid) return;
    const t = editDraft.trim();
    if (!t || editingId == null) return;
    const task = tasks.find((it) => it.id === editingId);
    if (!task) return;
    await upsertChecklistTask(uid, { ...task, title: t });
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
    await deleteChecklistTask(uid, pendingDeleteId);
    setDeleteOpen(false);
    setPendingDeleteId(null);
  };

  const completedCount = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const progress = total === 0 ? 0 : (completedCount / total) * 100;

  if (!uid) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded-3xl bg-white p-5 shadow-lg shadow-zinc-200/50"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-900">
              Checklist Diário
            </h3>
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
          <p className="mt-1 text-xs text-zinc-500">
            {total === 0 ? (
              "Nenhuma tarefa — adicione abaixo"
            ) : (
              <>
                {completedCount} de {total} concluídos
              </>
            )}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-2xl font-bold text-[#9b0ba6]">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {showAddRow && (
        <div id="daily-checklist-add" className="mb-4 rounded-2xl border border-zinc-200 bg-zinc-50/90 p-3">
          <p className="mb-2 text-xs font-medium text-zinc-600">Nova tarefa</p>
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
              className="h-10 flex-1 border-zinc-200 bg-white"
            />
            <Button
              type="button"
              className="h-10 shrink-0 rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] px-4 text-white"
              onClick={addTask}
            >
              Adicionar
            </Button>
          </div>
        </div>
      )}

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="h-full rounded-full bg-gradient-to-r from-[#f318e3] to-[#6a0eaf]"
        />
      </div>

      <div className="space-y-1">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="group flex items-center gap-2 rounded-xl p-2 transition-colors hover:bg-zinc-50/80"
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1.5 text-left"
              onClick={() => toggleTask(task.id)}
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                  task.done
                    ? "bg-gradient-to-r from-[#f318e3] to-[#6a0eaf]"
                    : "border-2 border-zinc-300"
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
                  task.done ? "text-zinc-400 line-through" : "text-zinc-700"
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
                className="h-8 w-8 text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-800"
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
                className="h-8 w-8 text-red-500/85 hover:bg-red-50 hover:text-red-600"
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

      {!showAddRow && tasks.length === 0 && (
        <p className="mt-2 text-center text-xs text-zinc-400">
          Use{" "}
          <button
            type="button"
            className="font-medium text-[#9b0ba6] underline decoration-[#f318e3]/35 underline-offset-2 hover:decoration-[#f318e3]"
            onClick={() => setShowAddRow(true)}
          >
            Nova tarefa
          </button>{" "}
          para começar.
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
              className="h-11 border-zinc-200"
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
              className="rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] text-white"
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
              Essa ação não pode ser desfeita. Você poderá criar novamente pelo
              botão Nova tarefa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-zinc-200">
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
