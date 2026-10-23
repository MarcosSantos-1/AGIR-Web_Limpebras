import { Suspense } from "react";
import { SurveyMapScreen } from "@/components/diagnosticos/survey-map-screen";

export default function DiagnosticMapPage() {
  return <Suspense fallback={<p className="p-8 text-center">Carregando mapa…</p>}><SurveyMapScreen /></Suspense>;
}
