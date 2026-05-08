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
import { defaultMapView } from "@/lib/constants/map";
import type { MapPolygon } from "@/lib/map-features";
import { cn } from "@/lib/utils";

export type OperationalMapPoint = {
  id: string;
  type: string;
  position: [number, number];
  recurrent: boolean;
  occurrences: number;
};

const typeHex: Record<string, string> = {
  "ponto-viciado": "#ef4444",
  ecoponto: "#10b981",
  "nucleo-habitacional": "#f59e0b",
};

/** Ícone reciclagem (branco) centrado no círculo — só ecoponto. */
const ECOPONTO_RECYCLE_SVG = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width:56%;height:56%" fill="#ffffff" aria-hidden="true"><path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5 0 1.64-.8 3.08-2.03 4l1.42 1.44C18.36 16.55 19 14.84 19 13c0-3.87-3.13-7-7-7zm-7.39 9.01L3.37 16.64A9 9 0 0 1 12 5c1.84 0 3.55.55 4.99 1.5L15.5 7.11C14.27 6.22 12.7 5.7 11 5.7c-2.76 0-5.05 2.05-5.39 4.72L4.73 9.27 3.37 10.73zM12 21c-1.84 0-3.55-.55-4.99-1.5l1.5-1.61C9.74 18.78 11.31 19.3 13 19.3c2.76 0 5.05-2.05 5.39-4.72l1.89 1.15 1.35-1.46A9 9 0 0 1 12 21z"/></svg></div>`;

function makeDivIcon(
  type: string,
  selected: boolean,
  recurrent: boolean,
  occurrences: number
) {
  const fill = typeHex[type] ?? "#71717a";
  const size = selected ? 44 : 40;
  const border = "4px solid #ffffff";
  const shadow = "0 10px 15px -3px rgba(0,0,0,0.2)";
  const scale = selected ? "scale(1.08)" : "scale(1)";
  const innerGlyph = type === "ecoponto" ? ECOPONTO_RECYCLE_SVG : "";

  const badge =
    recurrent && occurrences > 0
      ? `<span style="position:absolute;right:-4px;top:-4px;min-width:1.25rem;height:1.25rem;padding:0 4px;border-radius:9999px;background:#ef4444;color:#fff;font-size:10px;font-weight:700;font-family:system-ui;line-height:1.25rem;text-align:center;border:2px solid #fff">${
          occurrences > 9 ? "9+" : occurrences
        }</span>`
      : "";

  return L.divIcon({
    className: "agir-map-marker",
    html: `<div style="position:relative;width:${size}px;height:${size}px;transform:translate(-50%,-50%) ${scale}">
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

const cartoAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const esriAttribution =
  "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";

type BaseLayer = "carto" | "satellite";

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
  /** Padrão: CartoDB Positron. */
  baseLayer?: BaseLayer;
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

function FitBoundsToData({
  points,
  polygons,
}: {
  points: OperationalMapPoint[];
  polygons: MapPolygon[];
}) {
  const map = useMap();

  useEffect(() => {
    const b = L.latLngBounds([]);
    for (const p of points) {
      b.extend(p.position);
    }
    for (const poly of polygons) {
      for (const pos of poly.positions) {
        b.extend(pos);
      }
    }
    if (b.isValid()) {
      map.fitBounds(b, { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, points, polygons]);

  return null;
}

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
  baseLayer = "carto",
  flyTo = null,
  searchResultMarker = null,
  placementMode = false,
  onPlacementClick,
}: OperationalMapProps) {
  return (
    <MapContainer
      center={defaultMapView.center}
      zoom={defaultMapView.zoom}
      className={cn(
        "z-0 h-full min-h-[520px] w-full",
        placementMode && "cursor-crosshair",
      )}
      style={{ minHeight: 520 }}
      scrollWheelZoom
      zoomControl={false}
    >
      <FitBoundsToData points={points} polygons={polygons} />
      <FlyToSearchResult target={flyTo} />
      <MapPlacementClickHandler
        active={placementMode && !!onPlacementClick}
        onPick={(lat, lng) => onPlacementClick?.(lat, lng)}
      />
      {baseLayer === "carto" ? (
        <TileLayer
          attribution={cartoAttribution}
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />
      ) : (
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
          key={`${p.id}-${selectedId === p.id ? "1" : "0"}`}
          position={p.position}
          icon={makeDivIcon(
            p.type,
            selectedId === p.id,
            p.recurrent,
            p.occurrences
          )}
          eventHandlers={{
            click: () => onSelectId(p.id),
          }}
          zIndexOffset={selectedId === p.id ? 1000 : 0}
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
