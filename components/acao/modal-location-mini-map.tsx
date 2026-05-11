"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { defaultMapView } from "@/lib/constants/map";
import { cn } from "@/lib/utils";

export type ModalLocationMiniMapFlyTo = {
  lat: number;
  lng: number;
  zoom?: number;
  nonce: number;
};

function FlyToTarget({
  target,
}: {
  target: ModalLocationMiniMapFlyTo | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], target.zoom ?? 16, { duration: 0.65 });
  }, [map, target?.nonce, target?.lat, target?.lng, target?.zoom]);
  return null;
}

function MapClickPickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function modalPinIcon() {
  const w = 36;
  const h = 44;
  return L.divIcon({
    className: "agir-modal-loc-pin",
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

const cartoAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

type ModalLocationMiniMapProps = {
  className?: string;
  marker: { lat: number; lng: number } | null;
  flyTo: ModalLocationMiniMapFlyTo | null;
  onMapClick: (lat: number, lng: number) => void;
};

export function ModalLocationMiniMap({
  className,
  marker,
  flyTo,
  onMapClick,
}: ModalLocationMiniMapProps) {
  return (
    <MapContainer
      center={defaultMapView.center}
      zoom={defaultMapView.zoom}
      className={cn(
        "z-0 min-h-[220px] w-full rounded-2xl border border-zinc-200",
        className,
      )}
      style={{ minHeight: 220, height: "min(28vh, 260px)" }}
      scrollWheelZoom
      zoomControl
    >
      <FlyToTarget target={flyTo} />
      <TileLayer
        attribution={cartoAttribution}
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      <MapClickPickHandler onPick={onMapClick} />
      {marker ? (
        <Marker
          key={`${marker.lat.toFixed(6)}-${marker.lng.toFixed(6)}`}
          position={[marker.lat, marker.lng]}
          icon={modalPinIcon()}
        />
      ) : null}
    </MapContainer>
  );
}
