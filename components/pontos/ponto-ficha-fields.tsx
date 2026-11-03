"use client";

import type { ReactNode } from "react";
import { Building2, Check, Factory, Fence, Footprints, House, MapPin, Minus, Mountain, Route, Store, Trees, Waves, type LucideIcon } from "lucide-react";
import { ENTORNO_FIELDS, fichaChoiceLabel, fichaOptions, isOutrosLogradouro, type FichaAnswerKey, type FichaPart, type PontoFichaDraft } from "@/lib/ponto-ficha";

function iconFor(field: FichaAnswerKey, option: string): LucideIcon {
  if (field === "tipoLogradouro") {
    if (option.startsWith("Via")) return Route;
    if (option.startsWith("Beco")) return Footprints;
    return MapPin;
  }
  if (field === "topografia") return option.startsWith("Plana") ? Minus : Mountain;
  if (field === "ocupacao") {
    if (option.startsWith("Residencial")) return House;
    if (option.startsWith("Comercial")) return Store;
    if (option.startsWith("Industrial")) return Factory;
    return Building2;
  }
  if (field === "entornoBueiro") return Waves;
  if (field === "entornoRio") return Waves;
  if (field === "entornoEncosta") return Mountain;
  if (field === "entornoTerreno") return Trees;
  if (field === "entornoSemSaida") return Footprints;
  return Fence;
}

function OptionCard({ label, icon: Icon, pressed, disabled, onClick }: { label: string; icon: LucideIcon; pressed: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} aria-pressed={pressed} onClick={onClick} className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left text-sm font-medium transition active:scale-[0.99] ${pressed ? "border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${pressed ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"}`}><Icon className="h-5 w-5" /></span>
      <span className="flex-1 leading-snug">{label}</span>
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${pressed ? "border-emerald-600 bg-emerald-600 text-white" : "border-zinc-300 bg-white dark:bg-zinc-950"}`}>{pressed && <Check className="h-4 w-4" />}</span>
    </button>
  );
}

function Section({ icon: Icon, title, hint, children }: { icon: LucideIcon; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="flex items-center gap-2 text-base font-semibold"><Icon className="h-5 w-5 text-emerald-700" />{title}</h3>
      {hint && <p className="mt-1 text-sm text-zinc-500">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Options({ field, draft, disabled, onChange }: { field: FichaAnswerKey; draft: PontoFichaDraft; disabled: boolean; onChange: (draft: PontoFichaDraft) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {fichaOptions(field).map((option) => (
        <OptionCard key={option} label={fichaChoiceLabel(field, option)} icon={iconFor(field, option)} pressed={draft[field] === option} disabled={disabled} onClick={() => onChange({ ...draft, [field]: option })} />
      ))}
    </div>
  );
}

export function PontoFichaFields({ draft, onChange, part = "all", disabled = false }: {
  draft: PontoFichaDraft;
  onChange: (draft: PontoFichaDraft) => void;
  part?: FichaPart | "all";
  disabled?: boolean;
}) {
  const show = (name: FichaPart) => part === "all" || part === name;
  return (
    <div className="space-y-4">
      {show("via") && (
        <>
          <Section icon={MapPin} title="Complemento" hint="Opcional. Praça, canteiro, ao lado de, subestação…">
            <input className="h-12 w-full rounded-2xl border bg-white px-4 text-base dark:bg-zinc-950" placeholder="Ex.: canteiro central" value={draft.complemento} disabled={disabled} onChange={(event) => onChange({ ...draft, complemento: event.target.value })} />
          </Section>
          <Section icon={Route} title="Tipo de logradouro">
            <Options field="tipoLogradouro" draft={draft} disabled={disabled} onChange={onChange} />
            {isOutrosLogradouro(draft.tipoLogradouro) && (
              <label className="mt-3 block text-sm font-medium">
                Qual outro tipo
                <input className="mt-2 h-12 w-full rounded-2xl border bg-white px-4 text-base font-normal dark:bg-zinc-950" placeholder="Ex.: córrego canalizado" value={draft.outroLogradouro} disabled={disabled} onChange={(event) => onChange({ ...draft, outroLogradouro: event.target.value })} />
              </label>
            )}
          </Section>
        </>
      )}
      {show("terreno") && (
        <>
          <Section icon={Mountain} title="Topografia">
            <Options field="topografia" draft={draft} disabled={disabled} onChange={onChange} />
          </Section>
          <Section icon={Building2} title="Perfil de ocupação">
            <Options field="ocupacao" draft={draft} disabled={disabled} onChange={onChange} />
          </Section>
        </>
      )}
      {show("entorno") && (
        <Section icon={Fence} title="Entorno em até 15 m" hint="Toque em Sim ou Não. Dá para mudar a qualquer momento.">
          <div className="space-y-4">
            {ENTORNO_FIELDS.map((field) => {
              const Icon = iconFor(field.key, "");
              return (
              <div key={field.key}>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-emerald-700" />{field.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  {fichaOptions(field.key).map((option) => (
                    <OptionCard key={option} label={fichaChoiceLabel(field.key, option)} icon={option === "Sim." ? Check : Minus} pressed={draft[field.key] === option} disabled={disabled} onClick={() => onChange({ ...draft, [field.key]: option })} />
                  ))}
                </div>
              </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}
