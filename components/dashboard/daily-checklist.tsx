"use client";

import { motion } from "framer-motion";
import { Check, Circle } from "lucide-react";
import { useState } from "react";

const initialTasks = [
  { id: 1, title: "Verificar pendências do dia", done: true },
  { id: 2, title: "Atualizar relatório de vistorias", done: true },
  { id: 3, title: "Responder solicitações urgentes", done: false },
  { id: 4, title: "Revisar fotos enviadas", done: false },
  { id: 5, title: "Confirmar agenda de amanhã", done: false },
];

export function DailyChecklist() {
  const [tasks, setTasks] = useState(initialTasks);

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    );
  };

  const completedCount = tasks.filter((t) => t.done).length;
  const progress = (completedCount / tasks.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded-3xl bg-white p-5 shadow-lg shadow-zinc-200/50"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Checklist Diário</h3>
          <p className="text-xs text-zinc-500">
            {completedCount} de {tasks.length} concluídos
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-[#9b0ba6]">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="h-full rounded-full bg-gradient-to-r from-[#f318e3] to-[#6a0eaf]"
        />
      </div>

      {/* Tasks */}
      <div className="space-y-2">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-zinc-50"
          >
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full transition-colors ${
                task.done
                  ? "bg-gradient-to-r from-[#f318e3] to-[#6a0eaf]"
                  : "border-2 border-zinc-300"
              }`}
            >
              {task.done ? (
                <Check className="h-3 w-3 text-white" />
              ) : (
                <Circle className="h-3 w-3 text-transparent" />
              )}
            </div>
            <span
              className={`text-sm ${
                task.done ? "text-zinc-400 line-through" : "text-zinc-700"
              }`}
            >
              {task.title}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
