/** Centro inicial do mapa (São Paulo). Sobrescreva com NEXT_PUBLIC_MAP_DEFAULT_LAT / LNG / ZOOM. */
const lat = parseFloat(process.env.NEXT_PUBLIC_MAP_DEFAULT_LAT ?? "-23.5505");
const lng = parseFloat(process.env.NEXT_PUBLIC_MAP_DEFAULT_LNG ?? "-46.6333");
const zoom = parseInt(process.env.NEXT_PUBLIC_MAP_DEFAULT_ZOOM ?? "12", 10);

export const defaultMapView = {
  center: [Number.isFinite(lat) ? lat : -23.5505, Number.isFinite(lng) ? lng : -46.6333] as [
    number,
    number,
  ],
  zoom: Number.isFinite(zoom) ? zoom : 12,
};
