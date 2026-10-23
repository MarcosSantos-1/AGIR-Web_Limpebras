"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useCustomPontosViciados } from "@/contexts/custom-pontos-viciados-context";
import { MAPA_MARKERS } from "@/lib/map-features";
import { historicalRequest, subscribeDiagnostics } from "@/lib/firestore/diagnosticos";
import { enrollSurveyPoints, subscribeLevantamentos } from "@/lib/firestore/levantamentos";
import { localToday, periodForDate, type Diagnostic } from "@/lib/diagnosticos";
import type { Levantamento } from "@/lib/levantamentos";
import { buildSurveyRows, recordsForSurvey } from "@/lib/survey-workspace";

export function useSurveyWorkspace(surveyId?: string | null) {
  const { user } = useAuth();
  const { customPontosViciados, hydrated: pointsReady } = useCustomPontosViciados();
  const [surveys, setSurveys] = useState<Levantamento[]>([]);
  const [records, setRecords] = useState<Diagnostic[]>([]);
  const [baseline, setBaseline] = useState<Diagnostic[]>([]);
  const [ready, setReady] = useState({ meta: false, records: false, history: false });
  const [error, setError] = useState("");
  const [loadedPeriod, setLoadedPeriod] = useState("");
  const points = useMemo(() => {
    const all = new Map(MAPA_MARKERS.filter((p) => p.type === "ponto-viciado").map((p) => [p.id, p]));
    for (const point of customPontosViciados) all.set(point.id, point);
    return [...all.values()];
  }, [customPontosViciados]);
  const survey = surveys.find((s) => surveyId ? s.id === surveyId : s.status === "em-preenchimento") ?? null;
  const period = survey?.period ?? periodForDate(localToday());

  useEffect(() => {
    if (!user) return;
    const offMeta = subscribeLevantamentos((items) => { setSurveys(items); setReady((r) => ({ ...r, meta: true })); }, (e) => setError(e.message));
    return offMeta;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeDiagnostics(period, (items) => { setRecords(items); setLoadedPeriod(period); setReady((r) => ({ ...r, records: true })); }, (e) => setError(e.message));
  }, [period, user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    historicalRequest().then(async (manifest) => {
      const source = survey?.sourceId ?? manifest.sources.at(-1)?.id;
      const data = source ? await historicalRequest(source) : { records: [] };
      if (active) { setBaseline(data.records); setReady((r) => ({ ...r, history: true })); }
    }).catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [user, survey?.sourceId]);

  useEffect(() => {
    if (!survey || survey.status !== "em-preenchimento" || survey.sourceId || !pointsReady) return;
    if (points.every((p) => survey.expectedCodes.includes(p.id))) return;
    enrollSurveyPoints(survey.id, points.map((p) => p.id)).catch((e) => setError(e.message));
  }, [survey, points, pointsReady]);

  const rows = useMemo(() => survey ? buildSurveyRows(survey, points, baseline, records) : [], [survey, points, baseline, records]);
  const historyMatches = !survey?.sourceId || baseline.every((record) => record.sourceId === survey.sourceId);
  return { survey, surveys, rows, points, baseline, records: survey ? recordsForSurvey(survey, records) : [], ready: ready.meta && ready.records && loadedPeriod === period && ready.history && historyMatches && pointsReady, error };
}
