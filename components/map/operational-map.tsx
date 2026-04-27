"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  LayerGroup,
  Marker,
  Polygon,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { defaultMapView } from "@/lib/constants/map";
import type { MapPolygon } from "@/lib/map-features";

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

  const badge =
    recurrent && occurrences > 0
      ? `<span style="position:absolute;right:-4px;top:-4px;min-width:1.25rem;height:1.25rem;padding:0 4px;border-radius:9999px;background:#ef4444;color:#fff;font-size:10px;font-weight:700;font-family:system-ui;line-height:1.25rem;text-align:center;border:2px solid #fff">${
          occurrences > 9 ? "9+" : occurrences
        }</span>`
      : "";

  return L.divIcon({
    className: "agir-map-marker",
    html: `<div style="position:relative;width:${size}px;height:${size}px;transform:translate(-50%,-50%) ${scale}">
      <div style="width:100%;height:100%;border-radius:9999px;background:${fill};border:${border};box-shadow:${shadow}"></div>
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

type OperationalMapProps = {
  points: OperationalMapPoint[];
  polygons: MapPolygon[];
  selectedId: string | null;
  onSelectId: (id: string) => void;
  /** Padrão: CartoDB Positron. */
  baseLayer?: BaseLayer;
};

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

export function OperationalMap({
  points,
  polygons,
  selectedId,
  onSelectId,
  baseLayer = "carto",
}: OperationalMapProps) {
  return (
    <MapContainer
      center={defaultMapView.center}
      zoom={defaultMapView.zoom}
      className="z-0 h-full min-h-[520px] w-full"
      style={{ minHeight: 520 }}
      scrollWheelZoom
    >
      <FitBoundsToData points={points} polygons={polygons} />
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
        />
      ))}
    </MapContainer>
  );
}
