import featuresEco from "@/data/features-ECO.json";
import featuresPv from "@/data/features-PV.json";
import featuresNh from "@/data/features-NH.json";

export type MapaStatus = "ativo" | "inativo" | "resolvido" | "em-andamento" | "recorrente";

export type MapDisplayPoint = {
  id: string;
  type: "ponto-viciado" | "ecoponto";
  position: [number, number];
  title: string;
  address: string;
  status: MapaStatus;
  lastAction: string | null;
  responsible: string | null;
  recurrent: boolean;
  occurrences: number;
  /** Só preenchido em ponto viciado — para o formulário de revitalização. */
  subprefeitura?: string;
  detailLines?: { label: string; value: string }[];
};

export type MapPolygon = {
  id: string;
  type: "nucleo-habitacional";
  positions: [number, number][];
  fillColor: string;
  title: string;
  address: string;
  status: MapaStatus;
  lastAction: string | null;
  responsible: string | null;
  recurrent: boolean;
  occurrences: number;
  detailLines: { label: string; value: string }[];
};

type EcoFeature = {
  id: string;
  name?: string;
  setor?: string;
  address?: string;
  centroid: [number, number] | number[];
  fillColor?: string;
  subprefeitura?: string;
};

type PvFeature = {
  id: string;
  name?: string;
  setor?: string;
  address?: string;
  centroid: [number, number] | number[];
  status?: string;
  date?: string;
  volumetria?: string;
  subprefeitura?: string;
};

type NhFeature = {
  id: string;
  setor?: string;
  name?: string;
  address?: string;
  logradouro?: string;
  coords: [number, number][] | number[][];
  centroid: [number, number] | number[];
  fillColor?: string;
  subprefeitura?: string;
  turno?: string;
  frequencia?: string;
  cronograma?: string;
  service_type?: string;
};

/** Código territorial: sigla-número (ex. CV-150) no PV; nunca o id interno tipo "PV:0". */
const CODIGO_SUB_NUMERO = /^[A-Z]{2,3}-\d+$/i;

function ensureUniqueId(
  base: string,
  seen: Set<string>,
): string {
  let out = base;
  let n = 1;
  while (seen.has(out)) {
    n += 1;
    out = `${base}-${n}`;
  }
  seen.add(out);
  return out;
}

function codigoPontoViciado(f: PvFeature, seen: Set<string>): string {
  const raw = f.setor?.trim();
  if (raw && CODIGO_SUB_NUMERO.test(raw)) {
    return ensureUniqueId(raw, seen);
  }
  if (raw) {
    return ensureUniqueId(raw, seen);
  }
  const idx = f.id.split(":").pop() ?? f.id;
  const sp = f.subprefeitura?.trim();
  const base = sp ? `${sp}-PV${idx}` : `PV-${idx}`;
  return ensureUniqueId(base, seen);
}

function codigoEcoponto(f: EcoFeature, seen: Set<string>): string {
  const s = f.setor?.trim();
  if (s && CODIGO_SUB_NUMERO.test(s)) {
    return ensureUniqueId(s, seen);
  }
  const sp = f.subprefeitura?.trim();
  const idx = f.id.includes(":") ? f.id.split(":").pop() : f.id;
  const base = sp
    ? `${sp}-${idx ?? f.id}`
    : (s ?? f.name?.trim() ?? f.id);
  return ensureUniqueId(base, seen);
}

function codigoNucleo(f: NhFeature, seen: Set<string>): string {
  const raw = f.setor?.trim();
  if (raw) {
    return ensureUniqueId(raw, seen);
  }
  return ensureUniqueId(f.id.replace(/^NH:\d+$/i, "NH") || f.id, seen);
}

function pvToStatus(f: PvFeature): MapaStatus {
  const s = (f.status ?? f.date ?? "").toString().toLowerCase();
  if (s.includes("inativ")) return "inativo";
  if (s.includes("resol")) return "resolvido";
  return "ativo";
}

function buildPoints(): { markers: MapDisplayPoint[]; polygons: MapPolygon[] } {
  const eco = (featuresEco as unknown as { features: EcoFeature[] }).features;
  const pv = (featuresPv as unknown as { features: PvFeature[] }).features;
  const nh = (featuresNh as unknown as { features: NhFeature[] }).features;

  const markerIdSeen = new Set<string>();
  const nhIdSeen = new Set<string>();

  const markers: MapDisplayPoint[] = [
    ...eco.map((f) => {
      const c = f.centroid;
      const position: [number, number] = [
        Number(c[0]),
        Number(c[1]),
      ];
      const address = f.address?.trim() ?? "";
      const codigo = codigoEcoponto(f, markerIdSeen);
      return {
        id: codigo,
        type: "ecoponto" as const,
        position,
        title: f.name ? `Ecoponto — ${f.name}` : codigo,
        address: address || "Endereço não informado",
        status: "ativo" as const,
        lastAction: null,
        responsible: null,
        recurrent: false,
        occurrences: 0,
        detailLines: address ? [{ label: "Endereço", value: address }] : undefined,
      };
    }),
    ...pv.map((f) => {
      const c = f.centroid;
      const position: [number, number] = [
        Number(c[0]),
        Number(c[1]),
      ];
      const st = pvToStatus(f);
      const address = f.address?.trim() ?? "";
      const codigo = codigoPontoViciado(f, markerIdSeen);
      const setorU = f.setor?.trim();
      const sp = f.subprefeitura?.trim();
      return {
        id: codigo,
        type: "ponto-viciado" as const,
        position,
        title: setorU
          ? `Ponto viciado — ${setorU}`
          : f.name
            ? `Ponto viciado — ${f.name}`
            : codigo,
        address: address || "Endereço não informado",
        status: st,
        lastAction: null,
        responsible: null,
        recurrent: false,
        occurrences: 0,
        subprefeitura: sp,
        detailLines: [
          ...(f.volumetria
            ? [{ label: "Volumetria", value: f.volumetria }]
            : []),
          ...(f.status ? [{ label: "Status", value: f.status }] : []),
        ],
      };
    }),
  ];

  const polygons: MapPolygon[] = nh.map((f) => {
    const ring = f.coords as [number, number][];
    const positions: [number, number][] = ring.map(
      (pair) => [Number(pair[0]), Number(pair[1])] as [number, number],
    );
    const address =
      f.address?.trim() ?? f.logradouro?.trim() ?? "Área (NH)";
    const codigo = codigoNucleo(f, nhIdSeen);
    return {
      id: codigo,
      type: "nucleo-habitacional" as const,
      positions,
      fillColor: f.fillColor ?? "#f59e0b",
      title: f.name ? `Núcleo habitacional — ${f.name}` : codigo,
      address,
      status: "ativo",
      lastAction: null,
      responsible: null,
      recurrent: true,
      occurrences: 0,
      detailLines: [
        ...(f.subprefeitura
          ? [{ label: "Subprefeitura", value: f.subprefeitura }]
          : []),
        ...(f.turno ? [{ label: "Turno", value: f.turno }] : []),
        ...(f.frequencia
          ? [{ label: "Frequência", value: f.frequencia }]
          : []),
        ...(f.cronograma
          ? [{ label: "Cronograma", value: f.cronograma }]
          : []),
        ...(f.service_type
          ? [{ label: "Serviço", value: f.service_type }]
          : []),
      ],
    };
  });

  return { markers, polygons };
}

const catalog = buildPoints();

export const MAPA_MARKERS: MapDisplayPoint[] = catalog.markers;
export const MAPA_POLYGONS: MapPolygon[] = catalog.polygons;

/** Pontos viciados com id territorial (ex. CV-001), alinhado ao mapa. */
export const MAPA_PONTOS_VICIO_FORM = MAPA_MARKERS.filter(
  (m): m is MapDisplayPoint & { type: "ponto-viciado" } =>
    m.type === "ponto-viciado",
).map((m) => ({
  id: m.id,
  address: m.address,
  subprefeitura: m.subprefeitura ?? "",
}));

export function getMapaPointById(
  id: string | null,
): MapDisplayPoint | MapPolygon | null {
  if (!id) return null;
  const m = MAPA_MARKERS.find((p) => p.id === id);
  if (m) return m;
  return MAPA_POLYGONS.find((p) => p.id === id) ?? null;
}
