"use client";

import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { defaultMapView } from "@/lib/constants/map";
import { SURVEY_COLORS } from "@/lib/survey-workspace";

export type SurveyMapMarker = { id: string; position: [number, number]; state: keyof typeof SURVEY_COLORS };
export type SurveyLocation = { lat: number; lng: number; accuracy: number };

function PositionMap({ target }: { target: { lat: number; lng: number; nonce: number } | null }) {
  const map = useMap();
  useEffect(() => { if (target) map.flyTo([target.lat, target.lng], 16, { duration: 0.6 }); }, [map, target]);
  useEffect(() => { const observer = new ResizeObserver(() => map.invalidateSize()); observer.observe(map.getContainer()); return () => observer.disconnect(); }, [map]);
  return null;
}

export default function SurveyLeafletMap({ markers, selected, location, target, radius, onSelect }: {
  markers: SurveyMapMarker[]; selected: string | null; location: SurveyLocation | null;
  target: { lat: number; lng: number; nonce: number } | null; radius: number;
  onSelect: (id: string) => void;
}) {
  return <MapContainer className="z-0 h-full w-full" center={defaultMapView.center} zoom={13} zoomControl={false}>
    <TileLayer attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'} url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
    <PositionMap target={target} />
    {markers.map((marker) => <CircleMarker key={marker.id} center={marker.position} radius={selected === marker.id ? 12 : 8} pathOptions={{ color: "#fff", weight: selected === marker.id ? 4 : 2, fillColor: SURVEY_COLORS[marker.state], fillOpacity: 1 }} eventHandlers={{ click: () => onSelect(marker.id) }}><Tooltip direction="top">{marker.id} · {marker.state === "concluido" ? "Concluído" : marker.state === "inativo" ? "Inativo / a verificar" : "Pendente"}</Tooltip></CircleMarker>)}
    {location && <>
      {radius > 0 && <Circle center={[location.lat, location.lng]} radius={radius} pathOptions={{ color: "#2563eb", weight: 1, fillOpacity: 0.035, dashArray: "5 6" }} />}
      <Circle center={[location.lat, location.lng]} radius={location.accuracy} pathOptions={{ color: "#3b82f6", weight: 1, fillOpacity: 0.1 }} />
      <CircleMarker center={[location.lat, location.lng]} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }} eventHandlers={{ add: (e) => { (e.target as L.CircleMarker).bringToFront(); } }}><Tooltip>Você está aqui · precisão {Math.round(location.accuracy)} m</Tooltip></CircleMarker>
    </>}
  </MapContainer>;
}
