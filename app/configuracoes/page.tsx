"use client";

import { AppShell } from "@/components/layout/app-shell";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  User,
  Palette,
  Database,
  HelpCircle,
  ChevronRight,
  Check,
  Moon,
  Sun,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/settings/profile-form";

/** Suporte pelo WhatsApp Business (texto pré-preenchido). */
const WHATSAPP_SUPPORT_URL =
  "https://api.whatsapp.com/send?phone=5511964821876&text=Ol%C3%A1,%20gostaria%20de%20solicitar%20uma%20nova%20senha%20para%20o%20meu%20usu%C3%A1rio.";

const settingsSections = [
  {
    id: "perfil",
    label: "Perfil",
    icon: User,
    description: "Informações pessoais e conta",
  },
  {
    id: "aparencia",
    label: "Aparência",
    icon: Palette,
    description: "Tema e personalização — em desenvolvimento",
  },
  {
    id: "dados",
    label: "Dados",
    icon: Database,
    description: "Exportar registros salvos na nuvem",
  },
  {
    id: "ajuda",
    label: "Ajuda",
    icon: HelpCircle,
    description: "Suporte pelo WhatsApp",
  },
];

export default function ConfiguracoesPage() {
  const [activeSection, setActiveSection] = useState("perfil");

  return (
    <AppShell title="Configurações" subtitle="Personalize sua experiência">
      <div className="flex gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-72 shrink-0"
        >
          <div className="rounded-2xl bg-white p-4 shadow-lg shadow-zinc-200/50">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-[#f318e3]/10 to-[#6a0eaf]/10"
                      : "hover:bg-zinc-50"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      isActive
                        ? "bg-gradient-to-r from-[#f318e3] to-[#6a0eaf]"
                        : "bg-zinc-100"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${isActive ? "text-white" : "text-zinc-500"}`}
                    />
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${isActive ? "text-[#9b0ba6]" : "text-zinc-900"}`}
                    >
                      {section.label}
                    </p>
                    <p className="text-xs text-zinc-500">{section.description}</p>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 ${isActive ? "text-[#9b0ba6]" : "text-zinc-300"}`}
                  />
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1"
        >
          {activeSection === "perfil" && (
            <div className="space-y-6">
              <ProfileForm layout="settings" />
              <div className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50">
                <h3 className="mb-4 text-lg font-semibold text-zinc-900">Senha</h3>
                <p className="mb-4 text-sm text-zinc-500">
                  Última alteração: há 30 dias
                </p>
                <Button variant="outline" className="rounded-xl">
                  Alterar senha
                </Button>
              </div>
            </div>
          )}

          {activeSection === "aparencia" && (
            <div className="relative space-y-6">
              <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <span className="font-medium">Em breve.</span> Tema escuro,
                alto contraste e preferências mais finas ficarão disponíveis
                após a próxima rodada maior do app.
              </p>
              <div className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50 opacity-[0.55]">
                <h3 className="mb-6 text-lg font-semibold text-zinc-900">
                  Tema
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    disabled
                    className="flex flex-col items-center gap-3 rounded-xl border-2 border-[#f318e3] bg-[#f318e3]/5 p-4"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md">
                      <Sun className="h-6 w-6 text-amber-500" />
                    </div>
                    <span className="text-sm font-medium text-zinc-900">
                      Claro
                    </span>
                    <Check className="h-4 w-4 text-[#f318e3]" />
                  </button>
                  <button
                    type="button"
                    disabled
                    className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 p-4"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 shadow-md">
                      <Moon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-zinc-900">
                      Escuro
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled
                    className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 p-4"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white to-zinc-800 shadow-md">
                      <div className="h-3 w-3 rounded-full bg-zinc-400" />
                    </div>
                    <span className="text-sm font-medium text-zinc-900">
                      Sistema
                    </span>
                  </button>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50 opacity-[0.55]">
                <h3 className="mb-6 text-lg font-semibold text-zinc-900">
                  Cor de destaque
                </h3>
                <div className="flex gap-3">
                  {["#f318e3", "#6366f1", "#10b981", "#f59e0b", "#ef4444"].map(
                    (color) => (
                      <button
                        key={color}
                        type="button"
                        disabled
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          color === "#f318e3" ? "ring-2 ring-offset-2" : ""
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {color === "#f318e3" && (
                          <Check className="h-5 w-5 text-white" />
                        )}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === "dados" && (
            <div className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">
                    Exportar dados
                  </h3>
                  <p className="mt-2 max-w-lg text-sm text-zinc-600">
                    Ao conectar o aplicativo ao Firestore, será possível gerar um
                    arquivo Excel com os registros que estiverem salvos para sua
                    conta ou equipe — por exemplo rotas, agendas e conteúdos de
                    redes sociais — para auditoria ou análises externas.
                  </p>
                  <p className="mt-3 text-sm text-zinc-500">
                    Por enquanto isso aparece apenas como roadmap: o download será
                    habilitado depois da persistência no Firebase estar pronta.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 rounded-xl opacity-75"
                  disabled
                >
                  Baixar Excel
                </Button>
              </div>
            </div>
          )}

          {activeSection === "ajuda" && (
            <div className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50">
              <h3 className="text-lg font-semibold text-zinc-900">Suporte</h3>
              <p className="mt-2 text-sm text-zinc-600">
                Para dúvidas, problemas de acesso ou pedidos relacionados ao seu
                usuário, use o WhatsApp como canal direto da aplicação.
              </p>
              <Button
                asChild
                className="mt-6 h-11 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] px-6 text-white shadow-md hover:opacity-95"
              >
                <a
                  href={WHATSAPP_SUPPORT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <MessageCircle className="h-5 w-5" />
                  Abrir WhatsApp para suporte
                </a>
              </Button>
              <p className="mt-8 text-sm text-zinc-500">
                <span className="font-medium text-zinc-700">
                  Ajuda dentro do app — em breve.
                </span>{" "}
                Uma FAQ, tutoriais e links para documentação entram quando
                organizarmos o conteúdo; não é prioridade agora.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}
