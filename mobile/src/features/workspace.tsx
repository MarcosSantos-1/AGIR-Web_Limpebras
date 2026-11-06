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
import { cachedSubscription, fieldCache } from "@/lib/cache";
import { hasCoordinates, matchesSub, subOf, type FieldPoint, type SubFilter } from "@/features/format";

const EMPTY_RECORDS: Diagnostic[] = [];
const FILTER_KEY = "agir:campo:sub";
const codeOrder = new Intl.Collator("pt-BR", { numeric: true });

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
  const [recordData, setRecordData] = useState<{ period: string; items: Diagnostic[] } | null>(null);
  const [historyData, setHistoryData] = useState<{ resource: string; items: Diagnostic[] } | null>(null);
  const [fichas, setFichas] = useState<Map<string, PontoFichaDraft>>(new Map());
  const [custom, setCustom] = useState<MapDisplayPoint[]>([]);
  const [pointsReady, setPointsReady] = useState(false);
  const [metaReady, setMetaReady] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [events, setEvents] = useState<VistoriaAutomation["events"]>([]);
  const [location, setLocation] = useState<WorkspaceValue["location"]>(null);
  const [subFilter, setSubFilterState] = useState<SubFilter>("todas");

  const survey = surveys.find((item) => item.status === "em-preenchimento") ?? null;
  const historyResource = `history:${agirApiBase()}:${survey?.sourceId ?? "latest"}`;
  const baseline = historyData?.resource === historyResource ? historyData.items : EMPTY_RECORDS;
  const historyReady = !agirApiBase() || historyData?.resource === historyResource;
  const records = recordData?.period === survey?.period ? recordData?.items ?? EMPTY_RECORDS : EMPTY_RECORDS;
  const recordsReady = !survey || recordData?.period === survey.period;

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
    const offMeta = cachedSubscription(fieldCache, user.uid, "surveys", subscribeLevantamentos,
      (items) => { setSurveys(items); setMetaReady(true); }, (cause) => { setError(cause.message); setMetaReady(true); });
    const offFichas = cachedSubscription<[string, PontoFichaDraft]>(fieldCache, user.uid, "fichas",
      (next, fail) => subscribePontoFichas((items) => next([...items]), fail),
      (items) => setFichas(new Map(items)), () => undefined);
    const offCustom = cachedSubscription<MapDisplayPoint>(fieldCache, user.uid, "custom-points",
      (next, fail) => subscribeCustomPontosViciados((items) => next(items.flatMap((item) => item.point ? [item.point] : [])), fail), (items) => {
      setCustom(items);
      setPointsReady(true);
    }, () => setPointsReady(true));
    const offAgenda = subscribeAgendaEvents((items) => {
      setEvents(items.map((event) => ({ type: event.type, status: event.status, date: event.date, title: event.title, observations: event.observations })));
    }, () => setEvents([]));
    return () => { offMeta(); offFichas(); offCustom(); offAgenda(); };
  }, [user]);

  const period = survey?.period;
  useEffect(() => {
    if (!user || !period) return;
    return cachedSubscription<Diagnostic>(fieldCache, user.uid, `records:${period}`,
      (next, fail) => subscribeDiagnostics(period, next, fail),
      (items) => setRecordData({ period, items }), (cause) => { setError(cause.message); setRecordData((current) => current?.period === period ? current : { period, items: [] }); });
  }, [period, user]);

  useEffect(() => {
    if (!user || !metaReady) return;
    let active = true;
    let hasCached = false;
    const resource = historyResource;
    if (!agirApiBase()) return;
    let receivedLive = false;
    void fieldCache.read<Diagnostic[]>(user.uid, resource).then((cached) => {
      if (active && !receivedLive && Array.isArray(cached)) {
        hasCached = true;
        setHistoryData({ resource, items: cached });
      }
    });
    const load = async () => {
      const source = survey?.sourceId ?? (await historicalRequest()).sources?.at(-1)?.id;
      const data = source ? await historicalRequest(source) : { records: [] };
      if (!active) return;
      receivedLive = true;
      setHistoryData({ resource, items: data.records ?? [] });
      setWarning("");
      void fieldCache.write(user.uid, resource, data.records ?? []);
    };
    void load().catch((cause: unknown) => {
      if (!active) return;
      if (!hasCached) setHistoryData({ resource, items: [] });
      setWarning(cause instanceof Error ? cause.message : "Não foi possível carregar o histórico. Dá para preencher os pontos mesmo assim.");
    });
    return () => { active = false; };
  }, [historyResource, metaReady, survey?.sourceId, user]);

  useEffect(() => {
    if (!user) return;
    let remove: Location.LocationSubscription | null = null;
    let cancelled = false;
    Location.requestForegroundPermissionsAsync().then(async ({ status }) => {
      if (cancelled || status !== "granted") return;
      const last = await Location.getLastKnownPositionAsync({ maxAge: 120_000, requiredAccuracy: 150 });
      if (last && !cancelled) setLocation({ latitude: last.coords.latitude, longitude: last.coords.longitude, accuracy: last.coords.accuracy });
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!cancelled) setLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude, accuracy: current.coords.accuracy });
      if (cancelled) return;
      const subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 30, timeInterval: 10_000 }, (next) => {
        setLocation({ latitude: next.coords.latitude, longitude: next.coords.longitude, accuracy: next.coords.accuracy });
      });
      if (cancelled) subscription.remove(); else remove = subscription;
    }).catch(() => undefined);
    return () => { cancelled = true; remove?.remove(); };
  }, [user]);

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

  const basePoints = useMemo(() => {
    if (!survey) return [];
    const originals = new Map(baseline.map((record) => [record.pointId, record]));
    const byCode = new Map(catalogue.map((point) => [point.id, point]));
    const rows = buildSurveyRows(survey, catalogue, baseline, records, fichas);
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
        distance: null,
      } satisfies FieldPoint;
    });
  }, [baseline, catalogue, fichas, records, survey]);

  const points = useMemo(() => {
    const here: [number, number] | null = location ? [location.latitude, location.longitude] : null;
    return basePoints.map((point): FieldPoint => ({ ...point,
      distance: here && point.position ? distanceMeters(here, point.position) : null,
    })).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity) || codeOrder.compare(a.code, b.code));
  }, [basePoints, location]);

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
