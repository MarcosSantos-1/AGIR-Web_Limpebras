import { Suspense } from "react";
import { SolicitacoesPageClient } from "./solicitacoes-page-client";

export default function SolicitacoesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center font-medium text-zinc-500">
          Carregando solicitações…
        </div>
      }
    >
      <SolicitacoesPageClient />
    </Suspense>
  );
}
