import { SUBREGIONAIS } from "@/lib/constants/subregionais";

export const SUBREGIONAL_MAP_COLORS = {
  CV: "#84cc16",
  JT: "#1e3a8a",
  ST: "#facc15",
  MG: "#06b6d4",
} as const;

export type SubregionalSigla = keyof typeof SUBREGIONAL_MAP_COLORS;

type Coordinate = [lng: number, lat: number];

export type SubregionaisGeoJson = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    properties: { sg_subprefeitura: SubregionalSigla };
    geometry: { type: "Polygon"; coordinates: Coordinate[][] };
  }[];
};

export const SUBREGIONAIS_MAPA = SUBREGIONAIS.filter(
  (sub) => sub.abbrev !== "INT",
);

export const MSG_FORA_DO_LOTE = "Escolha uma localização dentro de uma subregional do Lote III.";

function classifyRing(ring: Coordinate[], lat: number, lng: number) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[j];
    const [x2, y2] = ring[i];
    if (
      lng >= Math.min(x1, x2) && lng <= Math.max(x1, x2) &&
      lat >= Math.min(y1, y2) && lat <= Math.max(y1, y2) &&
      Math.abs((lng - x1) * (y2 - y1) - (lat - y1) * (x2 - x1)) < 1e-14
    ) return "boundary";

    if ((y1 > lat) !== (y2 > lat) && lng < x1 + ((x2 - x1) * (lat - y1)) / (y2 - y1)) {
      inside = !inside;
    }
  }
  return inside ? "inside" : "outside";
}

export function subregionalFromCoordinates(data: SubregionaisGeoJson, lat: number, lng: number) {
  // A ordem das siglas resolve pontos na divisa de forma estável.
  return SUBREGIONAIS_MAPA.find((sub) => {
    const polygon = data.features.find((feature) => feature.properties.sg_subprefeitura === sub.abbrev);
    if (!polygon) return false;
    const [exterior, ...holes] = polygon.geometry.coordinates;
    return classifyRing(exterior, lat, lng) !== "outside" &&
      !holes.some((hole) => classifyRing(hole, lat, lng) === "inside");
  });
}
