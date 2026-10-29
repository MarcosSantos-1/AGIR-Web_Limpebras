"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  LayerGroup,
  Marker,
  Polygon,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapPolygon } from "@/lib/map-features";
import { cn } from "@/lib/utils";

export type OperationalMapPoint = {
  id: string;
  type: string;
  position: [number, number];
  recurrent: boolean;
  occurrences: number;
  /** Status do ponto (legado; a cor do pin usa `color` quando definida). */
  status?: "ativo" | "inativo" | "resolvido" | "em-andamento" | "recorrente";
  /** Cor do pin já calculada (faixa de ponto viciado). */
  color?: string;
};

const typeHex: Record<string, string> = {
  "ponto-viciado": "#ef4444",
  ecoponto: "#6b7280",
  "nucleo-habitacional": "#f59e0b",
  "servico-acao-ambiental": "#059669",
  "servico-evento": "#7c3aed",
  "servico-panfletagem": "#2563eb",
};

const pvStatusHex: Record<string, string> = {
  ativo: "#ef4444",
  inativo: "#71717a",
  resolvido: "#059669",
  "em-andamento": "#f59e0b",
  recorrente: "#ef4444",
};

/** Font Awesome 6 (solid), branco — requer `@fortawesome/fontawesome-free/css/all.min.css` no layout. */
function faGlyphInner(iconClass: string, fontPx: number) {
  return `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">
  <i class="${iconClass}" style="color:#ffffff;font-size:${fontPx}px;line-height:1" aria-hidden="true"></i>
</div>`;
}

const mapTypeToFaClass: Record<string, string> = {
  ecoponto: "fa-solid fa-recycle",
  "ponto-viciado": "fa-solid fa-trash-can",
  "nucleo-habitacional": "fa-solid fa-house-chimney",
  "servico-acao-ambiental": "fa-solid fa-leaf",
  "servico-evento": "fa-solid fa-calendar-days",
  "servico-panfletagem": "fa-solid fa-bullhorn",
};

function makeDivIcon(
  type: string,
  selected: boolean,
  recurrent: boolean,
  occurrences: number,
  status?: OperationalMapPoint["status"],
  color?: string,
  pulse?: boolean,
) {
  const fill =
    color ??
    (type === "ponto-viciado" && status
      ? (pvStatusHex[status] ?? typeHex[type])
      : (typeHex[type] ?? "#71717a"));
  const size = selected ? 44 : 40;
  const border = "4px solid #ffffff";
  const shadow = "0 10px 15px -3px rgba(0,0,0,0.2)";
  const scale = pulse ? "scale(1.12)" : selected ? "scale(1.08)" : "scale(1)";
  const faClass = mapTypeToFaClass[type];
  const fontPx = Math.round(size * 0.4);
  const innerGlyph = faClass ? faGlyphInner(faClass, fontPx) : "";

  const badge =
    type !== "ponto-viciado" && recurrent && occurrences > 0
      ? `<span style="position:absolute;right:-4px;top:-4px;min-width:1.25rem;height:1.25rem;padding:0 4px;border-radius:9999px;background:#ef4444;color:#fff;font-size:10px;font-weight:700;font-family:system-ui;line-height:1.25rem;text-align:center;border:2px solid #fff">${
          occurrences > 9 ? "9+" : occurrences
        }</span>`
      : "";

  return L.divIcon({
    className: "agir-map-marker",
    html: `<div class="${pulse ? "agir-pin-pulse" : ""}" style="position:relative;width:${size}px;height:${size}px;transform:translate(-50%,-50%) ${scale}">
      <div style="position:relative;width:100%;height:100%">
        <div style="width:100%;height:100%;border-radius:9999px;background:${fill};border:${border};box-shadow:${shadow}"></div>
        ${innerGlyph}
      </div>
      ${badge}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const esriAttribution =
  "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";
const osmAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export type MapBaseLayer = "osm" | "satellite";

export type OperationalMapFlyTo = {
  lat: number;
  lng: number;
  zoom?: number;
  /** Muda a cada pesquisa para repetir o mesmo sítio. */
  nonce: number;
};

type OperationalMapProps = {
  points: OperationalMapPoint[];
  polygons: MapPolygon[];
  selectedId: string | null;
  onSelectId: (id: string) => void;
  /** Pin que pulsa depois de uma busca (ex.: ponto viciado escolhido). */
  pulseId?: string | null;
  /** Padrão: OpenStreetMap. */
  baseLayer?: MapBaseLayer;
  /** Centro animado (ex.: resultado de geocoding). */
  flyTo?: OperationalMapFlyTo | null;
  /** Marcador do último endereço pesquisado (geocoding). */
  searchResultMarker?: { lat: number; lng: number } | null;
  /** Modo de clique no mapa para escolher coordenadas (ex.: novo ponto). */
  placementMode?: boolean;
  onPlacementClick?: (lat: number, lng: number) => void;
};

/** Pin de pesquisa (destaque em roxo — não confundir com pontos operacionais). */
function makeSearchGeocodeIcon() {
  const w = 36;
  const h = 44;
  return L.divIcon({
    className: "agir-map-search-geocode",
    html: `<div style="width:${w}px;height:${h}px;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.25))">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34" width="${w}" height="${h}" aria-hidden="true">
        <path fill="#f318e3" stroke="#fff" stroke-width="1.5" d="M12 0C7.03 0 3 3.94 3 8.8c0 6.65 9 17.65 9 17.65s9-11 9-17.65C21 3.94 16.97 0 12 0z"/>
        <circle cx="12" cy="9" r="3.25" fill="#fff"/>
      </svg>
    </div>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
  });
}

function MapPlacementClickHandler({
  active,
  onPick,
}: {
  active: boolean;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (!active) return;
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Santana / Tucuruvi. O enquadramento automático puxava pontos fora de São Paulo. */
const ZONA_NORTE_CENTER: [number, number] = [-23.495, -46.628];
const ZONA_NORTE_ZOOM = 12;

function FlyToSearchResult({
  target,
}: {
  target: OperationalMapFlyTo | null | undefined;
}) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], target.zoom ?? 16, { duration: 0.85 });
  }, [map, target?.nonce, target?.lat, target?.lng, target?.zoom]);

  return null;
}

export function OperationalMap({
  points,
  polygons,
  selectedId,
  onSelectId,
  pulseId = null,
  baseLayer = "osm",
  flyTo = null,
  searchResultMarker = null,
  placementMode = false,
  onPlacementClick,
}: OperationalMapProps) {
  return (
    <MapContainer
      center={ZONA_NORTE_CENTER}
      zoom={ZONA_NORTE_ZOOM}
      className={cn(
        "z-0 h-full w-full",
        placementMode && "cursor-crosshair",
      )}
      scrollWheelZoom
      zoomControl={false}
    >
      <FlyToSearchResult target={flyTo} />
      <MapPlacementClickHandler
        active={placementMode && !!onPlacementClick}
        onPick={(lat, lng) => onPlacementClick?.(lat, lng)}
      />
      {baseLayer === "satellite" ? (
        <LayerGroup>
          <TileLayer
            attribution={esriAttribution}
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={20}
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
            opacity={1}
            maxZoom={20}
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            opacity={1}
            maxZoom={20}
          />
        </LayerGroup>
      ) : (
        <TileLayer
          attribution={osmAttribution}
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={20}
          maxNativeZoom={19}
        />
      )}

      {polygons.map((poly) => {
        const isSel = selectedId === poly.id;
        return (
          <Polygon
            key={poly.id}
            positions={poly.positions}
            pathOptions={{
              color: isSel ? "#b45309" : poly.fillColor,
              weight: isSel ? 3 : 2,
              fillColor: poly.fillColor,
              fillOpacity: isSel ? 0.4 : 0.22,
              interactive: !placementMode,
            }}
            eventHandlers={{
              click: () => onSelectId(poly.id),
            }}
          />
        );
      })}

      {points.map((p) => (
        <Marker
          key={`${p.id}-${selectedId === p.id ? "1" : "0"}-${pulseId === p.id ? "p" : "0"}-${p.color ?? p.status ?? ""}`}
          position={p.position}
          icon={makeDivIcon(
            p.type,
            selectedId === p.id,
            p.recurrent,
            p.occurrences,
            p.status,
            p.color,
            pulseId === p.id,
          )}
          eventHandlers={{
            click: () => onSelectId(p.id),
          }}
          zIndexOffset={pulseId === p.id ? 2000 : selectedId === p.id ? 1000 : 0}
          interactive={!placementMode}
        />
      ))}

      {searchResultMarker ? (
        <Marker
          key="geocode-search-pin"
          position={[searchResultMarker.lat, searchResultMarker.lng]}
          icon={makeSearchGeocodeIcon()}
          zIndexOffset={2500}
          interactive={false}
        />
      ) : null}
    </MapContainer>
  );
}
