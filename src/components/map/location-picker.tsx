import { MapContainer, TileLayer, CircleMarker, useMapEvents, useMap } from "react-leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";

function ClickCatcher({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

function Recentre({ point }: { point: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView(point, Math.max(map.getZoom(), 15));
  }, [point, map]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

/**
 * Drop-a-pin location picker. Click anywhere on the street map to place the
 * marker — used as a third way to set a complaint location alongside GPS and
 * typing an address.
 */
export default function LocationPicker({
  value,
  centre,
  onPick,
}: {
  value: { lat: number; lng: number } | null;
  centre: [number, number];
  onPick: (lat: number, lng: number) => void;
}) {
  const point: [number, number] | null = value ? [value.lat, value.lng] : null;

  return (
    <MapContainer
      center={point ?? centre}
      zoom={point ? 15 : 12}
      scrollWheelZoom
      className="h-[320px] w-full rounded-xl"
      style={{ background: "#eef2f0" }}
    >
      <InvalidateSize />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ClickCatcher onPick={onPick} />
      <Recentre point={point} />
      {point && (
        <CircleMarker
          center={point}
          radius={11}
          pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#dc2626", fillOpacity: 0.95 }}
        />
      )}
    </MapContainer>
  );
}
