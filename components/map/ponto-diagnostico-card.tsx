"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, ClipboardList, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeDiagnosticsByPoint } from "@/lib/firestore/diagnosticos";
import type { Diagnostic } from "@/lib/diagnosticos";

function formatDate(value: unknown) {
  const date = String(value ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split("-").reverse().join("/") : "";
}

function volumeLabel(value: unknown, fallback?: string) {
  const text = String(value ?? "").trim();
  if (!text) return fallback?.trim() || "Sem volumetria";
  if (text.startsWith("Não se aplica")) return "Não se aplica";
  if (text.startsWith("Menos")) return "Menos de 1 m³";
  if (text.startsWith("Entre")) return "Entre 1 e 5 m³";
  if (text.startsWith("Mais")) return "Mais de 5 m³";
  return text;
}

function isInactiveRecord(record?: Diagnostic) {
  return String(record?.answers.statusTrimestral ?? "").toLowerCase().includes("inativo");
}

function photoOf(record?: Diagnostic) {
  return record?.photos.find((photo) => photo.url)?.url ?? "";
}

export function PontoDiagnosticoCard({ pointId, catalogueVolume, catalogueInactive = false }: {
  pointId: string;
  catalogueVolume?: string;
  catalogueInactive?: boolean;
}) {
  const [records, setRecords] = useState<Diagnostic[] | null>(null);
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    setRecords(null);
    setError("");
    setHistoryOpen(false);
    return subscribeDiagnosticsByPoint(pointId, (items) => { setRecords(items); setError(""); }, (cause) => setError(cause.message));
  }, [pointId]);

  const latest = records?.[0];
  const filled = latest?.state === "concluido";
  const inactive = latest ? isInactiveRecord(latest) : catalogueInactive;
  const photo = photoOf(latest) || records?.map(photoOf).find(Boolean) || "";
  const date = formatDate(latest?.answers.dataChecagem);
  const volume = volumeLabel(latest?.answers.volume, catalogueVolume);
  const older = (records ?? []).slice(1);
  const href = `/diagnosticos/campo?ponto=${encodeURIComponent(pointId)}`;

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-card dark:border-emerald-900 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-2 border-b border-emerald-100 px-3 py-2 dark:border-emerald-900">
        <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Diagnóstico</h3>
        {records ? (
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${filled ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"}`}>
            {filled ? "Preenchido" : "Pendente"}
          </span>
        ) : null}
      </div>
      {error ? <p className="px-3 py-3 text-sm text-red-700">{error}</p> : records === null ? (
        <p className="flex items-center gap-2 px-3 py-4 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Buscando o último preenchimento…</p>
      ) : (
        <>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={`Foto do último diagnóstico de ${pointId}`} className="h-36 w-full object-cover" />
          ) : (
            <div className="flex h-20 items-center justify-center bg-white/70 text-xs text-zinc-400 dark:bg-zinc-900/40">Sem foto neste preenchimento</div>
          )}
          <div className="space-y-2 px-3 py-3 text-sm text-zinc-700 dark:text-zinc-200">
            <p>{date ? `Data ${date}` : "Ainda sem data de vistoria"}</p>
            <p><span className="font-medium">Volumetria:</span> {volume}</p>
            <p><span className="font-medium">Situação:</span> {inactive ? "Inativo" : "Ativo"}</p>
          </div>
        </>
      )}
      <div className="space-y-2 border-t border-emerald-100 p-3 dark:border-emerald-900">
        <Button asChild className="h-11 w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
          <Link href={href}>
            {filled ? <Pencil className="mr-2 h-4 w-4" /> : <ClipboardList className="mr-2 h-4 w-4" />}
            {filled ? "Revisar/editar" : "Preencher"}
          </Link>
        </Button>
        <button
          type="button"
          aria-expanded={historyOpen}
          disabled={!older.length}
          onClick={() => setHistoryOpen((open) => !open)}
          className="flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 disabled:cursor-default disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <span>{older.length ? `Outros preenchimentos (${older.length})` : "Sem outros preenchimentos"}</span>
          <ChevronDown className={`h-4 w-4 transition ${historyOpen ? "rotate-180" : ""}`} />
        </button>
        {historyOpen && older.length > 0 ? (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {older.map((record) => {
              const thumb = photoOf(record);
              const done = record.state === "concluido";
              return (
                <li key={record.id} className="flex gap-3 rounded-xl bg-white p-2 dark:bg-zinc-900">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  ) : <div className="h-14 w-14 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-800" />}
                  <div className="min-w-0 text-xs">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-100">{formatDate(record.answers.dataChecagem) || "Sem data"} · {done ? "Preenchido" : "Pendente"}</p>
                    <p className="mt-1 text-zinc-500">{volumeLabel(record.answers.volume)} · {isInactiveRecord(record) ? "Inativo" : "Ativo"}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
