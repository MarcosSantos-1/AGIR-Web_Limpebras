"use client";

import { AppShell } from "@/components/layout/app-shell";
import { motion } from "framer-motion";
import { useState } from "react";
import { useTheme } from "next-themes";
import {
  User,
  Palette,
  Database,
  HelpCircle,
  ChevronRight,
  Check,
  Moon,
  Sun,
  Monitor,
  MessageCircle,
  Users,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/settings/profile-form";
import { EquipaAcessoSection } from "@/components/settings/equipa-acesso-section";
import { useAuth } from "@/contexts/auth-context";
import { useAccentColor } from "@/contexts/accent-color-context";
import { toast } from "sonner";
import { fetchAllAgendaEvents } from "@/lib/firestore/agenda";
import { fetchAllHistoryRecords } from "@/lib/firestore/history";
import {
  buildAgendaHistoryExcelBlob,
  defaultAgendaHistoricoExcelFilename,
  triggerBlobDownload,
} from "@/lib/export/agenda-history-excel";

/** Suporte pelo WhatsApp Business (texto pré-preenchido). */
const WHATSAPP_SUPPORT_URL =
  "https://api.whatsapp.com/send?phone=5511964821876&text=Olá, estou precisando de ajuda com o aplicativo AGIR.";

const settingsSections = [
  {
    id: "perfil",
    label: "Perfil",
    icon: User,
    description: "Informações pessoais e conta",
  },
  {
    id: "equipe",
    label: "Equipe e acessos",
    icon: Users,
    description: "Nomes, contas e convites por e-mail",
  },
  {
    id: "aparencia",
    label: "Aparência",
    icon: Palette,
    description: "Tema e cor de destaque",
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
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { accentId, setAccent, options: accentOptions } = useAccentColor();
  const [exportingExcel, setExportingExcel] = useState(false);

  const handleExportExcel = async () => {
    if (!user) {
      toast.error("Inicie sessão para exportar.");
      return;
    }
    setExportingExcel(true);
    try {
      const [agenda, historico] = await Promise.all([
        fetchAllAgendaEvents(),
        fetchAllHistoryRecords(),
      ]);
      const blob = await buildAgendaHistoryExcelBlob({ agenda, historico });
      triggerBlobDownload(blob, defaultAgendaHistoricoExcelFilename());
      toast.success(
        `Ficheiro gerado (${agenda.length} agenda, ${historico.length} histórico).`,
      );
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível gerar o Excel. Tente de novo.");
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <AppShell title="Configurações" subtitle="Personalize sua experiência">
      <div className="flex gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-72 shrink-0"
        >
          <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card dark:border-zinc-800 dark:bg-zinc-900">
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
                      ? "bg-[var(--gradient-start)]/10 dark:bg-[var(--gradient-start)]/15"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition-shadow ${
                      isActive
                        ? "bg-accent-gradient shadow-accent"
                        : "bg-zinc-100 dark:bg-zinc-800"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${isActive ? "text-white" : "text-zinc-500 dark:text-zinc-400"}`}
                    />
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${isActive ? "text-accent" : "text-zinc-900 dark:text-zinc-100"}`}
                    >
                      {section.label}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{section.description}</p>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 ${isActive ? "text-accent" : "text-zinc-300 dark:text-zinc-600"}`}
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
              <div className="rounded-3xl border border-zinc-100 bg-zinc-50/40 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                <p className="font-medium text-zinc-800 dark:text-zinc-100">Equipe</p>
                <p className="mt-1">
                  Convites por link e nomes para as equipes nos modais estão em <strong>Equipe e acesso</strong>.
                </p>
              </div>
              <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-card dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Senha</h3>
                <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                  Última alteração: há 30 dias
                </p>
                <Button variant="outline" className="rounded-xl">
                  Alterar senha
                </Button>
              </div>
            </div>
          )}

          {activeSection === "equipe" && <EquipaAcessoSection />}

          {activeSection === "aparencia" && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-card dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Tema
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {([
                    { value: "light", label: "Claro", Icon: Sun, iconClass: "text-amber-500", bgClass: "bg-white" },
                    { value: "dark", label: "Escuro", Icon: Moon, iconClass: "text-white", bgClass: "bg-zinc-800" },
                    { value: "system", label: "Sistema", Icon: Monitor, iconClass: "text-zinc-500", bgClass: "bg-gradient-to-br from-white to-zinc-800" },
                  ] as const).map(({ value, label, Icon, iconClass, bgClass }) => {
                    const isActive = theme === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTheme(value)}
                        className={`flex flex-col items-center gap-3 rounded-2xl p-4 transition-all ${
                          isActive
                            ? "border-2 border-[var(--gradient-start)] bg-[var(--gradient-start)]/5 shadow-accent"
                            : "border border-zinc-200 hover:border-zinc-300 hover:shadow-soft dark:border-zinc-700 dark:hover:border-zinc-600"
                        }`}
                      >
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-md ${bgClass}`}>
                          <Icon className={`h-6 w-6 ${iconClass}`} />
                        </div>
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {label}
                        </span>
                        {isActive && (
                          <Check className="h-4 w-4 text-[var(--gradient-start)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-card dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Cor de destaque
                </h3>
                <p className="mt-1 mb-5 text-sm text-zinc-500 dark:text-zinc-400">
                  Aplica em botões principais, ícones e gradientes do app.
                </p>
                <div className="grid grid-cols-6 gap-3 sm:grid-cols-11">
                  {accentOptions.map((color) => {
                    const isSelected = accentId === color.id;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        title={color.label}
                        onClick={() => setAccent(color.id)}
                        className={`group relative flex aspect-square items-center justify-center rounded-2xl transition-all hover:scale-110 ${
                          isSelected
                            ? "scale-105 shadow-lg ring-2 ring-offset-2 dark:ring-offset-zinc-900"
                            : "shadow-soft hover:shadow-md"
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${color.start}, ${color.end})`,
                          ...(isSelected ? { boxShadow: `0 8px 24px -6px ${color.start}80` } : {}),
                        }}
                      >
                        {isSelected && (
                          <Check className="h-5 w-5 text-white drop-shadow" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-6 rounded-2xl bg-accent-gradient p-5 text-white shadow-accent">
                  <p className="text-xs font-medium uppercase tracking-wider opacity-80">Pré-visualização</p>
                  <p className="mt-1 text-lg font-semibold">Cor selecionada</p>
                  <p className="mt-0.5 text-sm opacity-90">
                    {accentOptions.find((c) => c.id === accentId)?.label}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === "dados" && (
            <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-card dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Exportar dados
                  </h3>
                  <p className="mt-2 max-w-lg text-sm text-zinc-600 dark:text-zinc-300">
                    Gere um ficheiro Excel com os compromissos da coleção{" "}
                    <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800 dark:text-zinc-200">
                      agendaEvents
                    </code>{" "}
                    e os registos de{" "}
                    <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800 dark:text-zinc-200">
                      historyRecords
                    </code>
                    , incluindo colunas com as URLs das fotos (agenda: conclusão;
                    histórico: evidências).
                  </p>
                  <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                    É necessário estar autenticado com permissão de leitura no
                    Firestore. A exportação pode demorar um pouco se houver muitos
                    documentos.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 rounded-xl"
                  disabled={!user || exportingExcel}
                  onClick={() => void handleExportExcel()}
                >
                  {exportingExcel ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />A
                      gerar…
                    </>
                  ) : (
                    "Baixar Excel"
                  )}
                </Button>
              </div>
            </div>
          )}

          {activeSection === "ajuda" && (
            <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-card dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Suporte</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
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
              <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  Ajuda dentro do app — em breve.
                </span>{" "}
                Uma FAQ, tutoriais e links para documentação entram quando
                organizarmos o conteúdo.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}
