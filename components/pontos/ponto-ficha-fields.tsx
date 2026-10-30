"use client";

import { fichaChoiceLabel, fichaOptions, isOutrosLogradouro, ENTORNO_FIELDS, type FichaAnswerKey, type FichaPart, type PontoFichaDraft } from "@/lib/ponto-ficha";

function Choice({ label, pressed, disabled, onClick }: { label: string; pressed: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} aria-pressed={pressed} onClick={onClick} className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${pressed ? "border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50" : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"}`}>
      {label}
    </button>
  );
}

function LockedValue({ label, value }: { label: string; value: string }) {
  return (
    <p className="rounded-xl bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/60">
      <span className="block text-xs text-zinc-500">{label}</span>
      <span className="font-medium">{value}</span>
    </p>
  );
}

function SelectGroup({ title, field, draft, disabled, locked, onChange }: {
  title: string;
  field: FichaAnswerKey;
  draft: PontoFichaDraft;
  disabled: boolean;
  locked: boolean;
  onChange: (draft: PontoFichaDraft) => void;
}) {
  if (locked) return <LockedValue label={title} value={fichaChoiceLabel(field, draft[field]) || draft[field]} />;
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{title}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {fichaOptions(field).map((option) => (
          <Choice key={option} label={fichaChoiceLabel(field, option)} pressed={draft[field] === option} disabled={disabled} onClick={() => onChange({ ...draft, [field]: option })} />
        ))}
      </div>
    </fieldset>
  );
}

export function PontoFichaFields({ draft, onChange, part = "all", disabled = false, locked }: {
  draft: PontoFichaDraft;
  onChange: (draft: PontoFichaDraft) => void;
  part?: FichaPart | "all";
  disabled?: boolean;
  locked?: ReadonlySet<string>;
}) {
  const show = (name: FichaPart) => part === "all" || part === name;
  const isLocked = (key: string) => Boolean(locked?.has(key));
  return (
    <div className="space-y-5">
      {show("via") && (
        <>
          {isLocked("complemento") ? <LockedValue label="Complemento" value={draft.complemento} /> : (
            <label className="block space-y-1.5 text-sm font-medium">
              Complemento <span className="font-normal text-zinc-500">(opcional)</span>
              <input className="h-11 w-full rounded-xl border bg-white px-3 text-sm font-normal dark:bg-zinc-950" placeholder="Praça, canteiro central, ao lado de, subestação…" value={draft.complemento} disabled={disabled} onChange={(event) => onChange({ ...draft, complemento: event.target.value })} />
            </label>
          )}
          <SelectGroup title="Tipo de logradouro" field="tipoLogradouro" draft={draft} disabled={disabled} locked={isLocked("tipoLogradouro")} onChange={onChange} />
          {isOutrosLogradouro(draft.tipoLogradouro) && (isLocked("outroLogradouro") ? <LockedValue label="Qual outro tipo" value={draft.outroLogradouro} /> : (
            <label className="block space-y-1.5 text-sm font-medium">
              Qual outro tipo
              <input className="h-11 w-full rounded-xl border bg-white px-3 text-sm font-normal dark:bg-zinc-950" placeholder="Ex.: córrego canalizado" value={draft.outroLogradouro} disabled={disabled} onChange={(event) => onChange({ ...draft, outroLogradouro: event.target.value })} />
            </label>
          ))}
        </>
      )}
      {show("terreno") && (
        <>
          <SelectGroup title="Topografia" field="topografia" draft={draft} disabled={disabled} locked={isLocked("topografia")} onChange={onChange} />
          <SelectGroup title="Perfil de ocupação" field="ocupacao" draft={draft} disabled={disabled} locked={isLocked("ocupacao")} onChange={onChange} />
        </>
      )}
      {show("entorno") && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">No entorno de até 15 m, existe:</p>
          {ENTORNO_FIELDS.map((field) => (
            <SelectGroup key={field.key} title={field.label} field={field.key} draft={draft} disabled={disabled} locked={isLocked(field.key)} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
}
