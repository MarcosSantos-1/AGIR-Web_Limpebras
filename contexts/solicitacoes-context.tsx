"use client";

import { useAuth } from "@/contexts/auth-context";
import { useUserProfile } from "@/contexts/user-profile-context";
import {
  deleteSolicitacao,
  subscribeSolicitacoes,
  updateSolicitacaoStatus,
} from "@/lib/firestore/solicitacoes";
import {
  isSolicitacaoAberta,
  type Solicitacao,
  type SolicitacaoStatus,
} from "@/data/solicitacoes";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SolicitacoesContextValue = {
  solicitacoes: Solicitacao[];
  /** Novas e em andamento — o que ainda exige ação da comunicação. */
  abertas: Solicitacao[];
  /** Contagem de `nova`, usada no badge do header. */
  novasCount: number;
  hydrated: boolean;
  setStatus: (
    id: string,
    status: SolicitacaoStatus,
    respostaInterna?: string,
  ) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const SolicitacoesContext = createContext<SolicitacoesContextValue | null>(null);

export function SolicitacoesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = subscribeSolicitacoes(
      (list) => {
        setSolicitacoes(list);
        setHydrated(true);
      },
      () => setHydrated(true),
    );
    return () => unsub();
  }, []);

  const setStatus = useCallback(
    async (
      id: string,
      status: SolicitacaoStatus,
      respostaInterna?: string,
    ) => {
      /** Quem move a solicitação passa a constar como responsável. */
      await updateSolicitacaoStatus(id, {
        status,
        responsavelUid: user?.uid,
        responsavelNome: profile?.nome?.trim() || user?.email || undefined,
        respostaInterna,
      });
    },
    [user?.uid, user?.email, profile?.nome],
  );

  const remove = useCallback(async (id: string) => {
    await deleteSolicitacao(id);
  }, []);

  const abertas = useMemo(
    () => solicitacoes.filter((s) => isSolicitacaoAberta(s.status)),
    [solicitacoes],
  );

  const novasCount = useMemo(
    () => solicitacoes.filter((s) => s.status === "nova").length,
    [solicitacoes],
  );

  const value = useMemo(
    () => ({
      solicitacoes,
      abertas,
      novasCount,
      hydrated,
      setStatus,
      remove,
    }),
    [solicitacoes, abertas, novasCount, hydrated, setStatus, remove],
  );

  return (
    <SolicitacoesContext.Provider value={value}>
      {children}
    </SolicitacoesContext.Provider>
  );
}

export function useSolicitacoes() {
  const ctx = useContext(SolicitacoesContext);
  if (!ctx) {
    throw new Error("useSolicitacoes must be used within SolicitacoesProvider");
  }
  return ctx;
}
