import { Suspense } from "react";
import { AgendaPageClient } from "./agenda-page-client";

export default function AgendaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center font-medium text-zinc-500">
          Carregando agenda…
        </div>
      }
    >
      <AgendaPageClient />
    </Suspense>
  );
}
