"use client";

import {
  MapContainer,
  TileLayer,
  LayerGroup,
  LayersControl,
  Marker,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { defaultMapView } from "@/lib/constants/map";

export type OperationalMapPoint = {
  id: number;
  type: string;
  position: [number, number];
  recurrent: boolean;
  occurrences: number;
};

const typeHex: Record<string, string> = {
  "ponto-viciado": "#ef4444",
  ecoponto: "#10b981",
  ubs: "#3b82f6",
  escola: "#8b5cf6",
  "area-critica": "#f59e0b",
  revitalizacao: "#22c55e",
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

type OperationalMapProps = {
  points: OperationalMapPoint[];
  selectedId: number | null;
  onSelectPoint: (id: number) => void;
};

export function OperationalMap({
  points,
  selectedId,
  onSelectPoint,
}: OperationalMapProps) {
  return (
    <MapContainer
      center={defaultMapView.center}
      zoom={defaultMapView.zoom}
      className="z-0 h-full min-h-[520px] w-full"
      style={{ minHeight: 520 }}
      scrollWheelZoom
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer name="CartoDB Positron" checked>
          <TileLayer
            attribution={cartoAttribution}
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satélite Esri (vias e rótulos)">
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
        </LayersControl.BaseLayer>
      </LayersControl>

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
            click: () => onSelectPoint(p.id),
          }}
          zIndexOffset={selectedId === p.id ? 1000 : 0}
        />
      ))}
    </MapContainer>
  );
}
