"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { MapDisplayPoint } from "@/lib/map-features";
import {
  subscribeCustomPontosViciados,
  type CustomPontoViciadoEntry,
} from "@/lib/firestore/custom-pontos-viciados";
import { mergePontosVicioFormOptions } from "@/lib/map-features";
import { normalizePontoViciadoCodigo } from "@/lib/ponto-viciado-codigo";

type Ctx = {
  /** Pontos viciados adicionados pela equipa (Firestore, partilhados). */
  customPontosViciados: MapDisplayPoint[];
  /** Códigos do catálogo que a equipe removeu do mapa. */
  pontosOcultos: Set<string>;
  pontosVicioFormOptions: ReturnType<typeof mergePontosVicioFormOptions>;
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
      pontosOcultos,
      pontosVicioFormOptions,
      hydrated,
    }),
    [
      customPontosViciados,
      pontosOcultos,
      pontosVicioFormOptions,
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
