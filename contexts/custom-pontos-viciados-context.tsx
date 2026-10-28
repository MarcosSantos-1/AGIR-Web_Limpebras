"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { MapDisplayPoint } from "@/lib/map-features";
import {
  firebaseDocIdForPontoCodigo,
  subscribeCustomPontosViciados,
  addCustomPontoViciado,
  updateCustomPontoViciado,
  deleteCustomPontoViciado,
  hidePontoViciadoCodigo,
  type CustomPontoViciadoEntry,
  type AddCustomPontoViciadoInput,
} from "@/lib/firestore/custom-pontos-viciados";
import { mergePontosVicioFormOptions } from "@/lib/map-features";
import {
  MSG_PONTO_VICIADO_CODIGO_EM_USO,
  normalizePontoViciadoCodigo,
  pontoViciadoCodigoEmUsoNoMapa,
  type PontoViciadoCodigoSource,
} from "@/lib/ponto-viciado-codigo";

type Ctx = {
  /** Pontos viciados adicionados pela equipa (Firestore, partilhados). */
  customPontosViciados: MapDisplayPoint[];
  /** Metadados para editar/remover pelo id do marcador (= `codigo`). */
  customPontoEntries: CustomPontoViciadoEntry[];
  /** Códigos do catálogo que a equipe removeu do mapa. */
  pontosOcultos: Set<string>;
  pontosVicioFormOptions: ReturnType<typeof mergePontosVicioFormOptions>;
  addPontoViciado: (
    input: AddCustomPontoViciadoInput,
    options?: { editingSourceCodigo?: string | null },
  ) => Promise<void>;
  updatePontoViciado: (
    firestoreDocId: string,
    input: Omit<AddCustomPontoViciadoInput, "createdByUid">,
  ) => Promise<void>;
  deletePontoViciadoByCodigo: (codigo: string) => Promise<void>;
  hydrated: boolean;
};

const CustomPontosViciadosContext = createContext<Ctx | null>(null);

export function CustomPontosViciadosProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [entries, setEntries] = useState<CustomPontoViciadoEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = subscribeCustomPontosViciados(
      (list) => {
        setEntries(list);
        setHydrated(true);
      },
      () => setHydrated(true),
    );
    return () => unsub();
  }, []);

  const customPontosViciados = useMemo(
    () =>
      entries.flatMap((e) => (e.point ? [e.point] : [])),
    [entries],
  );

  const pontosOcultos = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.ocultoCodigo) set.add(normalizePontoViciadoCodigo(e.ocultoCodigo));
    }
    return set;
  }, [entries]);

  const codigoSources = useMemo(
    (): PontoViciadoCodigoSource[] =>
      entries.map((entry) => ({
        firestoreDocId: entry.firestoreDocId,
        pointId: entry.point?.id ?? null,
        ocultoCodigo: entry.ocultoCodigo ?? null,
      })),
    [entries],
  );

  const clearReservedCodigo = useCallback(
    async (codigo: string, keepDocId?: string) => {
      const target = normalizePontoViciadoCodigo(codigo);
      const staleIds = entries
        .filter((entry) => {
          if (entry.firestoreDocId === keepDocId) return false;
          const hidden =
            entry.ocultoCodigo &&
            normalizePontoViciadoCodigo(entry.ocultoCodigo) === target;
          const samePoint =
            entry.point &&
            normalizePontoViciadoCodigo(entry.point.id) === target;
          return hidden || samePoint;
        })
        .map((entry) => entry.firestoreDocId);
      await Promise.all(staleIds.map((id) => deleteCustomPontoViciado(id)));
    },
    [entries],
  );

  const addPontoViciado = useCallback(
    async (
      input: AddCustomPontoViciadoInput,
      options?: { editingSourceCodigo?: string | null },
    ) => {
      const codigo = normalizePontoViciadoCodigo(input.codigo);
      if (!codigo) throw new Error("Indique o código do ponto.");
      if (
        pontoViciadoCodigoEmUsoNoMapa(codigo, codigoSources, {
          sourceCodigo: options?.editingSourceCodigo,
        })
      ) {
        throw new Error(MSG_PONTO_VICIADO_CODIGO_EM_USO);
      }
      const payload = { ...input, codigo };
      const existing = entries.find(
        (entry) =>
          entry.point &&
          normalizePontoViciadoCodigo(entry.point.id) === codigo,
      );
      if (existing) {
        await updateCustomPontoViciado(existing.firestoreDocId, payload);
        await clearReservedCodigo(codigo, existing.firestoreDocId);
        return;
      }
      await addCustomPontoViciado(payload);
      await clearReservedCodigo(codigo);
    },
    [clearReservedCodigo, codigoSources, entries],
  );

  const updatePontoViciado = useCallback(
    async (
      firestoreDocId: string,
      patch: Omit<AddCustomPontoViciadoInput, "createdByUid">,
    ) => {
      const codigo = normalizePontoViciadoCodigo(patch.codigo);
      const current = entries.find(
        (entry) => entry.firestoreDocId === firestoreDocId,
      );
      if (
        pontoViciadoCodigoEmUsoNoMapa(codigo, codigoSources, {
          firestoreDocId,
          sourceCodigo: current?.point?.id ?? null,
        })
      ) {
        throw new Error(MSG_PONTO_VICIADO_CODIGO_EM_USO);
      }
      await updateCustomPontoViciado(firestoreDocId, { ...patch, codigo });
      await clearReservedCodigo(codigo, firestoreDocId);
    },
    [clearReservedCodigo, codigoSources, entries],
  );

  const deletePontoViciadoByCodigo = useCallback(
    async (codigo: string) => {
      const docId = firebaseDocIdForPontoCodigo(entries, codigo);
      await hidePontoViciadoCodigo(codigo);
      if (docId) await deleteCustomPontoViciado(docId);
    },
    [entries],
  );

  const pontosVicioFormOptions = useMemo(
    () =>
      mergePontosVicioFormOptions(customPontosViciados).filter(
        (p) => !pontosOcultos.has(normalizePontoViciadoCodigo(p.id)),
      ),
    [customPontosViciados, pontosOcultos],
  );

  const value = useMemo(
    () => ({
      customPontosViciados,
      customPontoEntries: entries,
      pontosOcultos,
      pontosVicioFormOptions,
      addPontoViciado,
      updatePontoViciado,
      deletePontoViciadoByCodigo,
      hydrated,
    }),
    [
      customPontosViciados,
      entries,
      pontosOcultos,
      pontosVicioFormOptions,
      addPontoViciado,
      updatePontoViciado,
      deletePontoViciadoByCodigo,
      hydrated,
    ],
  );

  return (
    <CustomPontosViciadosContext.Provider value={value}>
      {children}
    </CustomPontosViciadosContext.Provider>
  );
}

export function useCustomPontosViciados(): Ctx {
  const ctx = useContext(CustomPontosViciadosContext);
  if (!ctx) {
    throw new Error(
      "useCustomPontosViciados deve ser usado dentro de CustomPontosViciadosProvider.",
    );
  }
  return ctx;
}
