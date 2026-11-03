import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SUBREGIONAIS, type SubregionalId } from "../../../lib/constants/subregionais";
import type { Diagnostic } from "../../../lib/diagnosticos";
import { subscribeAgendaEvents } from "../../../lib/firestore/agenda";
import { subscribeCustomPontosViciados } from "../../../lib/firestore/custom-pontos-viciados";
import { historicalRequest, subscribeDiagnostics } from "../../../lib/firestore/diagnosticos";
import { enrollSurveyPoints, subscribeLevantamentos } from "../../../lib/firestore/levantamentos";
import { subscribePontoFichas } from "../../../lib/firestore/ponto-fichas";
import { surveyOpenDate, surveyProgress, type Levantamento } from "../../../lib/levantamentos";
import { MAPA_MARKERS, type MapDisplayPoint } from "../../../lib/map-features";
import type { PontoFichaDraft } from "../../../lib/ponto-ficha";
import { buildSurveyRows, distanceMeters, recordsForSurvey, surveyPointState } from "../../../lib/survey-workspace";
import type { VistoriaAutomation } from "../../../lib/vistoria-form";
import { useAuth } from "@/features/auth";
import { agirApiBase } from "@/lib/api";
import { hasCoordinates, matchesSub, subOf, type FieldPoint, type SubFilter } from "@/features/format";

const FILTER_KEY = "agir:campo:sub";

type WorkspaceValue = {
  ready: boolean;
  error: string;
  warning: string;
  survey: Levantamento | null;
  progress: { total: number; completed: number; percent: number };
  points: FieldPoint[];
  location: { latitude: number; longitude: number; accuracy: number | null } | null;
  subFilter: SubFilter;
  setSubFilter: (filter: SubFilter) => void;
  automation: VistoriaAutomation;
  counts: Record<SubFilter, number>;
  doneCounts: Record<SubFilter, number>;
};

const emptyCounts = (): Record<SubFilter, number> => ({
  todas: 0,
  "casa-verde": 0,
  "jacana-tremembe": 0,
  "vila-maria-guilherme": 0,
  "santana-tucuruvi": 0,
  outras: 0,
});

const idleWorkspace: WorkspaceValue = {
  ready: false,
  error: "",
  warning: "",
  survey: null,
  progress: { total: 0, completed: 0, percent: 0 },
  points: [],
  location: null,
  subFilter: "todas",
  setSubFilter: () => undefined,
  automation: { openDate: "", events: [] },
  counts: emptyCounts(),
  doneCounts: emptyCounts(),
};

const WorkspaceContext = createContext<WorkspaceValue>(idleWorkspace);

export const SUB_FILTERS: { id: SubFilter; label: string }[] = [
  { id: "todas", label: "Todas" },
  ...SUBREGIONAIS.filter((item) => item.id !== "interno").map((item) => ({ id: item.id as Exclude<SubregionalId, "interno">, label: item.abbrev })),
  { id: "outras", label: "Outras" },
];

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<Levantamento[]>([]);
  const [records, setRecords] = useState<Diagnostic[]>([]);
  const [baseline, setBaseline] = useState<Diagnostic[]>([]);
  const [fichas, setFichas] = useState<Map<string, PontoFichaDraft>>(new Map());
  const [custom, setCustom] = useState<MapDisplayPoint[]>([]);
  const [pointsReady, setPointsReady] = useState(false);
  const [metaReady, setMetaReady] = useState(false);
  const [recordsReady, setRecordsReady] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [events, setEvents] = useState<VistoriaAutomation["events"]>([]);
  const [location, setLocation] = useState<WorkspaceValue["location"]>(null);
  const [subFilter, setSubFilterState] = useState<SubFilter>("todas");

  const survey = surveys.find((item) => item.status === "em-preenchimento") ?? null;

  useEffect(() => {
    AsyncStorage.getItem(FILTER_KEY).then((stored) => {
      if (stored && SUB_FILTERS.some((item) => item.id === stored)) setSubFilterState(stored as SubFilter);
    }).catch(() => undefined);
  }, []);

  function setSubFilter(filter: SubFilter) {
    setSubFilterState(filter);
    AsyncStorage.setItem(FILTER_KEY, filter).catch(() => undefined);
  }

  useEffect(() => {
    if (!user) return;
    const offMeta = subscribeLevantamentos((items) => { setSurveys(items); setMetaReady(true); }, (cause) => setError(cause.message));
    const offFichas = subscribePontoFichas((items) => setFichas(items), () => setFichas(new Map()));
    const offCustom = subscribeCustomPontosViciados((items) => {
      setCustom(items.flatMap((item) => item.point ? [item.point] : []));
      setPointsReady(true);
    }, () => setPointsReady(true));
    const offAgenda = subscribeAgendaEvents((items) => {
      setEvents(items.map((event) => ({ type: event.type, status: event.status, date: event.date, title: event.title, observations: event.observations })));
    }, () => setEvents([]));
    return () => { offMeta(); offFichas(); offCustom(); offAgenda(); };
  }, [user]);

  useEffect(() => {
    if (!user || !survey) return;
    return subscribeDiagnostics(survey.period, (items) => { setRecords(items); setRecordsReady(true); }, (cause) => setError(cause.message));
  }, [survey, user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    if (!agirApiBase()) {
      setWarning("Defina EXPO_PUBLIC_AGIR_API_URL para trazer o histórico da planilha. Os pontos do mapa continuam disponíveis.");
      setBaseline([]);
      setHistoryReady(true);
      return;
    }
    historicalRequest().then(async (manifest) => {
      const source = survey?.sourceId ?? manifest.sources?.at(-1)?.id;
      const data = source ? await historicalRequest(source) : { records: [] };
      if (active) { setBaseline(data.records ?? []); setHistoryReady(true); }
    }).catch((cause: unknown) => {
      if (!active) return;
      setBaseline([]);
      setHistoryReady(true);
      setWarning(cause instanceof Error ? cause.message : "Não foi possível carregar o histórico. Dá para preencher os pontos mesmo assim.");
    });
    return () => { active = false; };
  }, [survey?.sourceId, user]);

  useEffect(() => {
    let remove: Location.LocationSubscription | null = null;
    let cancelled = false;
    Location.requestForegroundPermissionsAsync().then(async ({ status }) => {
      if (cancelled || status !== "granted") return;
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!cancelled) setLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude, accuracy: current.coords.accuracy });
      remove = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 20 }, (next) => {
        setLocation({ latitude: next.coords.latitude, longitude: next.coords.longitude, accuracy: next.coords.accuracy });
      });
    }).catch(() => undefined);
    return () => { cancelled = true; remove?.remove(); };
  }, []);

  const catalogue = useMemo(() => {
    const all = new Map(MAPA_MARKERS.filter((point) => point.type === "ponto-viciado").map((point) => [point.id, point]));
    for (const point of custom) all.set(point.id, point);
    return [...all.values()];
  }, [custom]);

  useEffect(() => {
    if (!survey || survey.status !== "em-preenchimento" || survey.sourceId || !pointsReady) return;
    if (catalogue.every((point) => survey.expectedCodes.includes(point.id))) return;
    enrollSurveyPoints(survey.id, catalogue.map((point) => point.id)).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar os pontos do levantamento.");
    });
  }, [catalogue, pointsReady, survey]);

  const points = useMemo(() => {
    if (!survey) return [];
    const originals = new Map(baseline.map((record) => [record.pointId, record]));
    const byCode = new Map(catalogue.map((point) => [point.id, point]));
    const rows = buildSurveyRows(survey, catalogue, baseline, records, fichas);
    const here = location ? [location.latitude, location.longitude] as [number, number] : null;
    return rows.map((row) => {
      const point = byCode.get(row.pointId);
      const position = hasCoordinates(row) ? [Number(row.answers.latitude), Number(row.answers.longitude)] as [number, number] : point?.position ?? null;
      const regional = subOf(row.answers.subprefeitura || point?.subprefeitura);
      const state = surveyPointState(row, originals.get(row.pointId), point?.status === "inativo");
      return {
        code: row.pointId,
        row,
        state,
        position: position && Number.isFinite(position[0]) && Number.isFinite(position[1]) ? position : null,
        subId: regional.id,
        subLabel: regional.label,
        distance: here && position ? distanceMeters(here, position) : null,
      } satisfies FieldPoint;
    }).sort((a, b) => (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY) || a.code.localeCompare(b.code, "pt-BR", { numeric: true }));
  }, [baseline, catalogue, fichas, location, records, survey]);

  const counts = useMemo(() => {
    const next = emptyCounts();
    for (const point of points) {
      if (point.state === "concluido") continue;
      next.todas += 1;
      next[point.subId] += 1;
    }
    return next;
  }, [points]);

  const doneCounts = useMemo(() => {
    const next = emptyCounts();
    for (const point of points) {
      if (point.state !== "concluido") continue;
      next.todas += 1;
      next[point.subId] += 1;
    }
    return next;
  }, [points]);

  const value = useMemo<WorkspaceValue>(() => ({
    ready: Boolean(user) && metaReady && historyReady && pointsReady && (!survey || recordsReady),
    error,
    warning,
    survey,
    progress: surveyProgress(survey?.expectedCodes ?? [], survey ? recordsForSurvey(survey, records) : []),
    points: points.filter((point) => matchesSub(point, subFilter)),
    location,
    subFilter,
    setSubFilter,
    automation: {
      openDate: survey ? surveyOpenDate(survey) : "",
      events,
    },
    counts,
    doneCounts,
  }), [counts, doneCounts, error, events, historyReady, location, metaReady, points, pointsReady, records, recordsReady, subFilter, survey, user, warning]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
