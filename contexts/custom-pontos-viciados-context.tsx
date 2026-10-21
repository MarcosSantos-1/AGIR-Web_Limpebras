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

type Ctx = {
  /** Pontos viciados adicionados pela equipa (Firestore, partilhados). */
  customPontosViciados: MapDisplayPoint[];
  /** Metadados para editar/remover pelo id do marcador (= `codigo`). */
  customPontoEntries: CustomPontoViciadoEntry[];
  /** Códigos do catálogo que a equipe removeu do mapa. */
  pontosOcultos: Set<string>;
  pontosVicioFormOptions: ReturnType<typeof mergePontosVicioFormOptions>;
  addPontoViciado: (input: AddCustomPontoViciadoInput) => Promise<void>;
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
      if (e.ocultoCodigo) set.add(e.ocultoCodigo);
    }
    return set;
  }, [entries]);

  const addPontoViciado = useCallback(async (input: AddCustomPontoViciadoInput) => {
    await addCustomPontoViciado(input);
  }, []);

  const updatePontoViciado = useCallback(
    async (
      firestoreDocId: string,
      patch: Omit<AddCustomPontoViciadoInput, "createdByUid">,
    ) => {
      await updateCustomPontoViciado(firestoreDocId, patch);
    },
    [],
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
        (p) => !pontosOcultos.has(p.id),
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
