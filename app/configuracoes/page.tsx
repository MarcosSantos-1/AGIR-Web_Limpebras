"use client";

import { AppShell } from "@/components/layout/app-shell";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  User,
  Bell,
  Shield,
  Palette,
  Database,
  HelpCircle,
  ChevronRight,
  Check,
  Mail,
  Smartphone,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const settingsSections = [
  { id: "perfil", label: "Perfil", icon: User, description: "Informações pessoais e conta" },
  { id: "notificacoes", label: "Notificações", icon: Bell, description: "Preferências de alertas" },
  { id: "privacidade", label: "Privacidade", icon: Shield, description: "Segurança e permissões" },
  { id: "aparencia", label: "Aparência", icon: Palette, description: "Tema e personalização" },
  { id: "dados", label: "Dados", icon: Database, description: "Exportação e backup" },
  { id: "ajuda", label: "Ajuda", icon: HelpCircle, description: "Suporte e documentação" },
];

export default function ConfiguracoesPage() {
  const [activeSection, setActiveSection] = useState("perfil");
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    urgentes: true,
    resumo: false,
  });

  return (
    <AppShell title="Configurações" subtitle="Personalize sua experiência">
      <div className="flex gap-6">
        {/* Sidebar */}
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
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-[#f318e3]/10 to-[#6a0eaf]/10"
                      : "hover:bg-zinc-50"
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    isActive
                      ? "bg-gradient-to-r from-[#f318e3] to-[#6a0eaf]"
                      : "bg-zinc-100"
                  }`}>
                    <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-zinc-500"}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isActive ? "text-[#9b0ba6]" : "text-zinc-900"}`}>
                      {section.label}
                    </p>
                    <p className="text-xs text-zinc-500">{section.description}</p>
                  </div>
                  <ChevronRight className={`h-4 w-4 ${isActive ? "text-[#9b0ba6]" : "text-zinc-300"}`} />
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1"
        >
          {/* Profile Section */}
          {activeSection === "perfil" && (
            <div className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50">
                <h3 className="mb-6 text-lg font-semibold text-zinc-900">Informações Pessoais</h3>
                <div className="flex items-start gap-6">
                  <div className="relative">
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f318e3] to-[#6a0eaf] text-3xl font-semibold text-white">
                      CA
                    </div>
                    <button className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg">
                      <Palette className="h-4 w-4 text-zinc-600" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-zinc-500">Nome</label>
                        <input
                          type="text"
                          defaultValue="Igor Supervisor"
                          className="mt-1 w-full rounded-xl border-0 bg-zinc-100 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#f318e3]/20"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-zinc-500">Cargo</label>
                        <input
                          type="text"
                          defaultValue="Supervisor"
                          className="mt-1 w-full rounded-xl border-0 bg-zinc-100 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#f318e3]/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-500">Email</label>
                      <input
                        type="email"
                        defaultValue="carlos.almeida@prefeitura.gov.br"
                        className="mt-1 w-full rounded-xl border-0 bg-zinc-100 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#f318e3]/20"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-500">Telefone</label>
                      <input
                        type="tel"
                        defaultValue="(11) 98765-4321"
                        className="mt-1 w-full rounded-xl border-0 bg-zinc-100 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#f318e3]/20"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button className="rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] px-6 text-white">
                    Salvar Alterações
                  </Button>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50">
                <h3 className="mb-4 text-lg font-semibold text-zinc-900">Senha</h3>
                <p className="mb-4 text-sm text-zinc-500">
                  Última alteração: há 30 dias
                </p>
                <Button variant="outline" className="rounded-xl">
                  Alterar Senha
                </Button>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === "notificacoes" && (
            <div className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50">
              <h3 className="mb-6 text-lg font-semibold text-zinc-900">Preferências de Notificações</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900">Notificações por Email</p>
                      <p className="text-sm text-zinc-500">Receba atualizações no seu email</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, email: !notifications.email })}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      notifications.email ? "bg-gradient-to-r from-[#f318e3] to-[#6a0eaf]" : "bg-zinc-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        notifications.email ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                      <Smartphone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900">Notificações Push</p>
                      <p className="text-sm text-zinc-500">Alertas em tempo real no navegador</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, push: !notifications.push })}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      notifications.push ? "bg-gradient-to-r from-[#f318e3] to-[#6a0eaf]" : "bg-zinc-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        notifications.push ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                      <Bell className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900">Alertas Urgentes</p>
                      <p className="text-sm text-zinc-500">Notificações de pendências críticas</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, urgentes: !notifications.urgentes })}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      notifications.urgentes ? "bg-gradient-to-r from-[#f318e3] to-[#6a0eaf]" : "bg-zinc-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        notifications.urgentes ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                      <Database className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900">Resumo Semanal</p>
                      <p className="text-sm text-zinc-500">Relatório resumido toda segunda-feira</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, resumo: !notifications.resumo })}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      notifications.resumo ? "bg-gradient-to-r from-[#f318e3] to-[#6a0eaf]" : "bg-zinc-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        notifications.resumo ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === "aparencia" && (
            <div className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50">
                <h3 className="mb-6 text-lg font-semibold text-zinc-900">Tema</h3>
                <div className="grid grid-cols-3 gap-4">
                  <button className="flex flex-col items-center gap-3 rounded-xl border-2 border-[#f318e3] bg-[#f318e3]/5 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md">
                      <Sun className="h-6 w-6 text-amber-500" />
                    </div>
                    <span className="text-sm font-medium text-zinc-900">Claro</span>
                    <Check className="h-4 w-4 text-[#f318e3]" />
                  </button>
                  <button className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 p-4 hover:border-zinc-300">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 shadow-md">
                      <Moon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-zinc-900">Escuro</span>
                  </button>
                  <button className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 p-4 hover:border-zinc-300">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white to-zinc-800 shadow-md">
                      <div className="h-3 w-3 rounded-full bg-zinc-400" />
                    </div>
                    <span className="text-sm font-medium text-zinc-900">Sistema</span>
                  </button>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50">
                <h3 className="mb-6 text-lg font-semibold text-zinc-900">Cor de Destaque</h3>
                <div className="flex gap-3">
                  {["#f318e3", "#6366f1", "#10b981", "#f59e0b", "#ef4444"].map((color) => (
                    <button
                      key={color}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        color === "#f318e3" ? "ring-2 ring-offset-2" : ""
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {color === "#f318e3" && <Check className="h-5 w-5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Other Sections - Placeholder */}
          {["privacidade", "dados", "ajuda"].includes(activeSection) && (
            <div className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f318e3]/10 to-[#6a0eaf]/10">
                  {activeSection === "privacidade" && <Shield className="h-8 w-8 text-[#9b0ba6]" />}
                  {activeSection === "dados" && <Database className="h-8 w-8 text-[#9b0ba6]" />}
                  {activeSection === "ajuda" && <HelpCircle className="h-8 w-8 text-[#9b0ba6]" />}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">
                  {settingsSections.find((s) => s.id === activeSection)?.label}
                </h3>
                <p className="mt-2 text-sm text-zinc-500">
                  Esta seção será implementada em breve.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}
