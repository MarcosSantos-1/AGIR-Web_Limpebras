import { Suspense } from "react";
import { RedesSociaisContent } from "./redes-sociais-content";

export default function RedesSociaisPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 pl-72 pt-8 pr-8">
          <p className="text-sm text-zinc-500">Carregando…</p>
        </div>
      }
    >
      <RedesSociaisContent />
    </Suspense>
  );
}
