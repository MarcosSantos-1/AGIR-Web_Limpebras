"use client";

import { useNovaAcao } from "@/components/acao/nova-acao-provider";
import { useConteudoSocialModal } from "@/components/redes-sociais/conteudo-social-modal-provider";
import { motion } from "framer-motion";
import { Map, Waypoints, RefreshCcw, Sparkles } from "lucide-react";
import Link from "next/link";

const actionButtons = [
  {
    key: "acao-visita" as const,
    label: "Ação / Visita",
    icon: Waypoints,
    color: "from-[#f318e3] to-[#6a0eaf]",
  },
  {
    key: "revitalizacao" as const,
    label: "Revitalização",
    icon: RefreshCcw,
    color: "from-blue-500 to-blue-600",
  },
] as const;

export function QuickActions() {
  const { openModal } = useNovaAcao();
  const { open: openConteudoModal } = useConteudoSocialModal();

  return (
    <div className="">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Ações Rápidas
      </h3>
      <div className="flex flex-wrap gap-3">
        {actionButtons.map((action, index) => (
          <motion.button
            key={action.key}
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openModal(action.key)}
            className={`flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${action.color} py-3.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl`}
          >
            <action.icon className="h-4 w-4" />
            <span>{action.label}</span>
          </motion.button>
        ))}
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: actionButtons.length * 0.05 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => openConteudoModal()}
          className="flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl"
        >
          <Sparkles className="h-4 w-4" />
          <span>Novo conteúdo</span>
        </motion.button>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: (actionButtons.length + 1) * 0.05 }}
          className="flex min-w-[140px] flex-1"
        >
          <Link
            href="/mapa"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl"
          >
            <Map className="h-4 w-4" />
            <span>Abrir mapa</span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
