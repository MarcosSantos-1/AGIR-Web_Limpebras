import { Suspense } from "react";
import { SurveyMapScreen } from "@/components/diagnosticos/survey-map-screen";

export default function DiagnosticFieldPage() {
  return <Suspense fallback={<p className="p-8 text-center">Carregando mapa de campo…</p>}><SurveyMapScreen mobile /></Suspense>;
}
