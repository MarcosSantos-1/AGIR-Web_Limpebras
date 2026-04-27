"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  Waypoints,
  RefreshCcw,
  MapPin,
  Calendar,
  CheckCircle2,
  Briefcase,
  ImagePlus,
  Users,
  Megaphone,
  Layers,
  Type,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { MAPA_PONTOS_VICIO_FORM } from "@/lib/map-features";

export type NovaAcaoTipo = "acao-visita" | "revitalizacao";

type NovaAcaoContextValue = {
  open: NovaAcaoTipo | null;
  openModal: (t: NovaAcaoTipo) => void;
  close: () => void;
};

const NovaAcaoContext = React.createContext<NovaAcaoContextValue | null>(null);

export function useNovaAcao() {
  const ctx = React.useContext(NovaAcaoContext);
  if (!ctx) {
    throw new Error("useNovaAcao deve ser usado dentro de NovaAcaoProvider");
  }
  return ctx;
}

const TIPOS_SERVICO = [
  { value: "visita-tecnica", label: "Visita técnica" },
  { value: "reuniao", label: "Reunião" },
  { value: "acao-ambiental", label: "Ação ambiental" },
  { value: "coleta-seletiva", label: "Coleta seletiva / orientação" },
  { value: "fiscalizacao", label: "Fiscalização / vistoria" },
  { value: "panfletagem", label: "Panfletagem" },
  { value: "capacitacao", label: "Capacitação / palestra" },
  { value: "outro", label: "Outro" },
] as const;

function fieldGrid() {
  return "grid gap-4 sm:grid-cols-2";
}

function ModalHero({
  icon: Icon,
  title,
  description,
  accentClassName,
  iconWrapperClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  accentClassName?: string;
  iconWrapperClassName?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border-b border-zinc-100/80 bg-gradient-to-br px-6 py-5 sm:px-8",
        accentClassName ?? "from-[#f318e3]/8 via-white to-[#6a0eaf]/6",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg",
            iconWrapperClassName ??
              "bg-gradient-to-br from-[#f318e3] to-[#6a0eaf] shadow-[#f318e3]/25",
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 space-y-1.5 pt-0.5">
          <DialogTitle className="text-left text-xl font-semibold tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed text-zinc-600">
            {description}
          </DialogDescription>
        </div>
      </div>
    </div>
  );
}

function SectionBox({
  icon: Icon,
  title: sectionTitle,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-100 bg-zinc-50/50 p-5 sm:p-6",
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-2.5 text-sm font-semibold text-zinc-800">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#9b0ba6] shadow-sm ring-1 ring-zinc-100">
          <Icon className="h-4 w-4" />
        </span>
        {sectionTitle}
      </div>
      {children}
    </div>
  );
}

function AcaoVisitaDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [situacao, setSituacao] = React.useState<"agendar" | "finalizado">(
    "agendar",
  );
  const [fotosError, setFotosError] = React.useState(false);
  const [fotosCount, setFotosCount] = React.useState(0);
  const [tipoServico, setTipoServico] = React.useState("");
  const [panfletagemRealizada, setPanfletagemRealizada] = React.useState(false);
  const [unidadesPanfletos, setUnidadesPanfletos] = React.useState("");

  const isTipoPanfletagem = tipoServico === "panfletagem";
  const panfletPodeExibir = tipoServico.length > 0;

  React.useEffect(() => {
    if (open) {
      setSituacao("agendar");
      setFotosError(false);
      setFotosCount(0);
      setTipoServico("");
      setPanfletagemRealizada(false);
      setUnidadesPanfletos("");
    }
  }, [open]);

  React.useEffect(() => {
    if (tipoServico === "panfletagem") {
      setPanfletagemRealizada(true);
    } else {
      setPanfletagemRealizada(false);
      setUnidadesPanfletos("");
    }
  }, [tipoServico]);

  React.useEffect(() => {
    if (situacao === "agendar") {
      setFotosError(false);
      setFotosCount(0);
    }
  }, [situacao]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "!flex w-[min(100vw-1rem,56rem)] max-w-4xl flex-col gap-0 overflow-hidden border-zinc-200/80 p-0 shadow-2xl sm:max-w-4xl",
          "max-h-[min(92vh,920px)]",
        )}
        showCloseButton
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Ação / Visita</DialogTitle>
        </DialogHeader>
        <ModalHero
          icon={Waypoints}
          title="Ação / Visita"
          description="Inclua agendamento futuro ou registro de ação já concluída. Com registro concluído, as fotos são obrigatórias."
        />
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (situacao === "finalizado" && fotosCount === 0) {
              setFotosError(true);
              return;
            }
            setFotosError(false);
            onOpenChange(false);
          }}
        >
          <div
            className={cn(
              "agir-dialog-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain",
              "px-6 py-5 sm:px-10 sm:py-6",
            )}
          >
            <div className="space-y-5">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-zinc-700">
                  Situação
                </Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSituacao("agendar");
                      setFotosError(false);
                    }}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                      situacao === "agendar"
                        ? "border-[#f318e3]/50 bg-gradient-to-br from-[#f318e3]/5 to-white shadow-md"
                        : "border-zinc-200 bg-white hover:border-zinc-300",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        situacao === "agendar"
                          ? "bg-gradient-to-br from-[#f318e3] to-[#6a0eaf] text-white"
                          : "bg-zinc-100 text-zinc-500",
                      )}
                    >
                      <Calendar className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-semibold text-zinc-900">
                        Agendar
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        Compromisso planejado — sem necessidade de fotos.
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSituacao("finalizado")}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                      situacao === "finalizado"
                        ? "border-[#f318e3]/50 bg-gradient-to-br from-[#6a0eaf]/5 to-white shadow-md"
                        : "border-zinc-200 bg-white hover:border-zinc-300",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        situacao === "finalizado"
                          ? "bg-gradient-to-br from-[#f318e3] to-[#6a0eaf] text-white"
                          : "bg-zinc-100 text-zinc-500",
                      )}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-semibold text-zinc-900">
                        Finalizado
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        Ação executada — envie fotos para o registro oficial.
                      </span>
                    </span>
                  </button>
                </div>
              </div>

              <SectionBox icon={Type} title="Classificação e título">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="tipo-servico"
                      className="text-zinc-600"
                    >
                      Tipo de serviço
                    </Label>
                    <input
                      type="hidden"
                      name="tipo-servico"
                      value={tipoServico}
                    />
                    <Select
                      value={tipoServico || undefined}
                      onValueChange={setTipoServico}
                      required
                    >
                      <SelectTrigger
                        id="tipo-servico"
                        className="h-11 w-full min-w-0 border-zinc-200 bg-white"
                        size="default"
                      >
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_SERVICO.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label
                      htmlFor="acao-titulo"
                      className="text-zinc-600"
                    >
                      Título / assunto
                    </Label>
                    <Input
                      id="acao-titulo"
                      name="titulo"
                      className="h-11 border-zinc-200"
                      placeholder="Ex.: Orientação no Ecoponto Norte"
                      required
                    />
                  </div>
                </div>
              </SectionBox>

              {panfletPodeExibir && (
                <SectionBox icon={Megaphone} title="Panfletagem no local">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Label
                        htmlFor="unidades-panf-acao"
                        className="text-zinc-600"
                      >
                        Unidades distribuídas
                      </Label>
                      {(!isTipoPanfletagem && !panfletagemRealizada) ? (
                        <input
                          type="hidden"
                          name="unidades-panfletos"
                          value="0"
                        />
                      ) : null}
                      <Input
                        id="unidades-panf-acao"
                        name={
                          isTipoPanfletagem || panfletagemRealizada
                            ? "unidades-panfletos"
                            : undefined
                        }
                        type="number"
                        min={0}
                        placeholder="0"
                        className="h-11 max-w-xs border-zinc-200"
                        value={unidadesPanfletos}
                        onChange={(e) =>
                          setUnidadesPanfletos(
                            (isTipoPanfletagem || panfletagemRealizada)
                              ? e.target.value
                              : "",
                          )
                        }
                        disabled={!isTipoPanfletagem && !panfletagemRealizada}
                      />
                    </div>
                    <div
                      className={cn(
                        "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 ring-1",
                        isTipoPanfletagem
                          ? "bg-amber-50/80 ring-amber-200"
                          : "bg-white ring-zinc-200",
                      )}
                    >
                      <Checkbox
                        id="panf-real-acao"
                        name="panfletagemRealizada"
                        disabled={isTipoPanfletagem}
                        checked={isTipoPanfletagem || panfletagemRealizada}
                        onCheckedChange={(c) => {
                          if (isTipoPanfletagem) return;
                          const next = c === true;
                          setPanfletagemRealizada(next);
                          if (!next) setUnidadesPanfletos("");
                        }}
                      />
                      <input
                        type="hidden"
                        name="panfletagemRealizada"
                        value={
                          isTipoPanfletagem || panfletagemRealizada
                            ? "on"
                            : "off"
                        }
                      />
                      <Label
                        htmlFor="panf-real-acao"
                        className={cn(
                          "text-sm font-medium leading-tight",
                          isTipoPanfletagem
                            ? "cursor-default text-amber-900"
                            : "cursor-pointer text-zinc-700",
                        )}
                      >
                        {isTipoPanfletagem
                          ? "Panfletagem (natureza da ação — sempre ativa)"
                          : "Panfletagem realizada"}
                      </Label>
                    </div>
                  </div>
                  {isTipoPanfletagem && (
                    <p className="mt-2 text-xs text-zinc-500">
                      Para o tipo &quot;Panfletagem&quot;, a ação trata
                      exclusivamente de panfletagem; não é possível
                      desativar.
                    </p>
                  )}
                </SectionBox>
              )}

              <SectionBox icon={MapPin} title="Quando e onde">
                <div className={fieldGrid()}>
                  <div className="space-y-2">
                    <Label
                      htmlFor="acao-data"
                      className="text-zinc-600"
                    >
                      Data
                    </Label>
                    <Input
                      id="acao-data"
                      name="data"
                      type="date"
                      className="h-11 border-zinc-200"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="acao-horario"
                      className="text-zinc-600"
                    >
                      Horário (opcional)
                    </Label>
                    <Input
                      id="acao-horario"
                      name="horario"
                      type="time"
                      className="h-11 border-zinc-200"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label
                      htmlFor="acao-local"
                      className="text-zinc-600"
                    >
                      Local / endereço
                    </Label>
                    <Input
                      id="acao-local"
                      name="local"
                      className="h-11 border-zinc-200"
                      placeholder="Rua, bairro, ponto de referência"
                      required
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label
                      htmlFor="acao-resp"
                      className="text-zinc-600"
                    >
                      Responsável
                    </Label>
                    <Input
                      id="acao-resp"
                      name="responsavel"
                      className="h-11 border-zinc-200"
                      placeholder="Nome do agente ou equipe"
                    />
                  </div>
                </div>
              </SectionBox>

              <SectionBox
                icon={Briefcase}
                title={
                  situacao === "agendar"
                    ? "Detalhes do agendamento"
                    : "Informações da ação concluída"
                }
              >
                <div className="space-y-2">
                  <Label
                    htmlFor="acao-info"
                    className="text-zinc-600"
                  >
                    {situacao === "agendar"
                      ? "O que está previsto, observações e encaminhamentos"
                      : "O que foi feito, resultados e observações do terreno"}
                  </Label>
                  <Textarea
                    id="acao-info"
                    name="informacoes"
                    placeholder={
                      situacao === "agendar"
                        ? "Descreva o objetivo da visita, materiais necessários, etc."
                        : "O que foi feito, resultados e encaminhamentos, etc."
                    }
                    className="min-h-[120px] resize-y border-zinc-200"
                    required
                  />
                </div>
              </SectionBox>

              {situacao === "finalizado" && (
                <div
                  className={cn(
                    "rounded-2xl border-2 p-5 sm:p-6",
                    fotosError
                      ? "border-red-200 bg-red-50/50"
                      : "border-amber-200/80 bg-amber-50/40",
                  )}
                >
                  <div className="mb-3 flex items-center gap-2.5 text-sm font-semibold text-amber-950">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                      <ImagePlus className="h-4 w-4" />
                    </span>
                    Registro fotográfico (obrigatório)
                  </div>
                  <p className="mb-3 text-sm text-amber-900/80">
                    Para ações finalizadas, anexe ao menos uma imagem comprovando
                    a realização.
                  </p>
                  <Input
                    key="fotos-finalizado"
                    id="fotos-acao"
                    name="fotos"
                    type="file"
                    accept="image/*"
                    multiple
                    className="h-12 w-full min-w-0 max-w-full cursor-pointer border-amber-200/80 bg-white file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm"
                    onChange={(e) => {
                      const n = e.target.files?.length ?? 0;
                      setFotosCount(n);
                      if (n > 0) setFotosError(false);
                    }}
                  />
                  {fotosError && (
                    <p className="mt-2 text-sm font-medium text-red-600">
                      Adicione pelo menos uma foto para concluir o registro.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <Separator className="shrink-0" />
          <DialogFooter className="shrink-0 gap-2 p-4 sm:justify-end sm:px-10 sm:py-5">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] text-white"
            >
              {situacao === "agendar" ? "Salvar agendamento" : "Salvar registro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RevitalizacaoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [pontoViciadoId, setPontoViciadoId] = React.useState<string>("");
  const [pvComboOpen, setPvComboOpen] = React.useState(false);
  const [panfletagemRealizada, setPanfletagemRealizada] = React.useState(false);
  const [unidadesPanfletos, setUnidadesPanfletos] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setPontoViciadoId("");
      setPvComboOpen(false);
      setPanfletagemRealizada(false);
      setUnidadesPanfletos("");
    }
  }, [open]);

  const pontoSelecionado = pontoViciadoId
    ? MAPA_PONTOS_VICIO_FORM.find((f) => f.id === pontoViciadoId)
    : undefined;
  const enderecoPonto = pontoSelecionado?.address?.trim() ?? "";
  const subprefeitura = pontoSelecionado?.subprefeitura?.trim() ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "!flex w-[min(100vw-1rem,56rem)] max-w-4xl flex-col gap-0 overflow-hidden border-zinc-200/80 p-0 shadow-2xl sm:max-w-4xl",
          "max-h-[min(92vh,920px)]",
        )}
        showCloseButton
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Revitalização</DialogTitle>
        </DialogHeader>
        <ModalHero
          icon={RefreshCcw}
          title="Revitalização"
          description="Quantitativos, tamanho da equipe, panfletagem e registro fotográfico."
          accentClassName="from-blue-500/6 via-white to-violet-500/8"
          iconWrapperClassName="bg-gradient-to-br from-blue-500 to-violet-600 shadow-blue-500/20"
        />
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            onOpenChange(false);
          }}
        >
          <div
            className={cn(
              "agir-dialog-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain",
              "px-6 py-5 sm:px-10 sm:py-6",
            )}
          >
            <div className="space-y-5">
              <input type="hidden" name="pontoViciadoId" value={pontoViciadoId} />
              <input
                type="hidden"
                name="subprefeituraPontoViciado"
                value={subprefeitura}
              />
              <SectionBox icon={MapPin} title="Ponto viciado (revitalização)">
                <div className={cn(fieldGrid(), "items-end gap-4")}>
                  <div className="space-y-2 sm:col-span-1">
                    <Label className="text-zinc-600">Ponto viciado</Label>
                    <Popover open={pvComboOpen} onOpenChange={setPvComboOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          role="combobox"
                          variant="outline"
                          aria-expanded={pvComboOpen}
                          className="h-11 w-full min-w-0 justify-between border-zinc-200 font-normal"
                        >
                          {pontoViciadoId ? (
                            <span className="truncate text-left text-zinc-800">
                              {pontoViciadoId} — {enderecoPonto}
                            </span>
                          ) : (
                            <span className="text-zinc-500">
                              Selecione por ID e endereço
                            </span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0"
                        align="start"
                      >
                        <Command>
                          <CommandInput
                            placeholder="Buscar id ou endereço…"
                            className="h-11"
                          />
                          <CommandList className="max-h-[min(50vh,320px)]">
                            <CommandEmpty>
                              Nenhum ponto encontrado.
                            </CommandEmpty>
                            <CommandGroup>
                              {MAPA_PONTOS_VICIO_FORM.map((f) => {
                                const addr = f.address?.trim() ?? "";
                                const value = `${f.id} — ${addr}`;
                                return (
                                  <CommandItem
                                    key={f.id}
                                    value={value}
                                    onSelect={() => {
                                      setPontoViciadoId(f.id);
                                      setPvComboOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4 shrink-0",
                                        pontoViciadoId === f.id
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    <span className="line-clamp-2 break-words">
                                      {f.id} — {addr}
                                    </span>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2 sm:col-span-1">
                    <Label
                      htmlFor="sub-rev"
                      className="text-zinc-600"
                    >
                      Subprefeitura
                    </Label>
                    <Input
                      id="sub-rev"
                      name="subprefeituraDisplay"
                      value={subprefeitura}
                      readOnly
                      placeholder="Selecione um ponto viciado"
                      className="h-11 cursor-default border-zinc-200 bg-zinc-100/80"
                    />
                  </div>
                </div>
              </SectionBox>

              <SectionBox icon={Layers} title="Quantitativos">
                <div className={cn(fieldGrid(), "gap-4")}>
                  <div className="space-y-2">
                    <Label
                      htmlFor="q-volume"
                      className="text-zinc-600"
                    >
                      Volume retirado (m³)
                    </Label>
                    <Input
                      id="q-volume"
                      name="volumeM3"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0"
                      className="h-11 border-zinc-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="q-kg"
                      className="text-zinc-600"
                    >
                      Resíduos (kg)
                    </Label>
                    <Input
                      id="q-kg"
                      name="residuosKg"
                      type="number"
                      min={0}
                      step="0.1"
                      placeholder="0"
                      className="h-11 border-zinc-200"
                    />
                  </div>
                </div>
              </SectionBox>

              <SectionBox icon={Users} title="Equipe">
                <div className="space-y-2">
                  <Label
                    htmlFor="eq-num"
                    className="text-zinc-600"
                  >
                    Número de pessoas
                  </Label>
                  <Input
                    id="eq-num"
                    name="equipeNum"
                    type="number"
                    min={1}
                    placeholder="0"
                    className="h-11 max-w-xs border-zinc-200"
                  />
                </div>
              </SectionBox>

              <div className="flex flex-col gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
                <div className="space-y-2">
                  <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-800">
                    <Megaphone className="h-4 w-4 text-blue-600" />
                    Panfletagem
                  </div>
                  <Label
                    htmlFor="panf-q"
                    className="text-zinc-600"
                  >
                    Unidades distribuídas
                  </Label>
                  {!panfletagemRealizada ? (
                    <input
                      type="hidden"
                      name="panfletos"
                      value="0"
                    />
                  ) : null}
                  <Input
                    id="panf-q"
                    name={panfletagemRealizada ? "panfletos" : undefined}
                    type="number"
                    min={0}
                    placeholder="0"
                    className="h-11 w-44 border-zinc-200"
                    value={unidadesPanfletos}
                    onChange={(e) =>
                      setUnidadesPanfletos(
                        panfletagemRealizada ? e.target.value : "",
                      )
                    }
                    disabled={!panfletagemRealizada}
                  />
                </div>
                <div className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 ring-1 ring-zinc-200">
                  <input
                    type="hidden"
                    name="panfletagemFeita"
                    value={panfletagemRealizada ? "on" : "off"}
                  />
                  <Checkbox
                    id="panf-feita"
                    checked={panfletagemRealizada}
                    onCheckedChange={(c) => {
                      const on = c === true;
                      setPanfletagemRealizada(on);
                      if (!on) setUnidadesPanfletos("");
                    }}
                  />
                  <Label
                    htmlFor="panf-feita"
                    className="cursor-pointer text-sm font-medium leading-tight text-zinc-700"
                  >
                    Panfletagem realizada
                  </Label>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-5 sm:p-6">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-800">
                  <ImagePlus className="h-4 w-4 text-[#9b0ba6]" />
                  Upload de fotos
                </div>
                <Input
                  id="fotos-rev"
                  name="fotos"
                  type="file"
                  accept="image/*"
                  multiple
                  className="h-12 w-full min-w-0 max-w-full cursor-pointer border-zinc-200 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Antes, durante e depois — envie quantas imagens forem
                  necessárias.
                </p>
              </div>
            </div>
          </div>
          <Separator className="shrink-0" />
          <DialogFooter className="shrink-0 gap-2 p-4 sm:justify-end sm:px-10 sm:py-5">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] text-white"
            >
              Salvar revitalização
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NovaAcaoModals({
  open,
  onOpenChange,
}: {
  open: NovaAcaoTipo | null;
  onOpenChange: (o: boolean) => void;
}) {
  const handleChange = (next: boolean) => {
    if (!next) onOpenChange(false);
  };

  return (
    <>
      <AcaoVisitaDialog
        open={open === "acao-visita"}
        onOpenChange={handleChange}
      />
      <RevitalizacaoDialog
        open={open === "revitalizacao"}
        onOpenChange={handleChange}
      />
    </>
  );
}

export function NovaAcaoProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState<NovaAcaoTipo | null>(null);

  const value = React.useMemo<NovaAcaoContextValue>(
    () => ({
      open,
      openModal: (t) => setOpen(t),
      close: () => setOpen(null),
    }),
    [open],
  );

  return (
    <NovaAcaoContext.Provider value={value}>
      {children}
      <NovaAcaoModals
        open={open}
        onOpenChange={(v) => {
          if (!v) setOpen(null);
        }}
      />
    </NovaAcaoContext.Provider>
  );
}
